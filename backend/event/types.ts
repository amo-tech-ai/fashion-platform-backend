export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export interface Event {
  id: number;
  name: string;
  date: Date;
  venue: string;
  capacity: number;
  description?: string;
  organizerId: number;
  status: EventStatus;
  createdAt: Date;
  publishedAt?: Date;
}

export interface EventTicketTier {
  id: number;
  eventId: number;
  name: string;
  price: number;
  quantity: number;
  createdAt: Date;
}
