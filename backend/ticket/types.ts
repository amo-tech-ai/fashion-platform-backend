export type TicketStatus = "active" | "used" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface Ticket {
  id: number;
  eventId: number;
  tierId: number;
  userId: number;
  ticketNumber: string;
  qrCode: string;
  status: TicketStatus;
  purchasePrice: number;
  purchaseDate: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface TicketOrder {
  id: number;
  userId: number;
  eventId: number;
  orderNumber: string;
  totalAmount: number;
  paymentIntentId?: string;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  tierId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}
