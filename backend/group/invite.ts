import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";
import type { GroupInvitation } from "./types";

export interface SendInvitationsRequest {
  inviteCode: string;
  inviterEmail: string;
  inviterName: string;
  invitations: Array<{
    email: string;
    name?: string;
  }>;
}

// Send invitations to join a group booking
export const sendInvitations = api<SendInvitationsRequest, { sent: number; skipped: number }>(
  { method: "POST", path: "/group-bookings/invite", expose: true },
  async ({ inviteCode, inviterEmail, inviterName, invitations }) => {
    // Get group booking
    const groupBooking = await db.queryRow`
      SELECT gb.*, e.name as event_name, e.date as event_date
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      WHERE gb.invite_code = ${inviteCode} AND gb.status = 'active'
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found or not active");
    }

    // Verify inviter is the organizer or existing member
    const isOrganizer = groupBooking.organizer_email === inviterEmail;
    const isMember = !isOrganizer && await db.queryRow`
      SELECT 1 FROM group_booking_members 
      WHERE group_booking_id = ${groupBooking.id} AND email = ${inviterEmail}
    `;

    if (!isOrganizer && !isMember) {
      throw APIError.permissionDenied("Only group organizer or members can send invitations");
    }

    let sent = 0;
    let skipped = 0;

    await using tx = await db.begin();

    try {
      for (const invitation of invitations) {
        // Check if already invited or member
        const existing = await tx.queryRow`
          SELECT 1 FROM group_invitations 
          WHERE group_booking_id = ${groupBooking.id} AND email = ${invitation.email}
          UNION
          SELECT 1 FROM group_booking_members 
          WHERE group_booking_id = ${groupBooking.id} AND email = ${invitation.email}
        `;

        if (existing) {
          skipped++;
          continue;
        }

        // Create invitation
        await tx.exec`
          INSERT INTO group_invitations (group_booking_id, email, name, invited_by)
          VALUES (${groupBooking.id}, ${invitation.email}, ${invitation.name}, ${inviterEmail})
        `;

        // Send email invitation
        await notification.sendGroupInvitation({
          recipientEmail: invitation.email,
          recipientName: invitation.name || invitation.email,
          inviterName,
          groupName: groupBooking.group_name,
          eventName: groupBooking.event_name,
          eventDate: groupBooking.event_date,
          inviteCode,
        });

        sent++;
      }

      // Add chat message
      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${inviterEmail}, ${inviterName}, 'Invited ${sent} new people to join the group!', 'system')
      `;

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    return { sent, skipped };
  }
);

export interface RespondToInvitationRequest {
  inviteCode: string;
  email: string;
  response: "accept" | "decline";
}

// Respond to a group booking invitation
export const respondToInvitation = api<RespondToInvitationRequest, { success: boolean }>(
  { method: "POST", path: "/group-bookings/respond", expose: true },
  async ({ inviteCode, email, response }) => {
    await using tx = await db.begin();

    try {
      // Get invitation
      const invitation = await tx.queryRow`
        SELECT gi.*, gb.group_name, gb.organizer_name
        FROM group_invitations gi
        JOIN group_bookings gb ON gi.group_booking_id = gb.id
        WHERE gb.invite_code = ${inviteCode} AND gi.email = ${email} AND gi.status = 'pending'
      `;

      if (!invitation) {
        throw APIError.notFound("Invitation not found or already responded");
      }

      // Update invitation status
      await tx.exec`
        UPDATE group_invitations 
        SET status = ${response === 'accept' ? 'accepted' : 'declined'}, responded_at = NOW()
        WHERE id = ${invitation.id}
      `;

      // Add chat message
      const message = response === 'accept' 
        ? `${email} accepted the invitation!`
        : `${email} declined the invitation.`;

      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${invitation.group_booking_id}, 'system', 'System', ${message}, 'system')
      `;

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    return { success: true };
  }
);

export interface SendRemindersRequest {
  inviteCode: string;
  organizerEmail: string;
}

// Send reminders to people who haven't booked yet
export const sendReminders = api<SendRemindersRequest, { sent: number }>(
  { method: "POST", path: "/group-bookings/remind", expose: true },
  async ({ inviteCode, organizerEmail }) => {
    // Get group booking
    const groupBooking = await db.queryRow`
      SELECT gb.*, e.name as event_name, e.date as event_date
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      WHERE gb.invite_code = ${inviteCode} AND gb.organizer_email = ${organizerEmail}
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found or you're not the organizer");
    }

    // Get people who accepted invitations but haven't booked
    const pendingMembers = await db.queryAll`
      SELECT gi.email, gi.name
      FROM group_invitations gi
      WHERE gi.group_booking_id = ${groupBooking.id} 
        AND gi.status = 'accepted'
        AND NOT EXISTS (
          SELECT 1 FROM group_booking_members gbm 
          WHERE gbm.group_booking_id = gi.group_booking_id AND gbm.email = gi.email
        )
    `;

    let sent = 0;

    for (const member of pendingMembers) {
      await notification.sendGroupReminder({
        recipientEmail: member.email,
        recipientName: member.name || member.email,
        organizerName: groupBooking.organizer_name,
        groupName: groupBooking.group_name,
        eventName: groupBooking.event_name,
        eventDate: groupBooking.event_date,
        inviteCode,
      });
      sent++;
    }

    // Add chat message
    if (sent > 0) {
      await db.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${organizerEmail}, ${groupBooking.organizer_name}, 'Sent reminders to ${sent} people who haven''t booked yet.', 'reminder')
      `;
    }

    return { sent };
  }
);
