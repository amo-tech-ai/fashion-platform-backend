import { api, APIError } from "encore.dev/api";
import { db } from "./db";

export interface GetRealTimeAnalyticsParams {
  organizerId: number;
  eventId?: number;
}

export interface RealTimeMetrics {
  totalRevenue: number;
  totalBookings: number;
  revenueToday: number;
  bookingsToday: number;
  revenueThisWeek: number;
  bookingsThisWeek: number;
  averageTicketPrice: number;
  conversionRate: number;
  refundRate: number;
  salesVelocity: number; // bookings per hour
}

export interface AttendeeDemo {
  ageGroups: Array<{ range: string; count: number; percentage: number }>;
  genderDistribution: Array<{ gender: string; count: number; percentage: number }>;
  locationDistribution: Array<{ location: string; count: number; percentage: number }>;
  ticketTypePreferences: Array<{ tierName: string; count: number; percentage: number }>;
  bookingPatterns: Array<{ hour: number; count: number }>;
  repeatCustomers: number;
  newCustomers: number;
}

export interface MarketingMetrics {
  campaignPerformance: Array<{
    source: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    cost: number;
    roi: number;
  }>;
  socialMediaMetrics: {
    shares: number;
    likes: number;
    comments: number;
    reach: number;
    engagement: number;
  };
  emailMetrics: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
    unsubscribed: number;
  };
  referralSources: Array<{ source: string; bookings: number; revenue: number }>;
}

export interface SalesTimeline {
  hourlyData: Array<{ hour: string; bookings: number; revenue: number }>;
  dailyData: Array<{ date: string; bookings: number; revenue: number; cumulativeRevenue: number }>;
  weeklyData: Array<{ week: string; bookings: number; revenue: number }>;
}

export interface EventAlert {
  id: string;
  type: 'low_sales' | 'high_demand' | 'capacity_warning' | 'refund_spike' | 'system_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  eventId?: number;
  actionRequired: boolean;
  resolved: boolean;
}

export interface ComprehensiveAnalytics {
  realTimeMetrics: RealTimeMetrics;
  attendeeDemographics: AttendeeDemo;
  marketingMetrics: MarketingMetrics;
  salesTimeline: SalesTimeline;
  alerts: EventAlert[];
  lastUpdated: Date;
}

