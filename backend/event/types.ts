export type EventType = "fashion_show" | "exhibition" | "popup" | "workshop";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type TicketTierType = "general" | "vip" | "press" | "backstage";

export interface Event {
  id: number;
  organizerId: number;
  venueId?: number;
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  maxCapacity: number;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTier {
  id: number;
  eventId: number;
  name: string;
  description?: string;
  tierType: TicketTierType;
  price: number;
  earlyBirdPrice?: number;
  earlyBirdEnd?: Date;
  maxQuantity: number;
  soldQuantity: number;
  isActive: boolean;
  createdAt: Date;
}

export interface EventDesigner {
  id: number;
  eventId: number;
  designerId: number;
  isFeatured: boolean;
  showcaseOrder?: number;
  createdAt: Date;
}
