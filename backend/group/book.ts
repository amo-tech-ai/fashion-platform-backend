import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { booking } from "~encore/clients";
import type { GroupBookingMember } from "./types";

export interface JoinGroupBookingRequest {
  inviteCode: string;
  ticketTierId: number;
  quantity: number;
  customerEmail: string;
  customerName: string;
}

export interface GroupBookingResult {
  bookingCode: string;
  discountApplied: number;
  finalAmount: number;
  isComplimentary: boolean;
  groupBookingId: number;
}

// Join a group booking by purchasing tickets
export const joinGroupBooking = api<JoinGroupBookingRequest, GroupBookingResult>(
  { method: "POST", path: "/group-bookings/join", expose: true },
  async ({ inviteCode, ticketTierId, quantity, customerEmail, customerName }) => {
    await using tx = await db.begin();

    try {
      // Get group booking with event details
      const groupBooking = await tx.queryRow`
        SELECT gb.*, e.date as event_date
        FROM group_bookings gb
        JOIN events e ON gb.event_id = e.id
        WHERE gb.invite_code = ${inviteCode} AND gb.status = 'active'
      `;

      if (!groupBooking) {
        throw APIError.notFound("Group booking not found or not active");
      }

      // Check if user already joined
      const existingMember = await tx.queryRow`
        SELECT 1 FROM group_booking_members 
        WHERE group_booking_id = ${groupBooking.id} AND email = ${customerEmail}
      `;

      if (existingMember) {
        throw APIError.alreadyExists("You have already joined this group booking");
      }

      // Check capacity
      const currentMembers = await tx.queryRow`
        SELECT COALESCE(SUM(quantity), 0) as total_booked
        FROM group_booking_members 
        WHERE group_booking_id = ${groupBooking.id}
      `;

      const totalBooked = currentMembers?.total_booked || 0;
      if (totalBooked + quantity > groupBooking.max_size) {
        throw APIError.resourceExhausted("Not enough slots remaining in the group");
      }

      // Get ticket tier details
      const ticketTier = await tx.queryRow`
        SELECT * FROM event_ticket_tiers 
        WHERE id = ${ticketTierId} AND event_id = ${groupBooking.event_id}
      `;

      if (!ticketTier) {
        throw APIError.notFound("Ticket tier not found");
      }

      // Calculate pricing
      const baseAmount = ticketTier.price * quantity;
      const discountAmount = (baseAmount * groupBooking.discount_percentage) / 100;
      const finalAmount = baseAmount - discountAmount;

      // Check if this should be complimentary
      const usedComplimentary = await tx.queryRow`
        SELECT COALESCE(SUM(quantity), 0) as used
        FROM group_booking_members 
        WHERE group_booking_id = ${groupBooking.id} AND is_complimentary = true
      `;

      const remainingComplimentary = groupBooking.complimentary_tickets - (usedComplimentary?.used || 0);
      const isComplimentary = remainingComplimentary >= quantity;
      const actualAmount = isComplimentary ? 0 : finalAmount;

      // Create the booking
      const bookingResult = await booking.book({
        eventId: groupBooking.event_id,
        ticketTierId,
        quantity,
        customerEmail,
        customerName,
      });

      // Update the booking with group information
      await tx.exec`
        UPDATE bookings 
        SET group_booking_id = ${groupBooking.id}, total_amount = ${actualAmount}
        WHERE booking_code = ${bookingResult.bookingCode}
      `;

      // Add to group booking members
      await tx.exec`
        INSERT INTO group_booking_members (
          group_booking_id, booking_id, email, name, ticket_tier_id, 
          quantity, amount_paid, discount_applied, is_complimentary
        )
        VALUES (
          ${groupBooking.id}, ${bookingResult.id}, ${customerEmail}, ${customerName}, 
          ${ticketTierId}, ${quantity}, ${actualAmount}, ${discountAmount}, ${isComplimentary}
        )
      `;

      // Add chat message
      const message = isComplimentary 
        ? `${customerName} joined with ${quantity} complimentary tickets!`
        : `${customerName} joined with ${quantity} tickets (${groupBooking.discount_percentage}% group discount applied)!`;

      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${customerEmail}, ${customerName}, ${message}, 'system')
      `;

      // Update invitation status if exists
      await tx.exec`
        UPDATE group_invitations 
        SET status = 'accepted', responded_at = NOW()
        WHERE group_booking_id = ${groupBooking.id} AND email = ${customerEmail} AND status = 'pending'
      `;

      await tx.commit();

      return {
        bookingCode: bookingResult.bookingCode,
        discountApplied: discountAmount,
        finalAmount: actualAmount,
        isComplimentary,
        groupBookingId: groupBooking.id,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface UpdateGroupSizeRequest {
  inviteCode: string;
  organizerEmail: string;
  newMaxSize: number;
}

// Update group size (only allowed until 48 hours before event)
export const updateGroupSize = api<UpdateGroupSizeRequest, { success: boolean; newBenefits: { discountPercentage: number; complimentaryTickets: number } }>(
  { method: "PUT", path: "/group-bookings/size", expose: true },
  async ({ inviteCode, organizerEmail, newMaxSize }) => {
    await using tx = await db.begin();

    try {
      // Get group booking
      const groupBooking = await tx.queryRow`
        SELECT gb.*, e.date as event_date
        FROM group_bookings gb
        JOIN events e ON gb.event_id = e.id
        WHERE gb.invite_code = ${inviteCode} 
          AND gb.organizer_email = ${organizerEmail}
          AND gb.status = 'active'
      `;

      if (!groupBooking) {
        throw APIError.notFound("Group booking not found or you're not the organizer");
      }

      // Check if within 48 hours of event
      const eventDate = new Date(groupBooking.event_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEvent < 48) {
        throw APIError.failedPrecondition("Cannot change group size within 48 hours of the event");
      }

      // Check current bookings
      const currentBookings = await tx.queryRow`
        SELECT COALESCE(SUM(quantity), 0) as total_booked
        FROM group_booking_members 
        WHERE group_booking_id = ${groupBooking.id}
      `;

      if (newMaxSize < (currentBookings?.total_booked || 0)) {
        throw APIError.invalidArgument("New size cannot be smaller than current bookings");
      }

      // Calculate new benefits
      const newBenefits = calculateGroupBenefits(newMaxSize);

      // Update group booking
      await tx.exec`
        UPDATE group_bookings 
        SET max_size = ${newMaxSize}, 
            discount_percentage = ${newBenefits.discountPercentage},
            complimentary_tickets = ${newBenefits.complimentaryTickets}
        WHERE id = ${groupBooking.id}
      `;

      // Add chat message
      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${organizerEmail}, ${groupBooking.organizer_name}, 'Group size updated to ${newMaxSize}. New discount: ${newBenefits.discountPercentage}%', 'system')
      `;

      await tx.commit();

      return {
        success: true,
        newBenefits,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
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
