import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { db } from "./db";
import type { SponsorLead, SponsorCompany, LeadActivity } from "./types";

export interface GetLeadsParams {
  status?: Query<string>;
  assignedTo?: Query<string>;
  minScore?: Query<number>;
  maxScore?: Query<number>;
  industry?: Query<string>;
  budgetRange?: Query<string>;
  timeline?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  sortBy?: Query<string>;
  sortOrder?: Query<string>;
}

export interface LeadWithDetails extends SponsorLead {
  company?: SponsorCompany;
  recentActivities: LeadActivity[];
  daysSinceCreated: number;
  daysSinceLastActivity: number;
}

export interface GetLeadsResponse {
  leads: LeadWithDetails[];
  total: number;
  summary: {
    totalLeads: number;
    newLeads: number;
    qualifiedLeads: number;
    proposalsSent: number;
    averageScore: number;
    conversionRate: number;
  };
}

// Get leads with filtering and sorting
export const getLeads = api<GetLeadsParams, GetLeadsResponse>(
  { method: "GET", path: "/sponsor/leads" },
  async ({ 
    status, assignedTo, minScore, maxScore, industry, budgetRange, timeline,
    limit = 20, offset = 0, sortBy = "created_at", sortOrder = "desc" 
  }) => {
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`sl.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      conditions.push(`sl.assigned_to = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex++;
    }

    if (minScore !== undefined) {
      conditions.push(`sl.lead_score >= $${paramIndex}`);
      params.push(minScore);
      paramIndex++;
    }

    if (maxScore !== undefined) {
      conditions.push(`sl.lead_score <= $${paramIndex}`);
      params.push(maxScore);
      paramIndex++;
    }

    if (industry) {
      conditions.push(`sc.industry ILIKE $${paramIndex}`);
      params.push(`%${industry}%`);
      paramIndex++;
    }

    if (budgetRange) {
      conditions.push(`sl.budget_range = $${paramIndex}`);
      params.push(budgetRange);
      paramIndex++;
    }

    if (timeline) {
      conditions.push(`sl.timeline = $${paramIndex}`);
      params.push(timeline);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get leads with company info
    const leadsQuery = `
      SELECT 
        sl.*,
        sc.name as company_name,
        sc.industry as company_industry,
        sc.website as company_website,
        sc.company_size,
        sc.annual_revenue,
        sc.headquarters_location,
        sc.description as company_description,
        sc.logo_url,
        sc.created_at as company_created_at,
        sc.updated_at as company_updated_at,
        EXTRACT(DAYS FROM NOW() - sl.created_at) as days_since_created
      FROM sponsor_leads sl
      LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
      ${whereClause}
      ORDER BY sl.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const leads = await db.rawQueryAll(leadsQuery, ...params, limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sponsor_leads sl
      LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
      ${whereClause}
    `;

    const countResult = await db.rawQueryRow(countQuery, ...params);
    const total = countResult?.total || 0;

    // Get recent activities for each lead
    const leadIds = leads.map(l => l.id);
    const activities = leadIds.length > 0 ? await db.rawQueryAll(`
      SELECT * FROM sponsor_lead_activities 
      WHERE lead_id = ANY($1)
      ORDER BY created_at DESC
    `, [leadIds]) : [];

    const activitiesByLead = activities.reduce((acc, activity) => {
      if (!acc[activity.lead_id]) acc[activity.lead_id] = [];
      acc[activity.lead_id].push(activity);
      return acc;
    }, {} as Record<number, any[]>);

    // Get last activity dates
    const lastActivities = leadIds.length > 0 ? await db.rawQueryAll(`
      SELECT 
        lead_id,
        MAX(created_at) as last_activity
      FROM sponsor_lead_activities 
      WHERE lead_id = ANY($1)
      GROUP BY lead_id
    `, [leadIds]) : [];

    const lastActivityByLead = lastActivities.reduce((acc, la) => {
      acc[la.lead_id] = la.last_activity;
      return acc;
    }, {} as Record<number, Date>);

    // Format leads
    const formattedLeads: LeadWithDetails[] = leads.map(lead => {
      const recentActivities = (activitiesByLead[lead.id] || []).slice(0, 5).map(activity => ({
        id: activity.id,
        leadId: activity.lead_id,
        activityType: activity.activity_type,
        description: activity.description,
        performedBy: activity.performed_by,
        metadata: activity.metadata,
        createdAt: activity.created_at,
      }));

      const lastActivity = lastActivityByLead[lead.id];
      const daysSinceLastActivity = lastActivity 
        ? Math.ceil((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : lead.days_since_created;

      return {
        id: lead.id,
        companyId: lead.company_id,
        contactName: lead.contact_name,
        contactEmail: lead.contact_email,
        contactPhone: lead.contact_phone,
        jobTitle: lead.job_title,
        budgetRange: lead.budget_range,
        objectives: lead.objectives,
        preferredEvents: lead.preferred_events,
        timeline: lead.timeline,
        leadSource: lead.lead_source,
        status: lead.status,
        leadScore: lead.lead_score,
        assignedTo: lead.assigned_to,
        notes: lead.notes,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        company: lead.company_name ? {
          id: lead.company_id,
          name: lead.company_name,
          industry: lead.company_industry,
          website: lead.company_website,
          companySize: lead.company_size,
          annualRevenue: lead.annual_revenue,
          headquartersLocation: lead.headquarters_location,
          description: lead.company_description,
          logoUrl: lead.logo_url,
          createdAt: lead.company_created_at,
          updatedAt: lead.company_updated_at,
        } : undefined,
        recentActivities,
        daysSinceCreated: lead.days_since_created,
        daysSinceLastActivity,
      };
    });

    // Get summary statistics
    const summaryStats = await db.queryRow`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN status = 'proposal_sent' THEN 1 END) as proposals_sent,
        AVG(lead_score) as average_score,
        CASE 
          WHEN COUNT(CASE WHEN status IN ('new', 'qualified', 'proposal_sent', 'negotiating') THEN 1 END) > 0
          THEN (COUNT(CASE WHEN status = 'closed_won' THEN 1 END)::float / 
                COUNT(CASE WHEN status IN ('new', 'qualified', 'proposal_sent', 'negotiating', 'closed_won', 'closed_lost') THEN 1 END)) * 100
          ELSE 0
        END as conversion_rate
      FROM sponsor_leads
    `;

    return {
      leads: formattedLeads,
      total,
      summary: {
        totalLeads: summaryStats?.total_leads || 0,
        newLeads: summaryStats?.new_leads || 0,
        qualifiedLeads: summaryStats?.qualified_leads || 0,
        proposalsSent: summaryStats?.proposals_sent || 0,
        averageScore: summaryStats?.average_score || 0,
        conversionRate: summaryStats?.conversion_rate || 0,
      },
    };
  }
);

export interface UpdateLeadStatusRequest {
  leadId: number;
  status: "new" | "qualified" | "proposal_sent" | "negotiating" | "closed_won" | "closed_lost";
  notes?: string;
  performedBy: string;
}

// Update lead status with activity tracking
export const updateLeadStatus = api<UpdateLeadStatusRequest, { success: boolean }>(
  { method: "PUT", path: "/sponsor/leads/status" },
  async ({ leadId, status, notes, performedBy }) => {
    await using tx = await db.begin();

    try {
      // Update lead status
      const updated = await tx.queryRow`
        UPDATE sponsor_leads 
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${leadId}
        RETURNING *
      `;

      if (!updated) {
        throw APIError.notFound("Lead not found");
      }

      // Add notes if provided
      if (notes) {
        await tx.exec`
          UPDATE sponsor_leads 
          SET notes = COALESCE(notes, '') || '\n\n' || ${new Date().toISOString()} || ' - ' || ${notes}
          WHERE id = ${leadId}
        `;
      }

      // Log activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${leadId}, 'status_change', 'Status changed to ${status}', ${performedBy})
      `;

      await tx.commit();
      return { success: true };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface AssignLeadRequest {
  leadId: number;
  assignedTo: string;
  performedBy: string;
  notes?: string;
}

// Assign lead to a team member
export const assignLead = api<AssignLeadRequest, { success: boolean }>(
  { method: "PUT", path: "/sponsor/leads/assign" },
  async ({ leadId, assignedTo, performedBy, notes }) => {
    await using tx = await db.begin();

    try {
      // Update assignment
      await tx.exec`
        UPDATE sponsor_leads 
        SET assigned_to = ${assignedTo}, updated_at = NOW()
        WHERE id = ${leadId}
      `;

      // Add notes if provided
      if (notes) {
        await tx.exec`
          UPDATE sponsor_leads 
          SET notes = COALESCE(notes, '') || '\n\n' || ${new Date().toISOString()} || ' - ' || ${notes}
          WHERE id = ${leadId}
        `;
      }

      // Log activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${leadId}, 'lead_assigned', 'Lead assigned to ${assignedTo}', ${performedBy})
      `;

      await tx.commit();
      return { success: true };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface AddLeadActivityRequest {
  leadId: number;
  activityType: string;
  description: string;
  performedBy: string;
  metadata?: Record<string, any>;
}

// Add activity to lead timeline
export const addLeadActivity = api<AddLeadActivityRequest, LeadActivity>(
  { method: "POST", path: "/sponsor/leads/activity" },
  async ({ leadId, activityType, description, performedBy, metadata }) => {
    const activity = await db.queryRow`
      INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by, metadata)
      VALUES (${leadId}, ${activityType}, ${description}, ${performedBy}, ${JSON.stringify(metadata || {})})
      RETURNING *
    `;

    if (!activity) {
      throw APIError.internal("Failed to create activity");
    }

    return {
      id: activity.id,
      leadId: activity.lead_id,
      activityType: activity.activity_type,
      description: activity.description,
      performedBy: activity.performed_by,
      metadata: activity.metadata,
      createdAt: activity.created_at,
    };
  }
);

export interface GetLeadDetailsParams {
  leadId: number;
}

// Get detailed lead information
export const getLeadDetails = api<GetLeadDetailsParams, LeadWithDetails>(
  { method: "GET", path: "/sponsor/leads/:leadId" },
  async ({ leadId }) => {
    // Get lead with company info
    const lead = await db.queryRow`
      SELECT 
        sl.*,
        sc.name as company_name,
        sc.industry as company_industry,
        sc.website as company_website,
        sc.company_size,
        sc.annual_revenue,
        sc.headquarters_location,
        sc.description as company_description,
        sc.logo_url,
        sc.created_at as company_created_at,
        sc.updated_at as company_updated_at,
        EXTRACT(DAYS FROM NOW() - sl.created_at) as days_since_created
      FROM sponsor_leads sl
      LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
      WHERE sl.id = ${leadId}
    `;

    if (!lead) {
      throw APIError.notFound("Lead not found");
    }

    // Get all activities
    const activities = await db.queryAll`
      SELECT * FROM sponsor_lead_activities 
      WHERE lead_id = ${leadId}
      ORDER BY created_at DESC
    `;

    // Get last activity date
    const lastActivity = activities.length > 0 ? activities[0].created_at : lead.created_at;
    const daysSinceLastActivity = Math.ceil((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: lead.id,
      companyId: lead.company_id,
      contactName: lead.contact_name,
      contactEmail: lead.contact_email,
      contactPhone: lead.contact_phone,
      jobTitle: lead.job_title,
      budgetRange: lead.budget_range,
      objectives: lead.objectives,
      preferredEvents: lead.preferred_events,
      timeline: lead.timeline,
      leadSource: lead.lead_source,
      status: lead.status,
      leadScore: lead.lead_score,
      assignedTo: lead.assigned_to,
      notes: lead.notes,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      company: lead.company_name ? {
        id: lead.company_id,
        name: lead.company_name,
        industry: lead.company_industry,
        website: lead.company_website,
        companySize: lead.company_size,
        annualRevenue: lead.annual_revenue,
        headquartersLocation: lead.headquarters_location,
        description: lead.company_description,
        logoUrl: lead.logo_url,
        createdAt: lead.company_created_at,
        updatedAt: lead.company_updated_at,
      } : undefined,
      recentActivities: activities.map(activity => ({
        id: activity.id,
        leadId: activity.lead_id,
        activityType: activity.activity_type,
        description: activity.description,
        performedBy: activity.performed_by,
        metadata: activity.metadata,
        createdAt: activity.created_at,
      })),
      daysSinceCreated: lead.days_since_created,
      daysSinceLastActivity,
    };
  }
);
