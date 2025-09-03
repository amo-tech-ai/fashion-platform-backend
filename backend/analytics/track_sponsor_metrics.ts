import { api, APIError } from "encore.dev/api";
import { analyticsDB } from "./db";
import type { SponsorAnalytics } from "./types";

export interface TrackSponsorMetricRequest {
  sponsorshipId: number;
  metricName: string;
  metricValue: number;
  metricDate?: Date;
  metadata?: Record<string, any>;
}

// Tracks a sponsor metric for ROI analytics.
export const trackSponsorMetric = api<TrackSponsorMetricRequest, SponsorAnalytics>(
  { expose: true, method: "POST", path: "/analytics/sponsors/track" },
  async ({ sponsorshipId, metricName, metricValue, metricDate, metadata }) => {
    const date = metricDate || new Date();

    const row = await analyticsDB.queryRow<SponsorAnalytics>`
      INSERT INTO sponsor_analytics (sponsorship_id, metric_name, metric_value, metric_date, metadata)
      VALUES (${sponsorshipId}, ${metricName}, ${metricValue}, ${date}, ${JSON.stringify(metadata || {})})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to track sponsor metric");
    }

    return {
      id: row.id,
      sponsorshipId: row.sponsorship_id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricDate: row.metric_date,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
);

export interface GetSponsorAnalyticsParams {
  sponsorshipId: number;
  metricName?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetSponsorAnalyticsResponse {
  metrics: SponsorAnalytics[];
  roiSummary: {
    totalInvestment: number;
    totalReturns: number;
    roiPercentage: number;
    impressions: number;
    engagements: number;
  };
}

// Retrieves analytics data for a sponsorship.
export const getSponsorAnalytics = api<GetSponsorAnalyticsParams, GetSponsorAnalyticsResponse>(
  { expose: true, method: "GET", path: "/analytics/sponsors/:sponsorshipId" },
  async ({ sponsorshipId, metricName, startDate, endDate }) => {
    let whereClause = "WHERE sponsorship_id = $1";
    const params: any[] = [sponsorshipId];
    let paramIndex = 2;

    if (metricName) {
      whereClause += ` AND metric_name = $${paramIndex}`;
      params.push(metricName);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND metric_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND metric_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT * FROM sponsor_analytics 
      ${whereClause}
      ORDER BY metric_date DESC, created_at DESC
    `;

    const rows = await analyticsDB.rawQueryAll(query, ...params);

    const metrics = rows.map(row => ({
      id: row.id,
      sponsorshipId: row.sponsorship_id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricDate: row.metric_date,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));

    // Calculate ROI summary
    const investment = metrics
      .filter(m => m.metricName === 'investment')
      .reduce((sum, m) => sum + m.metricValue, 0);

    const returns = metrics
      .filter(m => m.metricName === 'returns')
      .reduce((sum, m) => sum + m.metricValue, 0);

    const impressions = metrics
      .filter(m => m.metricName === 'impressions')
      .reduce((sum, m) => sum + m.metricValue, 0);

    const engagements = metrics
      .filter(m => m.metricName === 'engagements')
      .reduce((sum, m) => sum + m.metricValue, 0);

    const roiPercentage = investment > 0 ? ((returns - investment) / investment) * 100 : 0;

    return {
      metrics,
      roiSummary: {
        totalInvestment: investment,
        totalReturns: returns,
        roiPercentage,
        impressions,
        engagements,
      },
    };
  }
);
