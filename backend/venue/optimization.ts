import { api } from "encore.dev/api";
import { db } from "./db";
import type { VenueOptimization, OptimizationRecommendation, PricingInsight, AvailabilityInsight } from "./types";

export interface GetVenueOptimizationParams {
  venue: string;
}

// Get optimization recommendations for a venue
export const getOptimization = api<GetVenueOptimizationParams, VenueOptimization>(
  { method: "GET", path: "/venues/:venue/optimization", expose: true },
  async ({ venue }) => {
    // Get venue performance data
    const venueMetrics = await db.queryRow`
      SELECT 
        COUNT(DISTINCT e.id) as total_events,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COALESCE(SUM(b.quantity), 0) as total_bookings,
        AVG(CASE WHEN e.capacity > 0 THEN (sold.tickets_sold::float / e.capacity) * 100 ELSE 0 END) as avg_capacity_utilization
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE e.venue = ${venue}
        AND e.date >= NOW() - INTERVAL '6 months'
    `;

    // Get pricing data by tier
    const pricingData = await db.queryAll`
      SELECT 
        t.name,
        AVG(t.price) as avg_price,
        AVG(CASE WHEN sold.tickets_sold > 0 THEN (sold.tickets_sold::float / t.quantity) * 100 ELSE 0 END) as avg_sell_rate
      FROM event_ticket_tiers t
      JOIN events e ON t.event_id = e.id
      LEFT JOIN (
        SELECT ticket_tier_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY ticket_tier_id
      ) sold ON t.id = sold.ticket_tier_id
      WHERE e.venue = ${venue}
        AND e.date >= NOW() - INTERVAL '6 months'
      GROUP BY t.name
    `;

    // Get day-of-week utilization
    const dayUtilization = await db.queryAll`
      SELECT 
        EXTRACT(DOW FROM e.date) as day_of_week,
        AVG(CASE WHEN e.capacity > 0 THEN (sold.tickets_sold::float / e.capacity) * 100 ELSE 0 END) as avg_utilization,
        COUNT(*) as event_count
      FROM events e
      LEFT JOIN (
        SELECT event_id, SUM(quantity) as tickets_sold
        FROM bookings
        GROUP BY event_id
      ) sold ON e.id = sold.event_id
      WHERE e.venue = ${venue}
        AND e.date >= NOW() - INTERVAL '6 months'
      GROUP BY EXTRACT(DOW FROM e.date)
      ORDER BY day_of_week
    `;

    const recommendations: OptimizationRecommendation[] = [];
    const pricingInsights: PricingInsight[] = [];
    const availabilityInsights: AvailabilityInsight[] = [];

    const avgCapacityUtilization = venueMetrics?.avg_capacity_utilization || 0;

    // Generate recommendations based on performance
    if (avgCapacityUtilization < 60) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        title: 'Consider Reducing Ticket Prices',
        description: 'Your average capacity utilization is below 60%. Lower prices might increase attendance.',
        expectedImpact: 'Potential 15-25% increase in attendance',
      });
    } else if (avgCapacityUtilization > 90) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        title: 'Opportunity for Premium Pricing',
        description: 'High demand suggests you can increase prices, especially for VIP tiers.',
        expectedImpact: 'Potential 10-20% revenue increase',
      });
    }

    if (venueMetrics?.total_events < 12) {
      recommendations.push({
        type: 'scheduling',
        priority: 'high',
        title: 'Increase Event Frequency',
        description: 'You have capacity for more events. Consider hosting events more frequently.',
        expectedImpact: 'Potential doubling of annual revenue',
      });
    }

    // Generate pricing insights
    for (const tier of pricingData) {
      const sellRate = tier.avg_sell_rate || 0;
      let suggestedPrice = tier.avg_price;
      let reasoning = '';

      if (sellRate > 90) {
        suggestedPrice = tier.avg_price * 1.15;
        reasoning = 'High sell rate indicates demand exceeds supply at current price';
      } else if (sellRate < 50) {
        suggestedPrice = tier.avg_price * 0.85;
        reasoning = 'Low sell rate suggests price may be too high for market demand';
      } else {
        reasoning = 'Current pricing appears optimal for market demand';
      }

      pricingInsights.push({
        tierName: tier.name,
        currentAveragePrice: tier.avg_price,
        suggestedPrice,
        priceChange: ((suggestedPrice - tier.avg_price) / tier.avg_price) * 100,
        reasoning,
      });
    }

    // Generate availability insights
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const day of dayUtilization) {
      const dayName = dayNames[day.day_of_week];
      const utilization = day.avg_utilization || 0;
      let suggestedAction = '';
      let potentialRevenue = 0;

      if (utilization < 50 && day.event_count > 0) {
        suggestedAction = 'Consider reducing events on this day or offering special promotions';
        potentialRevenue = 0;
      } else if (utilization > 80) {
        suggestedAction = 'High demand day - consider premium pricing or additional events';
        potentialRevenue = (venueMetrics?.total_revenue || 0) * 0.1;
      } else if (day.event_count === 0) {
        suggestedAction = 'Untapped opportunity - consider scheduling events on this day';
        potentialRevenue = (venueMetrics?.total_revenue || 0) * 0.15;
      } else {
        suggestedAction = 'Current scheduling appears optimal';
      }

      availabilityInsights.push({
        dayOfWeek: dayName,
        currentUtilization: utilization,
        suggestedAction,
        potentialRevenue,
      });
    }

    return {
      venue,
      recommendations,
      pricingInsights,
      availabilityInsights,
    };
  }
);
