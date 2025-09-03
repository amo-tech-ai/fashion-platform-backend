import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { GroupChatMessage } from "./types";

export interface SendMessageRequest {
  inviteCode: string;
  senderEmail: string;
  senderName: string;
  message: string;
}

// Send a message to the group chat
export const sendMessage = api<SendMessageRequest, GroupChatMessage>(
  { method: "POST", path: "/group-bookings/chat", expose: true },
  async ({ inviteCode, senderEmail, senderName, message }) => {
    // Get group booking
    const groupBooking = await db.queryRow`
      SELECT id FROM group_bookings 
      WHERE invite_code = ${inviteCode} AND status = 'active'
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found or not active");
    }

    // Verify sender is organizer or member
    const isAuthorized = await db.queryRow`
      SELECT 1 FROM group_bookings 
      WHERE id = ${groupBooking.id} AND organizer_email = ${senderEmail}
      UNION
      SELECT 1 FROM group_booking_members 
      WHERE group_booking_id = ${groupBooking.id} AND email = ${senderEmail}
      UNION
      SELECT 1 FROM group_invitations 
      WHERE group_booking_id = ${groupBooking.id} AND email = ${senderEmail} AND status = 'accepted'
    `;

    if (!isAuthorized) {
      throw APIError.permissionDenied("Only group organizer, members, or invited users can send messages");
    }

    // Insert message
    const chatMessage = await db.queryRow`
      INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
      VALUES (${groupBooking.id}, ${senderEmail}, ${senderName}, ${message}, 'text')
      RETURNING *
    `;

    if (!chatMessage) {
      throw APIError.internal("Failed to send message");
    }

    return {
      id: chatMessage.id,
      groupBookingId: chatMessage.group_booking_id,
      senderEmail: chatMessage.sender_email,
      senderName: chatMessage.sender_name,
      message: chatMessage.message,
      messageType: chatMessage.message_type as any,
      createdAt: chatMessage.created_at,
    };
  }
);

export interface GetChatMessagesParams {
  inviteCode: string;
  userEmail: string;
  limit?: number;
  offset?: number;
}

// Get chat messages for a group
export const getChatMessages = api<GetChatMessagesParams, { messages: GroupChatMessage[]; total: number }>(
  { method: "GET", path: "/group-bookings/chat/:inviteCode", expose: true },
  async ({ inviteCode, userEmail, limit = 50, offset = 0 }) => {
    // Get group booking
    const groupBooking = await db.queryRow`
      SELECT id FROM group_bookings 
      WHERE invite_code = ${inviteCode}
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found");
    }

    // Verify user has access
    const hasAccess = await db.queryRow`
      SELECT 1 FROM group_bookings 
      WHERE id = ${groupBooking.id} AND organizer_email = ${userEmail}
      UNION
      SELECT 1 FROM group_booking_members 
      WHERE group_booking_id = ${groupBooking.id} AND email = ${userEmail}
      UNION
      SELECT 1 FROM group_invitations 
      WHERE group_booking_id = ${groupBooking.id} AND email = ${userEmail}
    `;

    if (!hasAccess) {
      throw APIError.permissionDenied("You don't have access to this group chat");
    }

    // Get messages
    const messages = await db.queryAll`
      SELECT * FROM group_chat_messages 
      WHERE group_booking_id = ${groupBooking.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const totalResult = await db.queryRow`
      SELECT COUNT(*) as total FROM group_chat_messages 
      WHERE group_booking_id = ${groupBooking.id}
    `;

    return {
      messages: messages.reverse().map(msg => ({
        id: msg.id,
        groupBookingId: msg.group_booking_id,
        senderEmail: msg.sender_email,
        senderName: msg.sender_name,
        message: msg.message,
        messageType: msg.message_type as any,
        createdAt: msg.created_at,
      })),
      total: totalResult?.total || 0,
    };
  }
);
