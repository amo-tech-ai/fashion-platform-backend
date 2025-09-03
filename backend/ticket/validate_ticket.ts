import { api, APIError } from "encore.dev/api";
import { ticketDB } from "./db";
import type { Ticket } from "./types";

export interface ValidateTicketParams {
  qrCode: string;
}

export interface ValidateTicketResponse {
  ticket: Ticket;
  isValid: boolean;
  message: string;
}

// Validates a ticket by QR code and marks it as used.
export const validateTicket = api<ValidateTicketParams, ValidateTicketResponse>(
  { expose: true, method: "POST", path: "/tickets/validate/:qrCode" },
  async ({ qrCode }) => {
    const ticket = await ticketDB.queryRow`
      SELECT * FROM tickets WHERE qr_code = ${qrCode}
    `;

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    const ticketData = {
      id: ticket.id,
      eventId: ticket.event_id,
      tierId: ticket.tier_id,
      userId: ticket.user_id,
      ticketNumber: ticket.ticket_number,
      qrCode: ticket.qr_code,
      status: ticket.status as any,
      purchasePrice: ticket.purchase_price,
      purchaseDate: ticket.purchase_date,
      usedAt: ticket.used_at,
      createdAt: ticket.created_at,
    };

    // Check if ticket is already used
    if (ticket.status === 'used') {
      return {
        ticket: ticketData,
        isValid: false,
        message: "Ticket has already been used"
      };
    }

    // Check if ticket is cancelled or refunded
    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return {
        ticket: ticketData,
        isValid: false,
        message: `Ticket is ${ticket.status}`
      };
    }

    // Mark ticket as used
    const updatedTicket = await ticketDB.queryRow`
      UPDATE tickets 
      SET status = 'used', used_at = NOW()
      WHERE id = ${ticket.id}
      RETURNING *
    `;

    if (!updatedTicket) {
      throw APIError.internal("Failed to update ticket status");
    }

    return {
      ticket: {
        ...ticketData,
        status: 'used' as any,
        usedAt: updatedTicket.used_at,
      },
      isValid: true,
      message: "Ticket validated successfully"
    };
  }
);
