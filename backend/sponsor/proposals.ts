import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";
import type { SponsorProposal } from "./types";

export interface CreateProposalRequest {
  leadId: number;
  eventId?: number;
  packageId?: number;
  customPackageDetails?: Record<string, any>;
  totalAmount: number;
  validUntilDays?: number;
  performedBy: string;
}

export interface ProposalWithDetails extends SponsorProposal {
  leadName: string;
  leadEmail: string;
  companyName: string;
  eventName?: string;
  packageName?: string;
  roiCalculation: {
    estimatedAttendees: number;
    targetDemographics: string[];
    brandExposureValue: number;
    leadGenerationValue: number;
    networkingValue: number;
    totalEstimatedValue: number;
    roi: number;
  };
}

// Create a new proposal with ROI calculations
export const createProposal = api<CreateProposalRequest, ProposalWithDetails>(
  { method: "POST", path: "/sponsor/proposals" },
  async ({ leadId, eventId, packageId, customPackageDetails, totalAmount, validUntilDays = 30, performedBy }) => {
    await using tx = await db.begin();

    try {
      // Get lead details
      const lead = await tx.queryRow`
        SELECT sl.*, sc.name as company_name
        FROM sponsor_leads sl
        LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
        WHERE sl.id = ${leadId}
      `;

      if (!lead) {
        throw APIError.notFound("Lead not found");
      }

      // Get event details if specified
      let event = null;
      if (eventId) {
        event = await tx.queryRow`
          SELECT * FROM events WHERE id = ${eventId}
        `;
      }

      // Get package details if specified
      let packageInfo = null;
      if (packageId) {
        packageInfo = await tx.queryRow`
          SELECT * FROM sponsorship_packages WHERE id = ${packageId}
        `;
      }

      // Calculate ROI projections
      const roiProjections = await calculateROIProjections({
        totalAmount,
        eventId,
        packageId,
        customPackageDetails,
        leadBudgetRange: lead.budget_range,
        companySize: lead.company_size,
      });

      // Set valid until date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validUntilDays);

      // Create proposal
      const proposal = await tx.queryRow`
        INSERT INTO sponsor_proposals (
          lead_id, event_id, package_id, custom_package_details, 
          total_amount, roi_projections, status, valid_until
        )
        VALUES (
          ${leadId}, ${eventId}, ${packageId}, 
          ${customPackageDetails ? JSON.stringify(customPackageDetails) : null},
          ${totalAmount}, ${JSON.stringify(roiProjections)}, 'draft', ${validUntil}
        )
        RETURNING *
      `;

      if (!proposal) {
        throw APIError.internal("Failed to create proposal");
      }

      // Log activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${leadId}, 'proposal_created', 'Proposal created for $${totalAmount}', ${performedBy})
      `;

      await tx.commit();

      return {
        id: proposal.id,
        leadId: proposal.lead_id,
        eventId: proposal.event_id,
        packageId: proposal.package_id,
        customPackageDetails: proposal.custom_package_details,
        totalAmount: proposal.total_amount,
        roiProjections: proposal.roi_projections,
        proposalDocumentUrl: proposal.proposal_document_url,
        status: proposal.status,
        validUntil: proposal.valid_until,
        sentAt: proposal.sent_at,
        viewedAt: proposal.viewed_at,
        respondedAt: proposal.responded_at,
        createdAt: proposal.created_at,
        updatedAt: proposal.updated_at,
        leadName: lead.contact_name,
        leadEmail: lead.contact_email,
        companyName: lead.company_name || 'Unknown Company',
        eventName: event?.name,
        packageName: packageInfo?.name,
        roiCalculation: roiProjections,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface SendProposalRequest {
  proposalId: number;
  performedBy: string;
  customMessage?: string;
}

// Send proposal to prospect
export const sendProposal = api<SendProposalRequest, { success: boolean; trackingUrl: string }>(
  { method: "POST", path: "/sponsor/proposals/send" },
  async ({ proposalId, performedBy, customMessage }) => {
    await using tx = await db.begin();

    try {
      // Get proposal with lead details
      const proposal = await tx.queryRow`
        SELECT 
          sp.*,
          sl.contact_name,
          sl.contact_email,
          sc.name as company_name,
          e.name as event_name
        FROM sponsor_proposals sp
        JOIN sponsor_leads sl ON sp.lead_id = sl.id
        LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
        LEFT JOIN events e ON sp.event_id = e.id
        WHERE sp.id = ${proposalId}
      `;

      if (!proposal) {
        throw APIError.notFound("Proposal not found");
      }

      if (proposal.status !== 'draft') {
        throw APIError.invalidArgument("Proposal has already been sent");
      }

      // Update proposal status
      await tx.exec`
        UPDATE sponsor_proposals 
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${proposalId}
      `;

      // Update lead status
      await tx.exec`
        UPDATE sponsor_leads 
        SET status = 'proposal_sent', updated_at = NOW()
        WHERE id = ${proposal.lead_id}
      `;

      // Log activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${proposal.lead_id}, 'proposal_sent', 'Proposal sent to ${proposal.contact_email}', ${performedBy})
      `;

      await tx.commit();

      // Generate tracking URL
      const trackingUrl = `https://sponsor-portal.company.com/proposals/${proposalId}/view`;

      // Send proposal email
      await notification.sendProposalEmail({
        recipientEmail: proposal.contact_email,
        recipientName: proposal.contact_name,
        companyName: proposal.company_name,
        eventName: proposal.event_name,
        totalAmount: proposal.total_amount,
        roiProjections: proposal.roi_projections,
        trackingUrl,
        customMessage,
      });

      return { success: true, trackingUrl };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface TrackProposalViewRequest {
  proposalId: number;
}

// Track when proposal is viewed
export const trackProposalView = api<TrackProposalViewRequest, { success: boolean }>(
  { method: "POST", path: "/sponsor/proposals/track-view", expose: true },
  async ({ proposalId }) => {
    await using tx = await db.begin();

    try {
      // Update proposal view status
      const updated = await tx.queryRow`
        UPDATE sponsor_proposals 
        SET status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
            viewed_at = CASE WHEN viewed_at IS NULL THEN NOW() ELSE viewed_at END,
            updated_at = NOW()
        WHERE id = ${proposalId}
        RETURNING lead_id, status, viewed_at
      `;

      if (!updated) {
        throw APIError.notFound("Proposal not found");
      }

      // Log activity if this is the first view
      if (updated.status === 'viewed') {
        await tx.exec`
          INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
          VALUES (${updated.lead_id}, 'proposal_viewed', 'Proposal was viewed by prospect', 'system')
        `;
      }

      await tx.commit();
      return { success: true };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface RespondToProposalRequest {
  proposalId: number;
  response: "accepted" | "rejected";
  feedback?: string;
  requestedChanges?: string[];
}

// Respond to proposal
export const respondToProposal = api<RespondToProposalRequest, { success: boolean }>(
  { method: "POST", path: "/sponsor/proposals/respond", expose: true },
  async ({ proposalId, response, feedback, requestedChanges }) => {
    await using tx = await db.begin();

    try {
      // Update proposal status
      const updated = await tx.queryRow`
        UPDATE sponsor_proposals 
        SET status = ${response}, responded_at = NOW(), updated_at = NOW()
        WHERE id = ${proposalId}
        RETURNING lead_id
      `;

      if (!updated) {
        throw APIError.notFound("Proposal not found");
      }

      // Update lead status
      const newLeadStatus = response === 'accepted' ? 'negotiating' : 'closed_lost';
      await tx.exec`
        UPDATE sponsor_leads 
        SET status = ${newLeadStatus}, updated_at = NOW()
        WHERE id = ${updated.lead_id}
      `;

      // Log activity
      const activityDescription = response === 'accepted' 
        ? 'Proposal accepted by prospect'
        : `Proposal rejected by prospect${feedback ? ': ' + feedback : ''}`;

      await tx.exec`
        INSERT INTO sponsor_lead_activities (
          lead_id, activity_type, description, performed_by, metadata
        )
        VALUES (
          ${updated.lead_id}, 'proposal_response', ${activityDescription}, 'prospect',
          ${JSON.stringify({ response, feedback, requestedChanges })}
        )
      `;

      await tx.commit();

      // Notify sales team
      await notification.notifyProposalResponse({
        proposalId,
        leadId: updated.lead_id,
        response,
        feedback,
        requestedChanges,
      });

      return { success: true };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

async function calculateROIProjections(params: {
  totalAmount: number;
  eventId?: number;
  packageId?: number;
  customPackageDetails?: Record<string, any>;
  leadBudgetRange?: string;
  companySize?: string;
}): Promise<any> {
  const { totalAmount, eventId, packageId } = params;

  // Get event attendance data
  let estimatedAttendees = 500; // default
  if (eventId) {
    const event = await db.queryRow`
      SELECT capacity FROM events WHERE id = ${eventId}
    `;
    estimatedAttendees = event?.capacity || 500;
  }

  // Get package benefits
  let benefits: Record<string, any> = {};
  if (packageId) {
    const packageInfo = await db.queryRow`
      SELECT benefits FROM sponsorship_packages WHERE id = ${packageId}
    `;
    benefits = packageInfo?.benefits || {};
  }

  // Calculate different value components
  const brandExposureValue = calculateBrandExposureValue(estimatedAttendees, benefits);
  const leadGenerationValue = calculateLeadGenerationValue(estimatedAttendees, benefits);
  const networkingValue = calculateNetworkingValue(estimatedAttendees, benefits);

  const totalEstimatedValue = brandExposureValue + leadGenerationValue + networkingValue;
  const roi = ((totalEstimatedValue - totalAmount) / totalAmount) * 100;

  return {
    estimatedAttendees,
    targetDemographics: ['Fashion Industry Professionals', 'Designers', 'Buyers', 'Media'],
    brandExposureValue,
    leadGenerationValue,
    networkingValue,
    totalEstimatedValue,
    roi: Math.round(roi),
  };
}

function calculateBrandExposureValue(attendees: number, benefits: Record<string, any>): number {
  let baseValue = attendees * 5; // $5 per impression

  // Multiply based on benefits
  if (benefits.logo_placement) baseValue *= 1.5;
  if (benefits.stage_mention) baseValue *= 1.3;
  if (benefits.social_media) baseValue *= 1.2;
  if (benefits.website_listing) baseValue *= 1.1;

  return Math.round(baseValue);
}

function calculateLeadGenerationValue(attendees: number, benefits: Record<string, any>): number {
  let baseValue = 0;

  // Lead generation opportunities
  if (benefits.booth_space) baseValue += attendees * 0.1 * 50; // 10% conversion at $50 per lead
  if (benefits.attendee_list) baseValue += attendees * 0.05 * 30; // 5% conversion at $30 per lead
  if (benefits.networking_session) baseValue += attendees * 0.15 * 40; // 15% conversion at $40 per lead

  return Math.round(baseValue);
}

function calculateNetworkingValue(attendees: number, benefits: Record<string, any>): number {
  let baseValue = 0;

  // Networking opportunities
  if (benefits.vip_access) baseValue += 2000;
  if (benefits.exclusive_dinner) baseValue += 1500;
  if (benefits.backstage_access) baseValue += 1000;
  if (benefits.meet_and_greet) baseValue += 800;

  return baseValue;
}