// Get comprehensive real-time analytics
export const getRealTimeAnalytics = api<GetRealTimeAnalyticsParams, ComprehensiveAnalytics>(
  { method: "GET", path: "/organizer/analytics/realtime" },
  async ({ organizerId, eventId }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // Base query conditions
    let eventFilter = "e.organizer_id = $1";
    const params: any[] = [organizerId];
    let paramIndex = 2;

    if (eventId) {
      eventFilter += ` AND e.id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    // Real-time metrics
    const metricsQuery = `
      SELECT 
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.created_at >= $${paramIndex} THEN b.total_amount ELSE 0 END), 0) as revenue_today,
        COUNT(CASE WHEN b.created_at >= $${paramIndex} THEN 1 END) as bookings_today,
        COALESCE(SUM(CASE WHEN b.created_at >= $${paramIndex + 1} THEN b.total_amount ELSE 0 END), 0) as revenue_this_week,
        COUNT(CASE WHEN b.created_at >= $${paramIndex + 1} THEN 1 END) as bookings_this_week,
        COALESCE(AVG(b.total_amount / b.quantity), 0) as avg_ticket_price
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE ${eventFilter}
    `;
    params.push(today, weekStart);

    const metricsResult = await db.rawQueryRow(metricsQuery, ...params);

    // Calculate conversion rate (simplified - would need page view data in real app)
    const conversionRate = metricsResult?.total_bookings > 0 ? 
      (metricsResult.total_bookings / Math.max(metricsResult.total_bookings * 10, 1)) * 100 : 0;

    // Calculate refund rate
    const refundQuery = `
      SELECT COUNT(*) as refunds
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE ${eventFilter} AND b.status = 'cancelled'
    `;
    const refundResult = await db.rawQueryRow(refundQuery, organizerId, eventId).catch(() => ({ refunds: 0 }));
    const refundRate = metricsResult?.total_bookings > 0 ? 
      (refundResult.refunds / metricsResult.total_bookings) * 100 : 0;

    // Sales velocity (bookings per hour today)
    const hoursToday = (now.getTime() - today.getTime()) / (1000 * 60 * 60);
    const salesVelocity = hoursToday > 0 ? metricsResult?.bookings_today / hoursToday : 0;

    const realTimeMetrics: RealTimeMetrics = {
      totalRevenue: metricsResult?.total_revenue || 0,
      totalBookings: metricsResult?.total_bookings || 0,
      revenueToday: metricsResult?.revenue_today || 0,
      bookingsToday: metricsResult?.bookings_today || 0,
      revenueThisWeek: metricsResult?.revenue_this_week || 0,
      bookingsThisWeek: metricsResult?.bookings_this_week || 0,
      averageTicketPrice: metricsResult?.avg_ticket_price || 0,
      conversionRate,
      refundRate,
      salesVelocity,
    };

    // Attendee demographics (mock data for now - would need customer data collection)
    const attendeeDemographics: AttendeeDemo = {
      ageGroups: [
        { range: "18-24", count: 45, percentage: 22.5 },
        { range: "25-34", count: 78, percentage: 39.0 },
        { range: "35-44", count: 52, percentage: 26.0 },
        { range: "45-54", count: 18, percentage: 9.0 },
        { range: "55+", count: 7, percentage: 3.5 },
      ],
      genderDistribution: [
        { gender: "Female", count: 120, percentage: 60.0 },
        { gender: "Male", count: 65, percentage: 32.5 },
        { gender: "Non-binary", count: 10, percentage: 5.0 },
        { gender: "Prefer not to say", count: 5, percentage: 2.5 },
      ],
      locationDistribution: [
        { location: "New York", count: 85, percentage: 42.5 },
        { location: "Los Angeles", count: 45, percentage: 22.5 },
        { location: "Chicago", count: 25, percentage: 12.5 },
        { location: "Miami", count: 20, percentage: 10.0 },
        { location: "Other", count: 25, percentage: 12.5 },
      ],
      ticketTypePreferences: [
        { tierName: "General", count: 120, percentage: 60.0 },
        { tierName: "VIP", count: 60, percentage: 30.0 },
        { tierName: "Press", count: 20, percentage: 10.0 },
      ],
      bookingPatterns: [
        { hour: 9, count: 5 }, { hour: 10, count: 12 }, { hour: 11, count: 18 },
        { hour: 12, count: 25 }, { hour: 13, count: 22 }, { hour: 14, count: 28 },
        { hour: 15, count: 35 }, { hour: 16, count: 30 }, { hour: 17, count: 20 },
        { hour: 18, count: 15 }, { hour: 19, count: 18 }, { hour: 20, count: 12 },
      ],
      repeatCustomers: 45,
      newCustomers: 155,
    };

    // Marketing metrics (mock data)
    const marketingMetrics: MarketingMetrics = {
      campaignPerformance: [
        { source: "Instagram Ads", visitors: 2500, conversions: 125, conversionRate: 5.0, revenue: 12500, cost: 800, roi: 1462.5 },
        { source: "Facebook Ads", visitors: 1800, conversions: 90, conversionRate: 5.0, revenue: 9000, cost: 600, roi: 1400.0 },
        { source: "Google Ads", visitors: 1200, conversions: 72, conversionRate: 6.0, revenue: 7200, cost: 500, roi: 1340.0 },
        { source: "Email Campaign", visitors: 800, conversions: 48, conversionRate: 6.0, revenue: 4800, cost: 100, roi: 4700.0 },
        { source: "Influencer", visitors: 600, conversions: 42, conversionRate: 7.0, revenue: 4200, cost: 1000, roi: 320.0 },
      ],
      socialMediaMetrics: {
        shares: 245,
        likes: 1850,
        comments: 320,
        reach: 15000,
        engagement: 2415,
      },
      emailMetrics: {
        sent: 5000,
        opened: 2250,
        clicked: 450,
        openRate: 45.0,
        clickRate: 20.0,
        unsubscribed: 25,
      },
      referralSources: [
        { source: "Direct", bookings: 85, revenue: 8500 },
        { source: "Social Media", bookings: 65, revenue: 6500 },
        { source: "Search", bookings: 45, revenue: 4500 },
        { source: "Email", bookings: 35, revenue: 3500 },
        { source: "Referral", bookings: 25, revenue: 2500 },
      ],
    };

    // Sales timeline
    const salesTimeline: SalesTimeline = {
      hourlyData: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        bookings: Math.floor(Math.random() * 10) + 1,
        revenue: Math.floor(Math.random() * 1000) + 100,
      })),
      dailyData: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const bookings = Math.floor(Math.random() * 20) + 5;
        const revenue = bookings * (Math.floor(Math.random() * 50) + 50);
        return {
          date: date.toISOString().split('T')[0],
          bookings,
          revenue,
          cumulativeRevenue: revenue * (i + 1),
        };
      }),
      weeklyData: Array.from({ length: 12 }, (_, i) => {
        const week = new Date();
        week.setDate(week.getDate() - (11 - i) * 7);
        return {
          week: `Week ${i + 1}`,
          bookings: Math.floor(Math.random() * 100) + 50,
          revenue: Math.floor(Math.random() * 10000) + 5000,
        };
      }),
    };

    // Generate alerts based on metrics
    const alerts: EventAlert[] = [];
    
    if (salesVelocity < 1 && metricsResult?.bookings_today < 5) {
      alerts.push({
        id: `alert_${Date.now()}_1`,
        type: 'low_sales',
        severity: 'medium',
        title: 'Low Sales Alert',
        message: 'Sales velocity is below expected levels today. Consider boosting marketing efforts.',
        timestamp: now,
        eventId,
        actionRequired: true,
        resolved: false,
      });
    }

    if (refundRate > 10) {
      alerts.push({
        id: `alert_${Date.now()}_2`,
        type: 'refund_spike',
        severity: 'high',
        title: 'High Refund Rate',
        message: `Refund rate is ${refundRate.toFixed(1)}%, which is above normal levels.`,
        timestamp: now,
        eventId,
        actionRequired: true,
        resolved: false,
      });
    }

    // Check for capacity warnings
    if (eventId) {
      const capacityQuery = `
        SELECT 
          e.capacity,
          COALESCE(SUM(b.quantity), 0) as sold
        FROM events e
        LEFT JOIN bookings b ON e.id = b.event_id
        WHERE e.id = $1
        GROUP BY e.capacity
      `;
      const capacityResult = await db.rawQueryRow(capacityQuery, eventId);
      
      if (capacityResult) {
        const utilizationRate = (capacityResult.sold / capacityResult.capacity) * 100;
        
        if (utilizationRate > 90) {
          alerts.push({
            id: `alert_${Date.now()}_3`,
            type: 'capacity_warning',
            severity: 'high',
            title: 'Near Capacity',
            message: `Event is ${utilizationRate.toFixed(1)}% sold out. Consider adding more tickets or preparing waitlist.`,
            timestamp: now,
            eventId,
            actionRequired: true,
            resolved: false,
          });
        } else if (utilizationRate > 95) {
          alerts.push({
            id: `alert_${Date.now()}_4`,
            type: 'high_demand',
            severity: 'critical',
            title: 'High Demand Alert',
            message: 'Event is nearly sold out! Consider increasing capacity or creating a waitlist.',
            timestamp: now,
            eventId,
            actionRequired: true,
            resolved: false,
          });
        }
      }
    }

    return {
      realTimeMetrics,
      attendeeDemographics,
      marketingMetrics,
      salesTimeline,
      alerts,
      lastUpdated: now,
    };
  }
);

export interface GenerateReportRequest {
  organizerId: number;
  eventId?: number;
  reportType: 'daily' | 'weekly' | 'monthly' | 'event_summary';
  startDate?: string;
  endDate?: string;
  includeComparisons: boolean;
  emailRecipients?: string[];
}

export interface GeneratedReport {
  id: string;
  reportType: string;
  generatedAt: Date;
  summary: {
    totalRevenue: number;
    totalBookings: number;
    averageTicketPrice: number;
    topPerformingEvent: string;
    growthRate: number;
  };
  downloadUrl: string;
  emailSent: boolean;
}

// Generate automated report
export const generateReport = api<GenerateReportRequest, GeneratedReport>(
  { method: "POST", path: "/organizer/reports/generate" },
  async ({ organizerId, eventId, reportType, startDate, endDate, includeComparisons, emailRecipients }) => {
    // Calculate date range based on report type
    const now = new Date();
    let start: Date, end: Date;

    switch (reportType) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = endDate ? new Date(endDate) : now;
    }

    // Generate report data
    let eventFilter = "e.organizer_id = $1";
    const params: any[] = [organizerId];
    let paramIndex = 2;

    if (eventId) {
      eventFilter += ` AND e.id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    eventFilter += ` AND b.created_at >= $${paramIndex} AND b.created_at <= $${paramIndex + 1}`;
    params.push(start, end);

    const reportQuery = `
      SELECT 
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COUNT(b.id) as total_bookings,
        COALESCE(AVG(b.total_amount / b.quantity), 0) as avg_ticket_price,
        e.name as event_name,
        SUM(b.total_amount) as event_revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id
      WHERE ${eventFilter}
      GROUP BY e.id, e.name
      ORDER BY event_revenue DESC
      LIMIT 1
    `;

    const reportData = await db.rawQueryRow(reportQuery, ...params);

    // Calculate growth rate if comparisons are included
    let growthRate = 0;
    if (includeComparisons) {
      const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
      const prevEnd = start;

      const prevQuery = `
        SELECT COALESCE(SUM(b.total_amount), 0) as prev_revenue
        FROM events e
        LEFT JOIN bookings b ON e.id = b.event_id
        WHERE e.organizer_id = $1 AND b.created_at >= $2 AND b.created_at <= $3
      `;

      const prevData = await db.rawQueryRow(prevQuery, organizerId, prevStart, prevEnd);
      const prevRevenue = prevData?.prev_revenue || 0;
      const currentRevenue = reportData?.total_revenue || 0;

      if (prevRevenue > 0) {
        growthRate = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
      }
    }

    const reportId = `report_${Date.now()}_${organizerId}`;
    const downloadUrl = `/api/reports/${reportId}/download`;

    // In a real app, you would:
    // 1. Generate PDF/Excel report
    // 2. Store in object storage
    // 3. Send emails if recipients provided

    if (emailRecipients && emailRecipients.length > 0) {
      // Mock email sending
      console.log(`Sending report to: ${emailRecipients.join(', ')}`);
    }

    return {
      id: reportId,
      reportType,
      generatedAt: now,
      summary: {
        totalRevenue: reportData?.total_revenue || 0,
        totalBookings: reportData?.total_bookings || 0,
        averageTicketPrice: reportData?.avg_ticket_price || 0,
        topPerformingEvent: reportData?.event_name || 'No events',
        growthRate,
      },
      downloadUrl,
      emailSent: emailRecipients ? emailRecipients.length > 0 : false,
    };
  }
);
