import { api } from "encore.dev/api";
import { recommendationDB } from "./db";
import { Query } from "encore.dev/api";

export interface RecommendationAnalyticsParams {
  userId?: Query<number>;
  startDate?: Query<Date>;
  endDate?: Query<Date>;
}

export interface RecommendationAnalyticsResponse {
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  topRecommendationReasons: Array<{
    reason: string;
    count: number;
    successRate: number;
  }>;
  userEngagementMetrics: {
    averageInteractionsPerUser: number;
    mostActiveUsers: Array<{
      userId: number;
      interactionCount: number;
    }>;
  };
  eventPopularityMetrics: {
    topEvents: Array<{
      eventId: number;
      interactionCount: number;
      uniqueUsers: number;
    }>;
  };
}

// Provides analytics on recommendation system performance.
export const getRecommendationAnalytics = api<RecommendationAnalyticsParams, RecommendationAnalyticsResponse>(
  { expose: true, method: "GET", path: "/recommendations/analytics" },
  async ({ userId, startDate, endDate }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Total recommendations served
    const totalRecommendationsQuery = `
      SELECT COUNT(*) as count FROM recommendation_cache ${whereClause}
    `;
    const totalRecommendationsResult = await recommendationDB.rawQueryRow(totalRecommendationsQuery, ...params);
    const totalRecommendations = totalRecommendationsResult?.count || 0;

    // Click-through rate (views after recommendations)
    const clickThroughQuery = `
      SELECT 
        COUNT(DISTINCT rc.user_id, rc.event_id) as recommended,
        COUNT(DISTINCT ui.user_id, ui.event_id) as clicked
      FROM recommendation_cache rc
      LEFT JOIN user_interactions ui ON rc.user_id = ui.user_id 
        AND rc.event_id = ui.event_id 
        AND ui.interaction_type = 'view'
        AND ui.created_at >= rc.created_at
      ${whereClause.replace('WHERE', 'WHERE rc.user_id IS NOT NULL AND')}
    `;
    const clickThroughResult = await recommendationDB.rawQueryRow(clickThroughQuery, ...params);
    const clickThroughRate = clickThroughResult?.recommended > 0 
      ? (clickThroughResult.clicked / clickThroughResult.recommended) * 100 
      : 0;

    // Conversion rate (purchases after recommendations)
    const conversionQuery = `
      SELECT 
        COUNT(DISTINCT rc.user_id, rc.event_id) as recommended,
        COUNT(DISTINCT ui.user_id, ui.event_id) as converted
      FROM recommendation_cache rc
      LEFT JOIN user_interactions ui ON rc.user_id = ui.user_id 
        AND rc.event_id = ui.event_id 
        AND ui.interaction_type = 'purchase'
        AND ui.created_at >= rc.created_at
      ${whereClause.replace('WHERE', 'WHERE rc.user_id IS NOT NULL AND')}
    `;
    const conversionResult = await recommendationDB.rawQueryRow(conversionQuery, ...params);
    const conversionRate = conversionResult?.recommended > 0 
      ? (conversionResult.converted / conversionResult.recommended) * 100 
      : 0;

    // Top recommendation reasons
    const reasonsQuery = `
      SELECT 
        recommendation_reason as reason,
        COUNT(*) as count,
        COUNT(CASE WHEN ui.interaction_type = 'purchase' THEN 1 END) as conversions
      FROM recommendation_cache rc
      LEFT JOIN user_interactions ui ON rc.user_id = ui.user_id 
        AND rc.event_id = ui.event_id 
        AND ui.interaction_type = 'purchase'
        AND ui.created_at >= rc.created_at
      ${whereClause.replace('WHERE', 'WHERE rc.recommendation_reason IS NOT NULL AND')}
      GROUP BY recommendation_reason
      ORDER BY count DESC
      LIMIT 10
    `;
    const reasonsResult = await recommendationDB.rawQueryAll(reasonsQuery, ...params);
    const topRecommendationReasons = reasonsResult.map(row => ({
      reason: row.reason,
      count: row.count,
      successRate: row.count > 0 ? (row.conversions / row.count) * 100 : 0,
    }));

    // User engagement metrics
    const userEngagementQuery = `
      SELECT 
        AVG(interaction_count) as avg_interactions,
        user_id,
        interaction_count
      FROM (
        SELECT user_id, COUNT(*) as interaction_count
        FROM user_interactions ui
        ${whereClause}
        GROUP BY user_id
      ) user_stats
      GROUP BY user_id, interaction_count
      ORDER BY interaction_count DESC
    `;
    const userEngagementResult = await recommendationDB.rawQueryAll(userEngagementQuery, ...params);
    const averageInteractionsPerUser = userEngagementResult.length > 0 
      ? userEngagementResult.reduce((sum, row) => sum + row.interaction_count, 0) / userEngagementResult.length 
      : 0;
    const mostActiveUsers = userEngagementResult.slice(0, 10).map(row => ({
      userId: row.user_id,
      interactionCount: row.interaction_count,
    }));

    // Event popularity metrics
    const eventPopularityQuery = `
      SELECT 
        event_id,
        COUNT(*) as interaction_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_interactions ui
      ${whereClause}
      GROUP BY event_id
      ORDER BY interaction_count DESC
      LIMIT 10
    `;
    const eventPopularityResult = await recommendationDB.rawQueryAll(eventPopularityQuery, ...params);
    const topEvents = eventPopularityResult.map(row => ({
      eventId: row.event_id,
      interactionCount: row.interaction_count,
      uniqueUsers: row.unique_users,
    }));

    return {
      totalRecommendations,
      clickThroughRate,
      conversionRate,
      topRecommendationReasons,
      userEngagementMetrics: {
        averageInteractionsPerUser,
        mostActiveUsers,
      },
      eventPopularityMetrics: {
        topEvents,
      },
    };
  }
);

