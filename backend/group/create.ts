import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { GroupBooking } from "./types";

export interface CreateGroupBookingRequest {
  eventId: number;
  organizerEmail: string;
  organizerName: string;
  groupName: string;
  estimatedSize: number;
  maxSize: number;
  seatingPreference: "together" | "scattered" | "no_preference";
  paymentMethod: "individual" | "organizer_pays";
}

// Create a new group booking
export const create = api<CreateGroupBookingRequest, GroupBooking>(
  { method: "POST", path: "/group-bookings", expose: true },
  async ({ eventId, organizerEmail, organizerName, groupName, estimatedSize, maxSize, seatingPreference, paymentMethod }) => {
    // Validate event exists
    const event = await db.queryRow`
      SELECT id, date FROM events WHERE id = ${eventId} AND status = 'published'
    `;

    if (!event) {
      throw APIError.notFound("Event not found or not published");
    }

    // Check if event is more than 48 hours away
    const eventDate = new Date(event.date);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 48) {
      throw APIError.failedPrecondition("Cannot create group bookings less than 48 hours before the event");
    }

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    // Calculate discount and complimentary tickets
    const { discountPercentage, complimentaryTickets } = calculateGroupBenefits(estimatedSize);

    // Set expiration to 48 hours before event
    const expiresAt = new Date(eventDate.getTime() - (48 * 60 * 60 * 1000));

    const groupBooking = await db.queryRow`
      INSERT INTO group_bookings (
        event_id, organizer_email, organizer_name, group_name, 
        estimated_size, max_size, invite_code, seating_preference, 
        payment_method, discount_percentage, complimentary_tickets, expires_at
      )
      VALUES (
        ${eventId}, ${organizerEmail}, ${organizerName}, ${groupName},
        ${estimatedSize}, ${maxSize}, ${inviteCode}, ${seatingPreference},
        ${paymentMethod}, ${discountPercentage}, ${complimentaryTickets}, ${expiresAt}
      )
      RETURNING *
    `;

    if (!groupBooking) {
      throw APIError.internal("Failed to create group booking");
    }

    // Add system message
    await db.exec`
      INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
      VALUES (${groupBooking.id}, 'system', 'System', 'Group booking created! Share the invite code ${inviteCode} with your group.', 'system')
    `;

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
    };
  }
);

function calculateGroupBenefits(size: number): { discountPercentage: number; complimentaryTickets: number } {
  let discountPercentage = 0;
  let complimentaryTickets = 0;

  if (size >= 20) {
    discountPercentage = 20;
    complimentaryTickets = Math.floor(size / 10);
  } else if (size >= 10) {
    discountPercentage = 15;
    complimentaryTickets = Math.floor(size / 10);
  } else if (size >= 5) {
    discountPercentage = 10;
  }

  return { discountPercentage, complimentaryTickets };
}
