import { api, APIError } from "encore.dev/api";
import { analyticsDB } from "./db";
import type { EventAnalytics } from "./types";

export interface TrackEventMetricRequest {
  eventId: number;
  metricName: string;
  metricValue: number;
  metricDate?: Date;
}

// Tracks an event metric for analytics.
export const trackEventMetric = api<TrackEventMetricRequest, EventAnalytics>(
  { expose: true, method: "POST", path: "/analytics/events/track" },
  async ({ eventId, metricName, metricValue, metricDate }) => {
    const date = metricDate || new Date();

    const row = await analyticsDB.queryRow<EventAnalytics>`
      INSERT INTO event_analytics (event_id, metric_name, metric_value, metric_date)
      VALUES (${eventId}, ${metricName}, ${metricValue}, ${date})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to track event metric");
    }

    return {
      id: row.id,
      eventId: row.event_id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricDate: row.metric_date,
      createdAt: row.created_at,
    };
  }
);

export interface GetEventAnalyticsParams {
  eventId: number;
  metricName?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetEventAnalyticsResponse {
  metrics: EventAnalytics[];
  summary: {
    totalValue: number;
    averageValue: number;
    count: number;
  };
}

// Retrieves analytics data for an event.
export const getEventAnalytics = api<GetEventAnalyticsParams, GetEventAnalyticsResponse>(
  { expose: true, method: "GET", path: "/analytics/events/:eventId" },
  async ({ eventId, metricName, startDate, endDate }) => {
    let whereClause = "WHERE event_id = $1";
    const params: any[] = [eventId];
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
      SELECT * FROM event_analytics 
      ${whereClause}
      ORDER BY metric_date DESC, created_at DESC
    `;

    const rows = await analyticsDB.rawQueryAll(query, ...params);

    const metrics = rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricDate: row.metric_date,
      createdAt: row.created_at,
    }));

    // Calculate summary
    const totalValue = metrics.reduce((sum, metric) => sum + metric.metricValue, 0);
    const averageValue = metrics.length > 0 ? totalValue / metrics.length : 0;

    return {
      metrics,
      summary: {
        totalValue,
        averageValue,
        count: metrics.length,
      },
    };
  }
);