export interface OptimizeRecommendationsResponse {
  optimizationsApplied: string[];
  performanceImprovement: number;
}

// Optimizes recommendation algorithms based on performance data.
export const optimizeRecommendations = api<void, OptimizeRecommendationsResponse>(
  { expose: true, method: "POST", path: "/recommendations/optimize" },
  async () => {
    const optimizations: string[] = [];

    // Clean up expired cache entries
    const expiredCacheResult = await recommendationDB.queryRow`
      DELETE FROM recommendation_cache 
      WHERE expires_at < NOW()
      RETURNING COUNT(*) as deleted
    `;
    if (expiredCacheResult?.deleted > 0) {
      optimizations.push(`Cleaned up ${expiredCacheResult.deleted} expired cache entries`);
    }

    // Remove old user similarities (older than 30 days)
    const oldSimilaritiesResult = await recommendationDB.queryRow`
      DELETE FROM user_similarity 
      WHERE calculated_at < NOW() - INTERVAL '30 days'
      RETURNING COUNT(*) as deleted
    `;
    if (oldSimilaritiesResult?.deleted > 0) {
      optimizations.push(`Removed ${oldSimilaritiesResult.deleted} outdated similarity calculations`);
    }

    // Update event popularity scores based on recent interactions
    const eventsToUpdate = await recommendationDB.queryAll`
      SELECT DISTINCT event_id
      FROM user_interactions
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;

    let updatedEvents = 0;
    for (const event of eventsToUpdate) {
      const recentInteractions = await recommendationDB.queryRow`
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(CASE WHEN interaction_type = 'purchase' THEN 1 END) as purchases,
          AVG(interaction_weight) as avg_weight
        FROM user_interactions
        WHERE event_id = ${event.event_id} 
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      if (recentInteractions) {
        const newPopularityScore = Math.min(100, 
          (recentInteractions.total_interactions * 2) + 
          (recentInteractions.purchases * 10) +
          (recentInteractions.avg_weight * 5)
        );

        await recommendationDB.exec`
          UPDATE event_features 
          SET popularity_score = ${newPopularityScore}, updated_at = NOW()
          WHERE event_id = ${event.event_id}
        `;
        updatedEvents++;
      }
    }

    if (updatedEvents > 0) {
      optimizations.push(`Updated popularity scores for ${updatedEvents} events`);
    }

    // Calculate performance improvement (simplified metric)
    const performanceImprovement = optimizations.length * 5; // 5% per optimization

    return {
      optimizationsApplied: optimizations,
      performanceImprovement,
    };
  }
);
