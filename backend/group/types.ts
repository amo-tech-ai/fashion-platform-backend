export type GroupBookingStatus = "active" | "locked" | "completed" | "cancelled";
export type SeatingPreference = "together" | "scattered" | "no_preference";
export type PaymentMethod = "individual" | "organizer_pays";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type MessageType = "text" | "system" | "reminder";

export interface GroupBooking {
  id: number;
  eventId: number;
  organizerEmail: string;
  organizerName: string;
  groupName: string;
  estimatedSize: number;
  maxSize: number;
  inviteCode: string;
  status: GroupBookingStatus;
  seatingPreference: SeatingPreference;
  paymentMethod: PaymentMethod;
  discountPercentage: number;
  complimentaryTickets: number;
  createdAt: Date;
  lockedAt?: Date;
  expiresAt?: Date;
}

export interface GroupInvitation {
  id: number;
  groupBookingId: number;
  email: string;
  name?: string;
  invitedBy: string;
  status: InvitationStatus;
  invitedAt: Date;
  respondedAt?: Date;
}

export interface GroupBookingMember {
  id: number;
  groupBookingId: number;
  bookingId: number;
  email: string;
  name: string;
  ticketTierId: number;
  quantity: number;
  amountPaid: number;
  discountApplied: number;
  isComplimentary: boolean;
  joinedAt: Date;
}

export interface GroupChatMessage {
  id: number;
  groupBookingId: number;
  senderEmail: string;
  senderName: string;
  message: string;
  messageType: MessageType;
  createdAt: Date;
}

export interface SeatingAssignment {
  id: number;
  groupBookingId: number;
  bookingId: number;
  section?: string;
  rowNumber?: string;
  seatNumber?: string;
  assignedAt: Date;
}
