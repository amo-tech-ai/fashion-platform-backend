import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { EventSponsorship, SponsorshipStatus } from "./types";

export interface ListSponsorshipsParams {
  eventId?: Query<number>;
  sponsorId?: Query<number>;
  status?: Query<SponsorshipStatus>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListSponsorshipsResponse {
  sponsorships: EventSponsorship[];
  total: number;
}

// Lists event sponsorships with optional filtering.
export const listSponsorships = api<ListSponsorshipsParams, ListSponsorshipsResponse>(
  { expose: true, method: "GET", path: "/sponsors/sponsorships" },
  async ({ eventId, sponsorId, status, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (eventId) {
      whereClause += ` AND event_id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    if (sponsorId) {
      whereClause += ` AND sponsor_id = $${paramIndex}`;
      params.push(sponsorId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM event_sponsorships ${whereClause}`;
    const countResult = await sponsorDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM event_sponsorships 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await sponsorDB.rawQueryAll(query, ...params);

    const sponsorships = rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      sponsorId: row.sponsor_id,
      packageId: row.package_id,
      amountPaid: row.amount_paid,
      contractSignedAt: row.contract_signed_at,
      status: row.status as SponsorshipStatus,
      visibilityMetrics: row.visibility_metrics || {},
      roiMetrics: row.roi_metrics || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { sponsorships, total };
  }
);
