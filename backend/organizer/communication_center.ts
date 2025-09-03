import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import { notification } from "~encore/clients";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import type { EventCommunication } from "./types";

const userDB = SQLDatabase.named("user");
const designerDB = SQLDatabase.named("designer");

export interface CreateCommunicationRequest {
  projectId: number;
  communicationType: string;
  recipientType: string;
  subject?: string;
  message: string;
  scheduledTime?: Date;
  createdBy: number;
}

// Creates and optionally schedules a communication.
export const createCommunication = api<CreateCommunicationRequest, EventCommunication>(
  { expose: true, method: "POST", path: "/organizers/communications" },
  async (req) => {
    // Verify project exists
    const project = await organizerDB.queryRow`
      SELECT id, project_name FROM event_projects WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Get recipient count based on type
    let recipientCount = 0;
    const recipients: Array<{ email: string; name: string }> = [];

    switch (req.recipientType) {
      case 'all':
        // Get all stakeholders
        const allStakeholders = await organizerDB.queryAll`
          SELECT DISTINCT u.email, u.first_name || ' ' || u.last_name as name
          FROM (
            SELECT staff_user_id as user_id FROM event_staff_assignments WHERE project_id = ${req.projectId}
            UNION
            SELECT d.user_id FROM event_designer_coordination edc 
            JOIN designers d ON edc.designer_id = d.id 
            WHERE edc.project_id = ${req.projectId}
          ) stakeholders
          JOIN users u ON stakeholders.user_id = u.id
        `;
        recipients.push(...allStakeholders.map(s => ({ email: s.email, name: s.name })));
        break;

      case 'staff':
        const staff = await organizerDB.queryAll`
          SELECT u.email, u.first_name || ' ' || u.last_name as name
          FROM event_staff_assignments esa
          JOIN users u ON esa.staff_user_id = u.id
          WHERE esa.project_id = ${req.projectId}
        `;
        recipients.push(...staff.map(s => ({ email: s.email, name: s.name })));
        break;

      case 'designers':
        const designers = await organizerDB.queryAll`
          SELECT u.email, u.first_name || ' ' || u.last_name as name
          FROM event_designer_coordination edc
          JOIN designers d ON edc.designer_id = d.id
          JOIN users u ON d.user_id = u.id
          WHERE edc.project_id = ${req.projectId}
        `;
        recipients.push(...designers.map(d => ({ email: d.email, name: d.name })));
        break;

      case 'vendors':
        const vendors = await organizerDB.queryAll`
          SELECT email, contact_person as name
          FROM event_vendor_management
          WHERE project_id = ${req.projectId} AND email IS NOT NULL
        `;
        recipients.push(...vendors.map(v => ({ email: v.email, name: v.name || 'Vendor Contact' })));
        break;
    }

    recipientCount = recipients.length;

    const row = await organizerDB.queryRow`
      INSERT INTO event_communications (
        project_id, communication_type, recipient_type, subject, message,
        scheduled_time, recipient_count, created_by
      )
      VALUES (
        ${req.projectId}, ${req.communicationType}, ${req.recipientType}, ${req.subject},
        ${req.message}, ${req.scheduledTime}, ${recipientCount}, ${req.createdBy}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create communication");
    }

    // Send immediately if no scheduled time
    if (!req.scheduledTime || req.scheduledTime <= new Date()) {
      await sendCommunication(row.id, recipients);
    }

    return {
      id: row.id,
      projectId: row.project_id,
      communicationType: row.communication_type as any,
      recipientType: row.recipient_type as any,
      subject: row.subject,
      message: row.message,
      scheduledTime: row.scheduled_time,
      sentTime: row.sent_time,
      status: row.status as any,
      recipientCount: row.recipient_count,
      deliveryCount: row.delivery_count,
      openCount: row.open_count,
      clickCount: row.click_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }
);

async function sendCommunication(communicationId: number, recipients: Array<{ email: string; name: string }>) {
  const communication = await organizerDB.queryRow`
    SELECT * FROM event_communications WHERE id = ${communicationId}
  `;

  if (!communication) return;

  let deliveryCount = 0;

  for (const recipient of recipients) {
    try {
      if (communication.communication_type === 'email') {
        await notification.sendEmail({
          to: recipient.email,
          subject: communication.subject || 'Event Update',
          htmlContent: `
            <h2>${communication.subject || 'Event Update'}</h2>
            <p>Hello ${recipient.name},</p>
            <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff;">
              ${communication.message.replace(/\n/g, '<br>')}
            </div>
            <p>Best regards,<br>Event Organization Team</p>
          `,
        });
        deliveryCount++;
      }
      // Add SMS and other communication types here
    } catch (error) {
      console.error(`Failed to send communication to ${recipient.email}:`, error);
    }
  }

  // Update communication status
  await organizerDB.exec`
    UPDATE event_communications 
    SET 
      status = 'sent',
      sent_time = NOW(),
      delivery_count = ${deliveryCount}
    WHERE id = ${communicationId}
  `;
}

export interface GetCommunicationHistoryParams {
  projectId: number;
  limit?: number;
  offset?: number;
}

export interface GetCommunicationHistoryResponse {
  communications: Array<EventCommunication & {
    createdByName: string;
    deliveryRate: number;
    openRate: number;
  }>;
  total: number;
}

// Gets communication history for a project.
export const getCommunicationHistory = api<GetCommunicationHistoryParams, GetCommunicationHistoryResponse>(
  { expose: true, method: "GET", path: "/organizers/projects/:projectId/communications" },
  async ({ projectId, limit = 20, offset = 0 }) => {
    const communications = await organizerDB.queryAll`
      SELECT 
        ec.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM event_communications ec
      JOIN users u ON ec.created_by = u.id
      WHERE ec.project_id = ${projectId}
      ORDER BY ec.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await organizerDB.queryRow`
      SELECT COUNT(*) as count FROM event_communications WHERE project_id = ${projectId}
    `;

    return {
      communications: communications.map(comm => ({
        id: comm.id,
        projectId: comm.project_id,
        communicationType: comm.communication_type as any,
        recipientType: comm.recipient_type as any,
        subject: comm.subject,
        message: comm.message,
        scheduledTime: comm.scheduled_time,
        sentTime: comm.sent_time,
        status: comm.status as any,
        recipientCount: comm.recipient_count,
        deliveryCount: comm.delivery_count,
        openCount: comm.open_count,
        clickCount: comm.click_count,
        createdBy: comm.created_by,
        createdAt: comm.created_at,
        createdByName: comm.created_by_name,
        deliveryRate: comm.recipient_count > 0 ? (comm.delivery_count / comm.recipient_count) * 100 : 0,
        openRate: comm.delivery_count > 0 ? (comm.open_count / comm.delivery_count) * 100 : 0,
      })),
      total: total?.count || 0,
    };
  }
);

export interface SendBulkUpdateRequest {
  projectId: number;
  updateType: 'schedule_change' | 'venue_change' | 'general_update' | 'urgent_notice';
  title: string;
  message: string;
  recipientTypes: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: number;
}

// Sends bulk updates to multiple recipient types.
export const sendBulkUpdate = api<SendBulkUpdateRequest, { sent: number; failed: number }>(
  { expose: true, method: "POST", path: "/organizers/communications/bulk-update" },
  async (req) => {
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipientType of req.recipientTypes) {
      try {
        const communication = await createCommunication({
          projectId: req.projectId,
          communicationType: 'email',
          recipientType,
          subject: `[${req.priority.toUpperCase()}] ${req.title}`,
          message: req.message,
          createdBy: req.createdBy,
        });

        totalSent += communication.recipientCount;
      } catch (error) {
        console.error(`Failed to send bulk update to ${recipientType}:`, error);
        totalFailed++;
      }
    }

    // Create alert for urgent notices
    if (req.priority === 'urgent') {
      const project = await organizerDB.queryRow`
        SELECT organizer_id FROM event_projects WHERE id = ${req.projectId}
      `;

      if (project) {
        await organizerDB.exec`
          INSERT INTO event_alerts (
            organizer_id, project_id, alert_type, severity, title, message
          )
          VALUES (
            ${project.organizer_id}, ${req.projectId}, 'system', 'high',
            'Urgent Communication Sent', 
            'Urgent notice "${req.title}" has been sent to all stakeholders'
          )
        `;
      }
    }

    return { sent: totalSent, failed: totalFailed };
  }
);

export interface ScheduleReminderRequest {
  projectId: number;
  reminderType: 'event_day' | 'rehearsal' | 'setup' | 'custom';
  hoursBeforeEvent: number;
  customMessage?: string;
  recipientTypes: string[];
  createdBy: number;
}

// Schedules automated reminders.
export const scheduleReminder = api<ScheduleReminderRequest, EventCommunication>(
  { expose: true, method: "POST", path: "/organizers/communications/schedule-reminder" },
  async (req) => {
    // Get event date
    const project = await organizerDB.queryRow`
      SELECT ep.*, e.start_date
      FROM event_projects ep
      JOIN events e ON ep.event_id = e.id
      WHERE ep.id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const eventDate = new Date(project.start_date);
    const reminderTime = new Date(eventDate.getTime() - (req.hoursBeforeEvent * 60 * 60 * 1000));

    // Generate reminder message based on type
    let subject: string;
    let message: string;

    switch (req.reminderType) {
      case 'event_day':
        subject = `Event Day Reminder: ${project.project_name}`;
        message = `This is a reminder that the event "${project.project_name}" is happening today at ${eventDate.toLocaleTimeString()}. Please ensure you are prepared and arrive on time.`;
        break;
      case 'rehearsal':
        subject = `Rehearsal Reminder: ${project.project_name}`;
        message = `Reminder: Rehearsal for "${project.project_name}" is scheduled. Please arrive 30 minutes early for setup and preparation.`;
        break;
      case 'setup':
        subject = `Setup Reminder: ${project.project_name}`;
        message = `Setup time for "${project.project_name}" is approaching. Please coordinate with the team for equipment and venue preparation.`;
        break;
      case 'custom':
        subject = `Reminder: ${project.project_name}`;
        message = req.customMessage || 'This is a scheduled reminder for your upcoming event.';
        break;
    }

    // Create scheduled communication for each recipient type
    const communications = [];
    for (const recipientType of req.recipientTypes) {
      const communication = await createCommunication({
        projectId: req.projectId,
        communicationType: 'email',
        recipientType,
        subject,
        message,
        scheduledTime: reminderTime,
        createdBy: req.createdBy,
      });
      communications.push(communication);
    }

    return communications[0]; // Return first communication as representative
  }
);
