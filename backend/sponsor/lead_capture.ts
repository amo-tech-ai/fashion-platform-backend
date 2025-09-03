import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";
import type { SponsorLead, SponsorCompany, LeadActivity } from "./types";

export interface CreateSponsorLeadRequest {
  // Company information
  companyName: string;
  industry: string;
  website?: string;
  companySize?: "startup" | "small" | "medium" | "large" | "enterprise";
  annualRevenue?: number;
  headquartersLocation?: string;
  companyDescription?: string;
  
  // Contact information
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  jobTitle?: string;
  
  // Sponsorship details
  budgetRange?: "under_5k" | "5k_15k" | "15k_50k" | "50k_100k" | "over_100k";
  objectives?: string[];
  preferredEvents?: string[];
  timeline?: "immediate" | "next_month" | "next_quarter" | "next_year";
  leadSource?: string;
  additionalNotes?: string;
}

export interface SponsorLeadResponse extends SponsorLead {
  company?: SponsorCompany;
  recommendedPackages?: Array<{
    packageId: number;
    packageName: string;
    tier: string;
    price: number;
    matchScore: number;
    benefits: string[];
  }>;
}

// Create a new sponsor lead with automatic scoring and package recommendations
export const createLead = api<CreateSponsorLeadRequest, SponsorLeadResponse>(
  { method: "POST", path: "/sponsor/leads", expose: true },
  async (req) => {
    await using tx = await db.begin();

    try {
      // Create or find company
      let company = await tx.queryRow`
        SELECT * FROM sponsor_companies 
        WHERE LOWER(name) = LOWER(${req.companyName})
      `;

      if (!company) {
        company = await tx.queryRow`
          INSERT INTO sponsor_companies (
            name, industry, website, company_size, annual_revenue, 
            headquarters_location, description
          )
          VALUES (
            ${req.companyName}, ${req.industry}, ${req.website}, 
            ${req.companySize}, ${req.annualRevenue}, 
            ${req.headquartersLocation}, ${req.companyDescription}
          )
          RETURNING *
        `;
      }

      if (!company) {
        throw APIError.internal("Failed to create company");
      }

      // Calculate lead score
      const leadScore = calculateLeadScore({
        budgetRange: req.budgetRange,
        timeline: req.timeline,
        companySize: req.companySize,
        industry: req.industry,
        hasWebsite: !!req.website,
        hasPhone: !!req.contactPhone,
        objectiveCount: req.objectives?.length || 0,
      });

      // Create lead
      const lead = await tx.queryRow`
        INSERT INTO sponsor_leads (
          company_id, contact_name, contact_email, contact_phone, job_title,
          budget_range, objectives, preferred_events, timeline, lead_source,
          lead_score, status, notes
        )
        VALUES (
          ${company.id}, ${req.contactName}, ${req.contactEmail}, ${req.contactPhone}, 
          ${req.jobTitle}, ${req.budgetRange}, ${req.objectives}, ${req.preferredEvents},
          ${req.timeline}, ${req.leadSource}, ${leadScore}, 'new', ${req.additionalNotes}
        )
        RETURNING *
      `;

      if (!lead) {
        throw APIError.internal("Failed to create lead");
      }

      // Log initial activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${lead.id}, 'lead_created', 'New sponsor lead created from ${req.leadSource || 'website'}', 'system')
      `;

      // Auto-assign based on lead score and criteria
      const assignedTo = await autoAssignLead(lead, tx);
      if (assignedTo) {
        await tx.exec`
          UPDATE sponsor_leads 
          SET assigned_to = ${assignedTo}, updated_at = NOW()
          WHERE id = ${lead.id}
        `;
        
        await tx.exec`
          INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
          VALUES (${lead.id}, 'lead_assigned', 'Lead auto-assigned to ${assignedTo}', 'system')
        `;
      }

      await tx.commit();

      // Send immediate response email
      await notification.sendSponsorLeadConfirmation({
        contactEmail: req.contactEmail,
        contactName: req.contactName,
        companyName: req.companyName,
        leadScore,
      });

      // Get recommended packages
      const recommendedPackages = await getRecommendedPackages({
        budgetRange: req.budgetRange,
        objectives: req.objectives,
        companySize: req.companySize,
        industry: req.industry,
      });

      // Send package recommendations within 5 minutes
      setTimeout(async () => {
        await notification.sendPackageRecommendations({
          contactEmail: req.contactEmail,
          contactName: req.contactName,
          packages: recommendedPackages,
          leadId: lead.id,
        });
      }, 5 * 60 * 1000); // 5 minutes

      return {
        id: lead.id,
        companyId: lead.company_id,
        contactName: lead.contact_name,
        contactEmail: lead.contact_email,
        contactPhone: lead.contact_phone,
        jobTitle: lead.job_title,
        budgetRange: lead.budget_range as any,
        objectives: lead.objectives,
        preferredEvents: lead.preferred_events,
        timeline: lead.timeline as any,
        leadSource: lead.lead_source,
        status: lead.status as any,
        leadScore: lead.lead_score,
        assignedTo: assignedTo || lead.assigned_to,
        notes: lead.notes,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry,
          website: company.website,
          companySize: company.company_size as any,
          annualRevenue: company.annual_revenue,
          headquartersLocation: company.headquarters_location,
          description: company.description,
          logoUrl: company.logo_url,
          createdAt: company.created_at,
          updatedAt: company.updated_at,
        },
        recommendedPackages,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

function calculateLeadScore(criteria: {
  budgetRange?: string;
  timeline?: string;
  companySize?: string;
  industry: string;
  hasWebsite: boolean;
  hasPhone: boolean;
  objectiveCount: number;
}): number {
  let score = 0;

  // Budget range scoring (40% of total score)
  switch (criteria.budgetRange) {
    case 'over_100k': score += 40; break;
    case '50k_100k': score += 35; break;
    case '15k_50k': score += 25; break;
    case '5k_15k': score += 15; break;
    case 'under_5k': score += 5; break;
  }

  // Timeline scoring (25% of total score)
  switch (criteria.timeline) {
    case 'immediate': score += 25; break;
    case 'next_month': score += 20; break;
    case 'next_quarter': score += 15; break;
    case 'next_year': score += 5; break;
  }

  // Company size scoring (20% of total score)
  switch (criteria.companySize) {
    case 'enterprise': score += 20; break;
    case 'large': score += 16; break;
    case 'medium': score += 12; break;
    case 'small': score += 8; break;
    case 'startup': score += 4; break;
  }

  // Industry fit scoring (10% of total score)
  const highValueIndustries = ['fashion', 'luxury', 'beauty', 'retail', 'technology'];
  if (highValueIndustries.includes(criteria.industry.toLowerCase())) {
    score += 10;
  } else {
    score += 5;
  }

  // Completeness scoring (5% of total score)
  if (criteria.hasWebsite) score += 2;
  if (criteria.hasPhone) score += 2;
  if (criteria.objectiveCount >= 2) score += 1;

  return Math.min(100, Math.max(0, score));
}

async function autoAssignLead(lead: any, tx: any): Promise<string | null> {
  // High-value leads (score > 70) go to senior managers
  if (lead.lead_score > 70) {
    return 'senior.manager@company.com';
  }
  
  // Medium-value leads (score 40-70) go to account managers
  if (lead.lead_score >= 40) {
    return 'account.manager@company.com';
  }
  
  // Lower-value leads go to junior sales reps
  return 'junior.sales@company.com';
}

async function getRecommendedPackages(criteria: {
  budgetRange?: string;
  objectives?: string[];
  companySize?: string;
  industry: string;
}): Promise<Array<{
  packageId: number;
  packageName: string;
  tier: string;
  price: number;
  matchScore: number;
  benefits: string[];
}>> {
  // Get all active packages
  const packages = await db.queryAll`
    SELECT * FROM sponsorship_packages 
    WHERE is_active = true 
    ORDER BY base_price ASC
  `;

  return packages.map(pkg => {
    let matchScore = 0;
    
    // Budget fit scoring
    const budgetFit = calculateBudgetFit(criteria.budgetRange, pkg.base_price);
    matchScore += budgetFit * 0.4;
    
    // Objective alignment scoring
    const objectiveAlignment = calculateObjectiveAlignment(criteria.objectives, pkg.benefits);
    matchScore += objectiveAlignment * 0.3;
    
    // Company size fit scoring
    const sizeFit = calculateSizeFit(criteria.companySize, pkg.tier);
    matchScore += sizeFit * 0.2;
    
    // Industry fit scoring
    const industryFit = calculateIndustryFit(criteria.industry, pkg.benefits);
    matchScore += industryFit * 0.1;

    return {
      packageId: pkg.id,
      packageName: pkg.name,
      tier: pkg.tier,
      price: pkg.base_price,
      matchScore: Math.round(matchScore),
      benefits: Object.keys(pkg.benefits || {}),
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function calculateBudgetFit(budgetRange?: string, packagePrice?: number): number {
  if (!budgetRange || !packagePrice) return 50;
  
  const budgetRanges = {
    'under_5k': { min: 0, max: 5000 },
    '5k_15k': { min: 5000, max: 15000 },
    '15k_50k': { min: 15000, max: 50000 },
    '50k_100k': { min: 50000, max: 100000 },
    'over_100k': { min: 100000, max: Infinity },
  };
  
  const range = budgetRanges[budgetRange as keyof typeof budgetRanges];
  if (!range) return 50;
  
  if (packagePrice >= range.min && packagePrice <= range.max) return 100;
  if (packagePrice < range.min) return Math.max(0, 100 - ((range.min - packagePrice) / range.min) * 100);
  return Math.max(0, 100 - ((packagePrice - range.max) / range.max) * 100);
}

function calculateObjectiveAlignment(objectives?: string[], benefits?: Record<string, any>): number {
  if (!objectives || !benefits) return 50;
  
  const benefitKeys = Object.keys(benefits).map(k => k.toLowerCase());
  const matchingObjectives = objectives.filter(obj => 
    benefitKeys.some(benefit => 
      benefit.includes(obj.toLowerCase()) || obj.toLowerCase().includes(benefit)
    )
  );
  
  return (matchingObjectives.length / objectives.length) * 100;
}

function calculateSizeFit(companySize?: string, packageTier?: string): number {
  const sizeToTierMap = {
    'startup': ['bronze'],
    'small': ['bronze', 'silver'],
    'medium': ['silver', 'gold'],
    'large': ['gold', 'platinum'],
    'enterprise': ['platinum', 'custom'],
  };
  
  if (!companySize || !packageTier) return 50;
  
  const appropriateTiers = sizeToTierMap[companySize as keyof typeof sizeToTierMap];
  return appropriateTiers?.includes(packageTier) ? 100 : 30;
}

function calculateIndustryFit(industry: string, benefits?: Record<string, any>): number {
  if (!benefits) return 50;
  
  const industryKeywords = {
    'fashion': ['brand', 'visibility', 'audience', 'networking'],
    'technology': ['innovation', 'demo', 'networking', 'thought_leadership'],
    'luxury': ['premium', 'vip', 'exclusive', 'high_end'],
    'beauty': ['brand', 'visibility', 'audience', 'product_showcase'],
  };
  
  const keywords = industryKeywords[industry.toLowerCase() as keyof typeof industryKeywords] || [];
  const benefitText = JSON.stringify(benefits).toLowerCase();
  
  const matchingKeywords = keywords.filter(keyword => benefitText.includes(keyword));
  return keywords.length > 0 ? (matchingKeywords.length / keywords.length) * 100 : 50;
}
