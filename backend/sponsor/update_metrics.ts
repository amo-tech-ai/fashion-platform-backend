import { api, APIError } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { EventSponsorship } from "./types";

export interface UpdateMetricsParams {
  id: number;
}

export interface UpdateMetricsRequest {
  visibilityMetrics?: Record<string, any>;
  roiMetrics?: Record<string, any>;
}

// Updates sponsorship metrics for ROI tracking.
export const updateMetrics = api<UpdateMetricsParams & UpdateMetricsRequest, EventSponsorship>(
  { expose: true, method: "PUT", path: "/sponsors/sponsorships/:id/metrics" },
  async ({ id, visibilityMetrics, roiMetrics }) => {
    let updateClause = "SET updated_at = NOW()";
    const params: any[] = [];
    let paramIndex = 1;

    if (visibilityMetrics) {
      updateClause += `, visibility_metrics = $${paramIndex}`;
      params.push(JSON.stringify(visibilityMetrics));
      paramIndex++;
    }

    if (roiMetrics) {
      updateClause += `, roi_metrics = $${paramIndex}`;
      params.push(JSON.stringify(roiMetrics));
      paramIndex++;
    }

    const query = `
      UPDATE event_sponsorships 
      ${updateClause}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(id);

    const row = await sponsorDB.rawQueryRow(query, ...params);

    if (!row) {
      throw APIError.notFound("Sponsorship not found");
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
