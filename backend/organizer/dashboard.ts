import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { DashboardSummary, EventAlert } from "./types";

const eventDB = SQLDatabase.named("event");
const ticketDB = SQLDatabase.named("ticket");

export interface GetDashboardParams {
  organizerId: number;
}

// Gets comprehensive dashboard data for an event organizer.
export const getDashboard = api<GetDashboardParams, DashboardSummary>(
  { expose: true, method: "GET", path: "/organizers/:organizerId/dashboard" },
  async ({ organizerId }) => {
    // Verify organizer exists
    const organizer = await organizerDB.queryRow`
      SELECT id FROM event_organizers WHERE id = ${organizerId}
    `;

    if (!organizer) {
      throw APIError.notFound("Organizer not found");
    }

    // Get today's events
    const todayEvents = await organizerDB.queryAll`
      SELECT 
        ep.id,
        ep.project_name,
        e.start_date as event_time,
        ep.project_status as status,
        COALESCE(ticket_stats.attendee_count, 0) as attendee_count,
        COALESCE(urgent_tasks.urgent_count, 0) as urgent_tasks
      FROM event_projects ep
      JOIN events e ON ep.event_id = e.id
      LEFT JOIN (
        SELECT 
          ep2.id as project_id,
          COUNT(t.id) as attendee_count
        FROM event_projects ep2
        JOIN tickets t ON ep2.event_id = t.event_id
        WHERE t.status = 'active'
        GROUP BY ep2.id
      ) ticket_stats ON ep.id = ticket_stats.project_id
      LEFT JOIN (
        SELECT 
          project_id,
          COUNT(*) as urgent_count
        FROM event_timeline
        WHERE status IN ('pending', 'in_progress')
          AND priority IN ('high', 'urgent')
          AND due_date <= NOW() + INTERVAL '24 hours'
        GROUP BY project_id
      ) urgent_tasks ON ep.id = urgent_tasks.project_id
      WHERE ep.organizer_id = ${organizerId}
        AND DATE(e.start_date) = CURRENT_DATE
      ORDER BY e.start_date ASC
    `;

    // Get week metrics
    const weekMetrics = await organizerDB.queryRow`
      SELECT 
        COUNT(DISTINCT ep.id) as total_events,
        COALESCE(SUM(revenue_stats.total_revenue), 0) as total_revenue,
        COALESCE(AVG(ticket_stats.attendee_count), 0) as average_attendance,
        COALESCE(SUM(task_stats.completed_tasks), 0) as completed_tasks,
        COALESCE(SUM(task_stats.pending_tasks), 0) as pending_tasks
      FROM event_projects ep
      JOIN events e ON ep.event_id = e.id
      LEFT JOIN (
        SELECT 
          ep2.id as project_id,
          SUM(to2.total_amount) as total_revenue
        FROM event_projects ep2
        JOIN ticket_orders to2 ON ep2.event_id = to2.event_id
        WHERE to2.payment_status = 'completed'
        GROUP BY ep2.id
      ) revenue_stats ON ep.id = revenue_stats.project_id
      LEFT JOIN (
        SELECT 
          ep3.id as project_id,
          COUNT(t.id) as attendee_count
        FROM event_projects ep3
        JOIN tickets t ON ep3.event_id = t.event_id
        WHERE t.status = 'active'
        GROUP BY ep3.id
      ) ticket_stats ON ep.id = ticket_stats.project_id
      LEFT JOIN (
        SELECT 
          project_id,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as pending_tasks
        FROM event_timeline
        GROUP BY project_id
      ) task_stats ON ep.id = task_stats.project_id
      WHERE ep.organizer_id = ${organizerId}
        AND e.start_date >= NOW() - INTERVAL '7 days'
        AND e.start_date <= NOW() + INTERVAL '7 days'
    `;

    // Get urgent tasks
    const urgentTasks = await organizerDB.queryAll`
      SELECT 
        et.id,
        et.task_name,
        ep.project_name,
        et.due_date,
        et.priority,
        u.first_name || ' ' || u.last_name as assigned_to
      FROM event_timeline et
      JOIN event_projects ep ON et.project_id = ep.id
      LEFT JOIN users u ON et.assigned_to = u.id
      WHERE ep.organizer_id = ${organizerId}
        AND et.status IN ('pending', 'in_progress')
        AND et.priority IN ('high', 'urgent')
        AND et.due_date <= NOW() + INTERVAL '72 hours'
      ORDER BY et.due_date ASC, et.priority DESC
      LIMIT 10
    `;

    // Get revenue tracking
    const revenueTracking = await organizerDB.queryRow`
      SELECT 
        COALESCE(this_month.revenue, 0) as this_month,
        COALESCE(last_month.revenue, 0) as last_month,
        COALESCE(projected.revenue, 0) as projected_revenue
      FROM (
        SELECT SUM(to1.total_amount) as revenue
        FROM event_projects ep1
        JOIN ticket_orders to1 ON ep1.event_id = to1.event_id
        WHERE ep1.organizer_id = ${organizerId}
          AND to1.payment_status = 'completed'
          AND DATE_TRUNC('month', to1.created_at) = DATE_TRUNC('month', NOW())
      ) this_month
      CROSS JOIN (
        SELECT SUM(to2.total_amount) as revenue
        FROM event_projects ep2
        JOIN ticket_orders to2 ON ep2.event_id = to2.event_id
        WHERE ep2.organizer_id = ${organizerId}
          AND to2.payment_status = 'completed'
          AND DATE_TRUNC('month', to2.created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      ) last_month
      CROSS JOIN (
        SELECT SUM(ep3.budget_total) as revenue
        FROM event_projects ep3
        WHERE ep3.organizer_id = ${organizerId}
          AND ep3.project_status IN ('planning', 'in_progress')
          AND ep3.start_date >= NOW()
      ) projected
    `;

    // Get alerts
    const alerts = await organizerDB.queryAll`
      SELECT *
      FROM event_alerts
      WHERE organizer_id = ${organizerId}
        AND is_resolved = false
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY severity DESC, created_at DESC
      LIMIT 20
    `;

    const thisMonth = revenueTracking?.this_month || 0;
    const lastMonth = revenueTracking?.last_month || 0;
    const percentageChange = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      todayEvents: todayEvents.map(event => ({
        id: event.id,
        projectName: event.project_name,
        eventTime: event.event_time,
        status: event.status as any,
        attendeeCount: event.attendee_count,
        urgentTasks: event.urgent_tasks,
      })),
      weekMetrics: {
        totalEvents: weekMetrics?.total_events || 0,
        totalRevenue: weekMetrics?.total_revenue || 0,
        averageAttendance: weekMetrics?.average_attendance || 0,
        completedTasks: weekMetrics?.completed_tasks || 0,
        pendingTasks: weekMetrics?.pending_tasks || 0,
      },
      urgentTasks: urgentTasks.map(task => ({
        id: task.id,
        taskName: task.task_name,
        projectName: task.project_name,
        dueDate: task.due_date,
        priority: task.priority as any,
        assignedTo: task.assigned_to,
      })),
      revenueTracking: {
        thisMonth,
        lastMonth,
        percentageChange,
        projectedRevenue: revenueTracking?.projected_revenue || 0,
      },
      alerts: alerts.map(alert => ({
        id: alert.id,
        organizerId: alert.organizer_id,
        projectId: alert.project_id,
        alertType: alert.alert_type as any,
        severity: alert.severity as any,
        title: alert.title,
        message: alert.message,
        actionRequired: alert.action_required,
        actionUrl: alert.action_url,
        isRead: alert.is_read,
        isResolved: alert.is_resolved,
        expiresAt: alert.expires_at,
        createdAt: alert.created_at,
      })),
    };
  }
);

