export type CompanySize = "startup" | "small" | "medium" | "large" | "enterprise";
export type BudgetRange = "under_5k" | "5k_15k" | "15k_50k" | "50k_100k" | "over_100k";
export type Timeline = "immediate" | "next_month" | "next_quarter" | "next_year";
export type LeadStatus = "new" | "qualified" | "proposal_sent" | "negotiating" | "closed_won" | "closed_lost";
export type PackageTier = "bronze" | "silver" | "gold" | "platinum" | "custom";
export type ProposalStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
export type SignatureStatus = "pending" | "sponsor_signed" | "both_signed" | "cancelled";
export type PaymentType = "deposit" | "milestone" | "final" | "full";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
export type ActivationStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface SponsorCompany {
  id: number;
  name: string;
  industry: string;
  website?: string;
  companySize?: CompanySize;
  annualRevenue?: number;
  headquartersLocation?: string;
  description?: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorLead {
  id: number;
  companyId?: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  jobTitle?: string;
  budgetRange?: BudgetRange;
  objectives?: string[];
  preferredEvents?: string[];
  timeline?: Timeline;
  leadSource?: string;
  status: LeadStatus;
  leadScore: number;
  engagementScore: number;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastEngagedAt?: Date;
}

export interface SponsorshipPackage {
  id: number;
  name: string;
  tier: PackageTier;
  basePrice: number;
  description?: string;
  benefits: Record<string, any>;
  maxSponsors: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventSponsorshipOpportunity {
  id: number;
  eventId: number;
  packageId: number;
  customPrice?: number;
  customBenefits?: Record<string, any>;
  availableSlots: number;
  soldSlots: number;
  isAvailable: boolean;
  createdAt: Date;
}

export interface SponsorProposal {
  id: number;
  leadId: number;
  eventId?: number;
  packageId?: number;
  customPackageDetails?: Record<string, any>;
  totalAmount: number;
  roiProjections?: Record<string, any>;
  proposalDocumentUrl?: string;
  status: ProposalStatus;
  validUntil?: Date;
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorContract {
  id: number;
  proposalId: number;
  contractNumber: string;
  sponsorCompanyId: number;
  eventId: number;
  totalAmount: number;
  paymentTerms?: string;
  contractDocumentUrl?: string;
  signatureStatus: SignatureStatus;
  sponsorSignedAt?: Date;
  organizerSignedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  deliverables?: Record<string, any>;
  renewalStatus: 'pending' | 'offered' | 'negotiating' | 'renewed' | 'declined';
  renewalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorPayment {
  id: number;
  contractId: number;
  amount: number;
  paymentType: PaymentType;
  dueDate?: Date;
  paidDate?: Date;
  paymentMethod?: string;
  transactionId?: string;
  status: PaymentStatus;
  createdAt: Date;
}

export interface SponsorActivation {
  id: number;
  contractId: number;
  activationType: string;
  description?: string;
  dueDate?: Date;
  completedDate?: Date;
  status: ActivationStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  activityType: string;
  description?: string;
  performedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SponsorProspect {
  id: number;
  companyName: string;
  website?: string;
  industry?: string;
  source?: string;
  status: 'new' | 'researching' | 'contacted' | 'converted' | 'rejected';
  fitScore: number;
  enrichmentData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadEngagementEvent {
  id: number;
  leadId: number;
  eventType: 'email_open' | 'link_click' | 'page_view' | 'form_submit';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface OutreachCampaign {
  id: number;
  name: string;
  description?: string;
  targetIndustry?: string;
  targetCompanySize?: CompanySize;
  isActive: boolean;
  createdAt: Date;
}

export interface CampaignEmail {
  id: number;
  campaignId: number;
  sequenceNumber: number;
  delayDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
  createdAt: Date;
}

export interface LeadCampaignEnrollment {
  id: number;
  leadId: number;
  campaignId: number;
  status: 'active' | 'paused' | 'completed' | 'unsubscribed';
  currentSequence: number;
  lastSentAt?: Date;
  enrolledAt: Date;
}

export interface SponsorAsset {
  id: number;
  contractId: number;
  assetType: string;
  fileUrl: string;
  submittedBy?: string;
  status: 'submitted' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenewalOffer {
  id: number;
  contractId: number;
  offerAmount: number;
  incentives?: string[];
  validUntil?: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: Date;
}
