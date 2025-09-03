import { api, APIError } from "encore.dev/api";
import { sponsorDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { EventSponsorship } from "./types";

const eventDB = SQLDatabase.named("event");

export interface CreateSponsorshipRequest {
  eventId: number;
  sponsorId: number;
  packageId: number;
  amountPaid: number;
}

// Creates a new event sponsorship.
export const createSponsorship = api<CreateSponsorshipRequest, EventSponsorship>(
  { expose: true, method: "POST", path: "/sponsors/sponsorships" },
  async (req) => {
    // Verify event exists
    const event = await eventDB.queryRow`
      SELECT id FROM events WHERE id = ${req.eventId}
    `;
    
    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Verify sponsor exists
    const sponsor = await sponsorDB.queryRow`
      SELECT id FROM sponsors WHERE id = ${req.sponsorId}
    `;
    
    if (!sponsor) {
      throw APIError.notFound("Sponsor not found");
    }

    // Verify package exists and get details
    const package_ = await sponsorDB.queryRow`
      SELECT id, max_sponsors FROM sponsor_packages 
      WHERE id = ${req.packageId} AND is_active = true
    `;
    
    if (!package_) {
      throw APIError.notFound("Sponsor package not found or inactive");
    }

    // Check if sponsorship already exists
    const existing = await sponsorDB.queryRow`
      SELECT id FROM event_sponsorships 
      WHERE event_id = ${req.eventId} AND sponsor_id = ${req.sponsorId} AND package_id = ${req.packageId}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("Sponsorship already exists for this event, sponsor, and package combination");
    }

    // Check if package has reached max sponsors for this event
    const currentSponsors = await sponsorDB.queryRow`
      SELECT COUNT(*) as count FROM event_sponsorships 
      WHERE event_id = ${req.eventId} AND package_id = ${req.packageId} AND status != 'cancelled'
    `;
    
    if (currentSponsors && currentSponsors.count >= package_.max_sponsors) {
      throw APIError.resourceExhausted("Maximum number of sponsors reached for this package");
    }

    const row = await sponsorDB.queryRow<EventSponsorship>`
      INSERT INTO event_sponsorships (event_id, sponsor_id, package_id, amount_paid)
      VALUES (${req.eventId}, ${req.sponsorId}, ${req.packageId}, ${req.amountPaid})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create sponsorship");
    }

    return {
      id: row.id,
      eventId: row.event_id,
      sponsorId: row.sponsor_id,
      packageId: row.package_id,
      amountPaid: row.amount_paid,
      contractSignedAt: row.contract_signed_at,
      status: row.status as any,
      visibilityMetrics: row.visibility_metrics || {},
      roiMetrics: row.roi_metrics || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
