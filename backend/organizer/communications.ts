import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";

export interface SendEventUpdateRequest {
  organizerId: number;
  eventId: number;
  updateType: 'general' | 'schedule_change' | 'venue_change' | 'cancellation' | 'important_info';
  subject: string;
  message: string;
  sendToAll: boolean;
  targetAudience?: 'all_attendees' | 'vip_only' | 'general_only' | 'specific_tiers';
  specificTiers?: string[];
  scheduledFor?: Date;
  includeEventDetails: boolean;
}

export interface CommunicationTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationHistory {
  id: number;
  eventId: number;
  type: string;
  subject: string;
  message: string;
  recipientCount: number;
  sentAt: Date;
  openRate?: number;
  clickRate?: number;
  status: 'sent' | 'scheduled' | 'failed' | 'cancelled';
}

export interface EventUpdateResponse {
  messageId: string;
  recipientCount: number;
  estimatedDelivery: Date;
  status: 'sent' | 'scheduled';
}

// Send event update to attendees
export const sendEventUpdate = api<SendEventUpdateRequest, EventUpdateResponse>(
  { method: "POST", path: "/organizer/communications/send-update" },
  async ({ 
    organizerId, 
    eventId, 
    updateType, 
    subject, 
    message, 
    sendToAll, 
    targetAudience = 'all_attendees',
    specificTiers,
    scheduledFor,
    includeEventDetails 
  }) => {
    // Verify organizer owns the event
    const event = await db.queryRow`
      SELECT * FROM events 
      WHERE id = ${eventId} AND organizer_id = ${organizerId}
    `;

    if (!event) {
      throw APIError.notFound("Event not found or access denied");
    }

    // Build recipient query based on target audience
    let recipientQuery = `
      SELECT DISTINCT b.customer_email, b.customer_name, t.name as tier_name
      FROM bookings b
      JOIN event_ticket_tiers t ON b.ticket_tier_id = t.id
      WHERE b.event_id = $1 AND b.status = 'confirmed'
    `;
    const queryParams: any[] = [eventId];

    if (!sendToAll && targetAudience !== 'all_attendees') {
      switch (targetAudience) {
        case 'vip_only':
          recipientQuery += ` AND LOWER(t.name) LIKE '%vip%'`;
          break;
        case 'general_only':
          recipientQuery += ` AND LOWER(t.name) LIKE '%general%'`;
          break;
        case 'specific_tiers':
          if (specificTiers && specificTiers.length > 0) {
            recipientQuery += ` AND t.name = ANY($2)`;
            queryParams.push(specificTiers);
          }
          break;
      }
    }

    const recipients = await db.rawQueryAll(recipientQuery, ...queryParams);

    if (recipients.length === 0) {
      throw APIError.invalidArgument("No recipients found for the specified criteria");
    }

    // Generate message ID
    const messageId = `msg_${Date.now()}_${eventId}`;

    // Prepare message content
    let fullMessage = message;
    
    if (includeEventDetails) {
      const eventDetails = `
        
        Event Details:
        • Event: ${event.name}
        • Date: ${new Date(event.date).toLocaleDateString()}
        • Venue: ${event.venue}
        • Capacity: ${event.capacity}
      `;
      fullMessage += eventDetails;
    }

    // Determine delivery time
    const deliveryTime = scheduledFor || new Date();
    const isScheduled = scheduledFor && scheduledFor > new Date();

    // Store communication record
    await db.exec`
      INSERT INTO organizer_communications (
        event_id, organizer_id, message_id, type, subject, message, 
        recipient_count, scheduled_for, status, created_at
      )
      VALUES (
        ${eventId}, ${organizerId}, ${messageId}, ${updateType}, ${subject}, 
        ${fullMessage}, ${recipients.length}, ${deliveryTime}, 
        ${isScheduled ? 'scheduled' : 'sent'}, NOW()
      )
    `;

    // Send notifications (in real app, this would be queued for scheduled delivery)
    if (!isScheduled) {
      for (const recipient of recipients) {
        // Mock sending - in real app would use email service
        console.log(`Sending update to ${recipient.customer_email}: ${subject}`);
        
        // You could call notification service here
        // await notification.sendEventUpdate({
        //   recipientEmail: recipient.customer_email,
        //   recipientName: recipient.customer_name,
        //   subject,
        //   message: fullMessage,
        //   eventName: event.name,
        //   eventDate: event.date,
        // });
      }
    }

    return {
      messageId,
      recipientCount: recipients.length,
      estimatedDelivery: deliveryTime,
      status: isScheduled ? 'scheduled' : 'sent',
    };
  }
);

