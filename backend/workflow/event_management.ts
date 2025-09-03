import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { notification } from "~encore/clients";
import { analytics } from "~encore/clients";

const eventDB = SQLDatabase.named("event");
const ticketDB = SQLDatabase.named("ticket");
const userDB = SQLDatabase.named("user");
const venueDB = SQLDatabase.named("venue");

export interface PublishEventRequest {
  eventId: number;
  publisherId: number;
}

export interface PublishEventResponse {
  success: boolean;
  message: string;
  registrationUrl: string;
}

// Publishes an event and makes it available for registration.
export const publishEvent = api<PublishEventRequest, PublishEventResponse>(
  { expose: true, method: "POST", path: "/workflow/events/:eventId/publish" },
  async ({ eventId, publisherId }) => {
    // Get event details
    const event = await eventDB.queryRow`
      SELECT * FROM events WHERE id = ${eventId}
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

    if (event.status !== 'draft') {
      throw APIError.failedPrecondition("Event is not in draft status");
    }

    // Validate event has required components
    const ticketTiers = await eventDB.queryAll`
      SELECT * FROM ticket_tiers WHERE event_id = ${eventId} AND is_active = true
    `;

    if (ticketTiers.length === 0) {
      throw APIError.failedPrecondition("Event must have at least one active ticket tier");
    }

    // Check if venue is booked (if venue is specified)
    if (event.venue_id) {
      const venueBooking = await venueDB.queryRow`
        SELECT * FROM venue_bookings 
        WHERE venue_id = ${event.venue_id} 
          AND event_id = ${eventId}
          AND status = 'confirmed'
      `;

      if (!venueBooking) {
        throw APIError.failedPrecondition("Venue booking must be confirmed before publishing");
      }
    }

    try {
      // Update event status
      await eventDB.exec`
        UPDATE events 
        SET status = 'published', updated_at = NOW()
        WHERE id = ${eventId}
      `;

      // Track event publication
      await analytics.trackEventMetric({
        eventId,
        metricName: 'published',
        metricValue: 1,
      });

      const registrationUrl = `https://fashionplatform.com/events/${eventId}/register`;

      return {
        success: true,
        message: "Event published successfully",
        registrationUrl,
      };

    } catch (error: any) {
      throw APIError.internal(`Failed to publish event: ${error.message}`);
    }
  }
);

export interface SendEventRemindersRequest {
  eventId: number;
  reminderType: "24h" | "1h" | "custom";
  customMessage?: string;
}

export interface SendEventRemindersResponse {
  success: boolean;
  emailsSent: number;
  message: string;
}

// Sends event reminders to ticket holders.
export const sendEventReminders = api<SendEventRemindersRequest, SendEventRemindersResponse>(
  { expose: true, method: "POST", path: "/workflow/events/:eventId/reminders" },
  async ({ eventId, reminderType, customMessage }) => {
    // Get event details
    const event = await eventDB.queryRow`
      SELECT e.*, v.address, v.city, v.state, v.country
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ${eventId}
    `;

    if (!event) {
      throw APIError.notFound("Event not found");
    }

    // Get all ticket holders for this event
    const ticketHolders = await ticketDB.queryAll`
      SELECT DISTINCT t.user_id, u.email, u.first_name, u.last_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.event_id = ${eventId} AND t.status = 'active'
    `;

    if (ticketHolders.length === 0) {
      return {
        success: true,
        emailsSent: 0,
        message: "No active ticket holders found",
      };
    }

    const venueAddress = event.address 
      ? `${event.address}, ${event.city}, ${event.state}, ${event.country}`
      : "Venue TBD";

    let emailsSent = 0;

    try {
      // Send reminders to all ticket holders
      for (const holder of ticketHolders) {
        await notification.sendEventReminder({
          userEmail: holder.email,
          userName: `${holder.first_name} ${holder.last_name}`,
          eventTitle: event.title,
          eventDate: event.start_date,
          venueAddress,
        });
        emailsSent++;
      }

      // Track reminder sending
      await analytics.trackEventMetric({
        eventId,
        metricName: 'reminders_sent',
        metricValue: emailsSent,
      });

      return {
        success: true,
        emailsSent,
        message: `Reminders sent to ${emailsSent} ticket holders`,
      };

    } catch (error: any) {
      throw APIError.internal(`Failed to send reminders: ${error.message}`);
    }
  }
);

export interface GetEventMetricsParams {
  eventId: number;
}

export interface GetEventMetricsResponse {
  ticketsSold: number;
  revenue: number;
  attendanceRate: number;
  topTier: string;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

// Retrieves comprehensive metrics for an event.
export const getEventMetrics = api<GetEventMetricsParams, GetEventMetricsResponse>(
  { expose: true, method: "GET", path: "/workflow/events/:eventId/metrics" },
  async ({ eventId }) => {
    // Get ticket sales data
    const ticketStats = await ticketDB.queryRow`
      SELECT 
        COUNT(*) as tickets_sold,
        SUM(purchase_price) as total_revenue,
        COUNT(CASE WHEN status = 'used' THEN 1 END) as tickets_used
      FROM tickets 
      WHERE event_id = ${eventId}
    `;

    // Get top selling tier
    const topTierData = await ticketDB.queryRow`
      SELECT tt.name, COUNT(t.id) as sold_count
      FROM tickets t
      JOIN ticket_tiers tt ON t.tier_id = tt.id
      WHERE t.event_id = ${eventId}
      GROUP BY tt.id, tt.name
      ORDER BY sold_count DESC
      LIMIT 1
    `;

    // Get registration trend (last 30 days)
    const registrationTrend = await ticketDB.queryAll`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM tickets
      WHERE event_id = ${eventId}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const ticketsSold = ticketStats?.tickets_sold || 0;
    const revenue = ticketStats?.total_revenue || 0;
    const ticketsUsed = ticketStats?.tickets_used || 0;
    const attendanceRate = ticketsSold > 0 ? (ticketsUsed / ticketsSold) * 100 : 0;

    const trend = registrationTrend.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: row.count,
    }));

    return {
      ticketsSold,
      revenue,
      attendanceRate,
      topTier: topTierData?.name || "N/A",
      registrationTrend: trend,
    };
  }
);
