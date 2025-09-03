import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { GroupBooking, GroupInvitation, GroupBookingMember, GroupChatMessage } from "./types";

export interface GetGroupBookingParams {
  inviteCode: string;
}

export interface GroupBookingDetails extends GroupBooking {
  eventName: string;
  eventDate: Date;
  venue: string;
  invitations: GroupInvitation[];
  members: (GroupBookingMember & { ticketTierName: string })[];
  chatMessages: GroupChatMessage[];
  totalBooked: number;
  totalPaid: number;
  remainingSlots: number;
  canStillJoin: boolean;
}

// Get group booking details by invite code
export const get = api<GetGroupBookingParams, GroupBookingDetails>(
  { method: "GET", path: "/group-bookings/:inviteCode", expose: true },
  async ({ inviteCode }) => {
    // Get group booking with event details
    const groupBooking = await db.queryRow`
      SELECT 
        gb.*,
        e.name as event_name,
        e.date as event_date,
        e.venue
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      WHERE gb.invite_code = ${inviteCode}
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found");
    }

    // Check if group booking has expired
    const now = new Date();
    if (groupBooking.expires_at && now > new Date(groupBooking.expires_at)) {
      await db.exec`
        UPDATE group_bookings 
        SET status = 'cancelled' 
        WHERE id = ${groupBooking.id} AND status = 'active'
      `;
      groupBooking.status = 'cancelled';
    }

    // Get invitations
    const invitations = await db.queryAll`
      SELECT * FROM group_invitations 
      WHERE group_booking_id = ${groupBooking.id}
      ORDER BY invited_at DESC
    `;

    // Get members with ticket tier info
    const members = await db.queryAll`
      SELECT 
        gbm.*,
        ett.name as ticket_tier_name
      FROM group_booking_members gbm
      JOIN event_ticket_tiers ett ON gbm.ticket_tier_id = ett.id
      WHERE gbm.group_booking_id = ${groupBooking.id}
      ORDER BY gbm.joined_at ASC
    `;

    // Get chat messages
    const chatMessages = await db.queryAll`
      SELECT * FROM group_chat_messages 
      WHERE group_booking_id = ${groupBooking.id}
      ORDER BY created_at ASC
    `;

    const totalBooked = members.reduce((sum, member) => sum + member.quantity, 0);
    const totalPaid = members.reduce((sum, member) => sum + member.amount_paid, 0);
    const remainingSlots = groupBooking.max_size - totalBooked;
    const canStillJoin = groupBooking.status === 'active' && remainingSlots > 0;

    return {
      id: groupBooking.id,
      eventId: groupBooking.event_id,
      organizerEmail: groupBooking.organizer_email,
      organizerName: groupBooking.organizer_name,
      groupName: groupBooking.group_name,
      estimatedSize: groupBooking.estimated_size,
      maxSize: groupBooking.max_size,
      inviteCode: groupBooking.invite_code,
      status: groupBooking.status as any,
      seatingPreference: groupBooking.seating_preference as any,
      paymentMethod: groupBooking.payment_method as any,
      discountPercentage: groupBooking.discount_percentage,
      complimentaryTickets: groupBooking.complimentary_tickets,
      createdAt: groupBooking.created_at,
      lockedAt: groupBooking.locked_at,
      expiresAt: groupBooking.expires_at,
      eventName: groupBooking.event_name,
      eventDate: groupBooking.event_date,
      venue: groupBooking.venue,
      invitations: invitations.map(inv => ({
        id: inv.id,
        groupBookingId: inv.group_booking_id,
        email: inv.email,
        name: inv.name,
        invitedBy: inv.invited_by,
        status: inv.status as any,
        invitedAt: inv.invited_at,
        respondedAt: inv.responded_at,
      })),
      members: members.map(member => ({
        id: member.id,
        groupBookingId: member.group_booking_id,
        bookingId: member.booking_id,
        email: member.email,
        name: member.name,
        ticketTierId: member.ticket_tier_id,
        quantity: member.quantity,
        amountPaid: member.amount_paid,
        discountApplied: member.discount_applied,
        isComplimentary: member.is_complimentary,
        joinedAt: member.joined_at,
        ticketTierName: member.ticket_tier_name,
      })),
      chatMessages: chatMessages.map(msg => ({
        id: msg.id,
        groupBookingId: msg.group_booking_id,
        senderEmail: msg.sender_email,
        senderName: msg.sender_name,
        message: msg.message,
        messageType: msg.message_type as any,
        createdAt: msg.created_at,
      })),
      totalBooked,
      totalPaid,
      remainingSlots,
      canStillJoin,
    };
  }
);

export interface GetUserGroupBookingsParams {
  email: string;
}

export interface UserGroupBooking {
  id: number;
  groupName: string;
  eventName: string;
  eventDate: Date;
  venue: string;
  inviteCode: string;
  status: string;
  role: 'organizer' | 'member' | 'invited';
  totalBooked: number;
  maxSize: number;
}

// Get all group bookings for a user
export const getUserGroupBookings = api<GetUserGroupBookingsParams, { groupBookings: UserGroupBooking[] }>(
  { method: "GET", path: "/users/group-bookings", expose: true },
  async ({ email }) => {
    // Get group bookings where user is organizer
    const organizerBookings = await db.queryAll`
      SELECT 
        gb.id,
        gb.group_name,
        gb.invite_code,
        gb.status,
        gb.max_size,
        e.name as event_name,
        e.date as event_date,
        e.venue,
        'organizer' as role,
        COALESCE(member_count.total_booked, 0) as total_booked
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      LEFT JOIN (
        SELECT group_booking_id, SUM(quantity) as total_booked
        FROM group_booking_members
        GROUP BY group_booking_id
      ) member_count ON gb.id = member_count.group_booking_id
      WHERE gb.organizer_email = ${email}
      ORDER BY gb.created_at DESC
    `;

    // Get group bookings where user is a member
    const memberBookings = await db.queryAll`
      SELECT 
        gb.id,
        gb.group_name,
        gb.invite_code,
        gb.status,
        gb.max_size,
        e.name as event_name,
        e.date as event_date,
        e.venue,
        'member' as role,
        COALESCE(member_count.total_booked, 0) as total_booked
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      JOIN group_booking_members gbm ON gb.id = gbm.group_booking_id
      LEFT JOIN (
        SELECT group_booking_id, SUM(quantity) as total_booked
        FROM group_booking_members
        GROUP BY group_booking_id
      ) member_count ON gb.id = member_count.group_booking_id
      WHERE gbm.email = ${email} AND gb.organizer_email != ${email}
      ORDER BY gbm.joined_at DESC
    `;

    // Get group bookings where user is invited but hasn't joined
    const invitedBookings = await db.queryAll`
      SELECT 
        gb.id,
        gb.group_name,
        gb.invite_code,
        gb.status,
        gb.max_size,
        e.name as event_name,
        e.date as event_date,
        e.venue,
        'invited' as role,
        COALESCE(member_count.total_booked, 0) as total_booked
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      JOIN group_invitations gi ON gb.id = gi.group_booking_id
      LEFT JOIN (
        SELECT group_booking_id, SUM(quantity) as total_booked
        FROM group_booking_members
        GROUP BY group_booking_id
      ) member_count ON gb.id = member_count.group_booking_id
      WHERE gi.email = ${email} 
        AND gi.status = 'pending'
        AND gb.organizer_email != ${email}
        AND NOT EXISTS (
          SELECT 1 FROM group_booking_members gbm 
          WHERE gbm.group_booking_id = gb.id AND gbm.email = ${email}
        )
      ORDER BY gi.invited_at DESC
    `;

    const allBookings = [...organizerBookings, ...memberBookings, ...invitedBookings];

    return {
      groupBookings: allBookings.map(booking => ({
        id: booking.id,
        groupName: booking.group_name,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        venue: booking.venue,
        inviteCode: booking.invite_code,
        status: booking.status,
        role: booking.role as any,
        totalBooked: booking.total_booked,
        maxSize: booking.max_size,
      })),
    };
  }
);
