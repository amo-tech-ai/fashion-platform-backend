import { api, APIError } from "encore.dev/api";
import { db } from "./db";

export interface LockGroupBookingRequest {
  inviteCode: string;
  organizerEmail: string;
}

// Lock group booking (no more changes allowed)
export const lockGroupBooking = api<LockGroupBookingRequest, { success: boolean }>(
  { method: "POST", path: "/group-bookings/lock", expose: true },
  async ({ inviteCode, organizerEmail }) => {
    await using tx = await db.begin();

    try {
      // Get group booking
      const groupBooking = await tx.queryRow`
        SELECT * FROM group_bookings 
        WHERE invite_code = ${inviteCode} 
          AND organizer_email = ${organizerEmail}
          AND status = 'active'
      `;

      if (!groupBooking) {
        throw APIError.notFound("Group booking not found or you're not the organizer");
      }

      // Update status
      await tx.exec`
        UPDATE group_bookings 
        SET status = 'locked', locked_at = NOW()
        WHERE id = ${groupBooking.id}
      `;

      // Add chat message
      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${organizerEmail}, ${groupBooking.organizer_name}, 'Group booking has been locked. No more changes allowed.', 'system')
      `;

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    return { success: true };
  }
);

export interface GetGroupCheckInParams {
  inviteCode: string;
}

export interface GroupCheckInInfo {
  groupName: string;
  eventName: string;
  eventDate: Date;
  venue: string;
  totalMembers: number;
  checkedInMembers: number;
  members: Array<{
    name: string;
    email: string;
    quantity: number;
    bookingCode: string;
    checkedIn: boolean;
  }>;
}

// Get group check-in information
export const getGroupCheckIn = api<GetGroupCheckInParams, GroupCheckInInfo>(
  { method: "GET", path: "/group-bookings/checkin/:inviteCode", expose: true },
  async ({ inviteCode }) => {
    // Get group booking with event details
    const groupBooking = await db.queryRow`
      SELECT gb.*, e.name as event_name, e.date as event_date, e.venue
      FROM group_bookings gb
      JOIN events e ON gb.event_id = e.id
      WHERE gb.invite_code = ${inviteCode}
    `;

    if (!groupBooking) {
      throw APIError.notFound("Group booking not found");
    }

    // Get members with booking details
    const members = await db.queryAll`
      SELECT 
        gbm.name,
        gbm.email,
        gbm.quantity,
        b.booking_code,
        CASE WHEN b.status = 'checked_in' THEN true ELSE false END as checked_in
      FROM group_booking_members gbm
      JOIN bookings b ON gbm.booking_id = b.id
      WHERE gbm.group_booking_id = ${groupBooking.id}
      ORDER BY gbm.name
    `;

    const checkedInCount = members.filter(m => m.checked_in).length;

    return {
      groupName: groupBooking.group_name,
      eventName: groupBooking.event_name,
      eventDate: groupBooking.event_date,
      venue: groupBooking.venue,
      totalMembers: members.length,
      checkedInMembers: checkedInCount,
      members: members.map(member => ({
        name: member.name,
        email: member.email,
        quantity: member.quantity,
        bookingCode: member.booking_code,
        checkedIn: member.checked_in,
      })),
    };
  }
);

export interface AssignSeatingRequest {
  inviteCode: string;
  organizerEmail: string;
  assignments: Array<{
    bookingId: number;
    section?: string;
    rowNumber?: string;
    seatNumber?: string;
  }>;
}

// Assign seating for group members
export const assignSeating = api<AssignSeatingRequest, { success: boolean; assigned: number }>(
  { method: "POST", path: "/group-bookings/seating", expose: true },
  async ({ inviteCode, organizerEmail, assignments }) => {
    await using tx = await db.begin();

    try {
      // Get group booking
      const groupBooking = await tx.queryRow`
        SELECT * FROM group_bookings 
        WHERE invite_code = ${inviteCode} AND organizer_email = ${organizerEmail}
      `;

      if (!groupBooking) {
        throw APIError.notFound("Group booking not found or you're not the organizer");
      }

      let assigned = 0;

      for (const assignment of assignments) {
        // Verify booking belongs to this group
        const member = await tx.queryRow`
          SELECT 1 FROM group_booking_members 
          WHERE group_booking_id = ${groupBooking.id} AND booking_id = ${assignment.bookingId}
        `;

        if (!member) {
          continue; // Skip invalid bookings
        }

        // Delete existing assignment
        await tx.exec`
          DELETE FROM group_seating_assignments 
          WHERE group_booking_id = ${groupBooking.id} AND booking_id = ${assignment.bookingId}
        `;

        // Insert new assignment
        await tx.exec`
          INSERT INTO group_seating_assignments (group_booking_id, booking_id, section, row_number, seat_number)
          VALUES (${groupBooking.id}, ${assignment.bookingId}, ${assignment.section}, ${assignment.rowNumber}, ${assignment.seatNumber})
        `;

        assigned++;
      }

      // Add chat message
      await tx.exec`
        INSERT INTO group_chat_messages (group_booking_id, sender_email, sender_name, message, message_type)
        VALUES (${groupBooking.id}, ${organizerEmail}, ${groupBooking.organizer_name}, 'Seating assignments updated for ${assigned} members.', 'system')
      `;

      await tx.commit();

      return { success: true, assigned };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