export interface GetRealtimeSalesParams {
  eventId: number;
}

export interface RealtimeSalesData {
  ticketsSold: number;
  revenue: number;
  buyerId: number;
  timestamp: Date;
  tierName: string;
  quantity: number;
}

// Gets real-time sales data for an event.
export const getRealtimeSales = api<GetRealtimeSalesParams, RealtimeSalesData[]>(
  { expose: true, method: "GET", path: "/organizers/events/:eventId/sales/realtime" },
  async ({ eventId }) => {
    // Get recent sales (last 24 hours)
    const recentSales = await ticketDB.queryAll`
      SELECT 
        COUNT(t.id) as tickets_sold,
        SUM(t.purchase_price) as revenue,
        t.user_id as buyer_id,
        t.created_at as timestamp,
        tt.name as tier_name,
        COUNT(t.id) as quantity
      FROM tickets t
      JOIN ticket_tiers tt ON t.tier_id = tt.id
      WHERE t.event_id = ${eventId}
        AND t.created_at >= NOW() - INTERVAL '24 hours'
        AND t.status = 'active'
      GROUP BY t.user_id, t.created_at, tt.name, t.tier_id
      ORDER BY t.created_at DESC
      LIMIT 50
    `;

    return recentSales.map(sale => ({
      ticketsSold: sale.tickets_sold,
      revenue: sale.revenue,
      buyerId: sale.buyer_id,
      timestamp: sale.timestamp,
      tierName: sale.tier_name,
      quantity: sale.quantity,
    }));
  }
);

export interface CreateAlertRequest {
  organizerId: number;
  projectId?: number;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  actionRequired?: boolean;
  actionUrl?: string;
  expiresAt?: Date;
}

// Creates a new alert for an organizer.
export const createAlert = api<CreateAlertRequest, EventAlert>(
  { expose: true, method: "POST", path: "/organizers/alerts" },
  async (req) => {
    const row = await organizerDB.queryRow`
      INSERT INTO event_alerts (
        organizer_id, project_id, alert_type, severity, title, message,
        action_required, action_url, expires_at
      )
      VALUES (
        ${req.organizerId}, ${req.projectId}, ${req.alertType}, ${req.severity},
        ${req.title}, ${req.message}, ${req.actionRequired || false}, 
        ${req.actionUrl}, ${req.expiresAt}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create alert");
    }

    return {
      id: row.id,
      organizerId: row.organizer_id,
      projectId: row.project_id,
      alertType: row.alert_type as any,
      severity: row.severity as any,
      title: row.title,
      message: row.message,
      actionRequired: row.action_required,
      actionUrl: row.action_url,
      isRead: row.is_read,
      isResolved: row.is_resolved,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
);

export interface MarkAlertReadRequest {
  alertId: number;
}

// Marks an alert as read.
export const markAlertRead = api<MarkAlertReadRequest, void>(
  { expose: true, method: "PUT", path: "/organizers/alerts/:alertId/read" },
  async ({ alertId }) => {
    const result = await organizerDB.queryRow`
      UPDATE event_alerts 
      SET is_read = true 
      WHERE id = ${alertId}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("Alert not found");
    }
  }
);
