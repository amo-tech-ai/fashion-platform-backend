export type BookingStatus = "pending" | "confirmed" | "cancelled" | "checked_in";

export interface Booking {
  id: number;
  eventId: number;
  ticketTierId: number;
  quantity: number;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  bookingCode: string;
  status: BookingStatus;
  createdAt: Date;
}