// Get communication templates
export const getTemplates = api<{ organizerId: number }, { templates: CommunicationTemplate[] }>(
  { method: "GET", path: "/organizer/communications/templates" },
  async ({ organizerId }) => {
    // In a real app, you'd have user-specific templates
    const defaultTemplates: CommunicationTemplate[] = [
      {
        id: 1,
        name: "Event Reminder",
        type: "reminder",
        subject: "Don't forget: {{eventName}} is tomorrow!",
        content: "Hi {{customerName}},\n\nThis is a friendly reminder that {{eventName}} is happening tomorrow at {{eventTime}}.\n\nVenue: {{venue}}\nYour tickets: {{ticketDetails}}\n\nWe can't wait to see you there!\n\nBest regards,\nThe Event Team",
        variables: ["eventName", "customerName", "eventTime", "venue", "ticketDetails"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Schedule Change",
        type: "schedule_change",
        subject: "Important: Schedule change for {{eventName}}",
        content: "Dear {{customerName}},\n\nWe need to inform you of an important schedule change for {{eventName}}.\n\nNew Date/Time: {{newDateTime}}\nVenue: {{venue}}\n\nWe apologize for any inconvenience this may cause. If you cannot attend the new date, please contact us for a full refund.\n\nThank you for your understanding.\n\nBest regards,\nThe Event Team",
        variables: ["eventName", "customerName", "newDateTime", "venue"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: "Venue Change",
        type: "venue_change",
        subject: "Venue update for {{eventName}}",
        content: "Hello {{customerName}},\n\nWe have an important update regarding the venue for {{eventName}}.\n\nNew Venue: {{newVenue}}\nAddress: {{newAddress}}\nDate/Time: {{eventDateTime}} (unchanged)\n\nThe new venue offers even better facilities and we're excited to host you there!\n\nBest regards,\nThe Event Team",
        variables: ["eventName", "customerName", "newVenue", "newAddress", "eventDateTime"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 4,
        name: "Event Cancellation",
        type: "cancellation",
        subject: "Event Cancellation: {{eventName}}",
        content: "Dear {{customerName}},\n\nWe regret to inform you that {{eventName}} scheduled for {{eventDate}} has been cancelled due to {{reason}}.\n\nFull refunds will be processed automatically within 5-7 business days to your original payment method.\n\nWe sincerely apologize for any inconvenience caused and appreciate your understanding.\n\nBest regards,\nThe Event Team",
        variables: ["eventName", "customerName", "eventDate", "reason"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 5,
        name: "Thank You Message",
        type: "thank_you",
        subject: "Thank you for attending {{eventName}}!",
        content: "Hi {{customerName}},\n\nThank you for attending {{eventName}}! We hope you had an amazing experience.\n\nWe'd love to hear your feedback. Please take a moment to rate your experience: {{feedbackLink}}\n\nStay tuned for our upcoming events - we have some exciting shows planned!\n\nBest regards,\nThe Event Team",
        variables: ["eventName", "customerName", "feedbackLink"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return { templates: defaultTemplates };
  }
);

// Get communication history
export const getCommunicationHistory = api<{ organizerId: number; eventId?: number }, { communications: CommunicationHistory[] }>(
  { method: "GET", path: "/organizer/communications/history" },
  async ({ organizerId, eventId }) => {
    let query = `
      SELECT 
        oc.*,
        e.name as event_name
      FROM organizer_communications oc
      JOIN events e ON oc.event_id = e.id
      WHERE oc.organizer_id = $1
    `;
    const params: any[] = [organizerId];

    if (eventId) {
      query += ` AND oc.event_id = $2`;
      params.push(eventId);
    }

    query += ` ORDER BY oc.created_at DESC LIMIT 50`;

    const communications = await db.rawQueryAll(query, ...params);

    return {
      communications: communications.map(comm => ({
        id: comm.id,
        eventId: comm.event_id,
        type: comm.type,
        subject: comm.subject,
        message: comm.message,
        recipientCount: comm.recipient_count,
        sentAt: comm.scheduled_for,
        openRate: Math.random() * 100, // Mock data
        clickRate: Math.random() * 50, // Mock data
        status: comm.status,
      })),
    };
  }
);

export interface CreateTemplateRequest {
  organizerId: number;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
}

// Create communication template
export const createTemplate = api<CreateTemplateRequest, CommunicationTemplate>(
  { method: "POST", path: "/organizer/communications/templates" },
  async ({ organizerId, name, type, subject, content, variables }) => {
    const template = await db.queryRow`
      INSERT INTO communication_templates (organizer_id, name, type, subject, content, variables)
      VALUES (${organizerId}, ${name}, ${type}, ${subject}, ${content}, ${JSON.stringify(variables)})
      RETURNING *
    `;

    if (!template) {
      throw APIError.internal("Failed to create template");
    }

    return {
      id: template.id,
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  }
);

export interface BulkEmailRequest {
  organizerId: number;
  eventIds: number[];
  subject: string;
  message: string;
  targetAudience: 'all_attendees' | 'vip_only' | 'general_only';
  includeUnsubscribeLink: boolean;
}

// Send bulk email to multiple events
export const sendBulkEmail = api<BulkEmailRequest, { messageIds: string[]; totalRecipients: number }>(
  { method: "POST", path: "/organizer/communications/bulk-email" },
  async ({ organizerId, eventIds, subject, message, targetAudience, includeUnsubscribeLink }) => {
    const messageIds: string[] = [];
    let totalRecipients = 0;

    for (const eventId of eventIds) {
      // Verify organizer owns the event
      const event = await db.queryRow`
        SELECT * FROM events 
        WHERE id = ${eventId} AND organizer_id = ${organizerId}
      `;

      if (!event) continue; // Skip events not owned by organizer

      // Get recipients for this event
      let recipientQuery = `
        SELECT DISTINCT b.customer_email, b.customer_name, t.name as tier_name
        FROM bookings b
        JOIN event_ticket_tiers t ON b.ticket_tier_id = t.id
        WHERE b.event_id = $1 AND b.status = 'confirmed'
      `;

      if (targetAudience === 'vip_only') {
        recipientQuery += ` AND LOWER(t.name) LIKE '%vip%'`;
      } else if (targetAudience === 'general_only') {
        recipientQuery += ` AND LOWER(t.name) LIKE '%general%'`;
      }

      const recipients = await db.rawQueryAll(recipientQuery, eventId);
      
      if (recipients.length === 0) continue;

      const messageId = `bulk_${Date.now()}_${eventId}`;
      messageIds.push(messageId);
      totalRecipients += recipients.length;

      // Prepare message with unsubscribe link if requested
      let fullMessage = message;
      if (includeUnsubscribeLink) {
        fullMessage += `\n\n---\nTo unsubscribe from future emails, click here: [Unsubscribe Link]`;
      }

      // Store communication record
      await db.exec`
        INSERT INTO organizer_communications (
          event_id, organizer_id, message_id, type, subject, message, 
          recipient_count, scheduled_for, status, created_at
        )
        VALUES (
          ${eventId}, ${organizerId}, ${messageId}, 'bulk_email', ${subject}, 
          ${fullMessage}, ${recipients.length}, NOW(), 'sent', NOW()
        )
      `;

      // Send emails (mock)
      for (const recipient of recipients) {
        console.log(`Bulk email to ${recipient.customer_email}: ${subject}`);
      }
    }

    return {
      messageIds,
      totalRecipients,
    };
  }
);
