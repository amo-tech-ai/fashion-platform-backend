export type ShowStatus = "draft" | "published" | "sold_out" | "cancelled" | "completed";
export type TierType = "standing" | "standard" | "premium" | "vip" | "table";
export type TicketStatus = "active" | "used" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type Currency = "USD" | "COP";
export type DiscountType = "percentage" | "fixed_usd" | "fixed_cop";

export interface FashionistasShow {
  id: number;
  title: string;
  description?: string;
  showDate: Date;
  venueName: string;
  venueAddress: string;
  capacitySeated: number;
  capacityStanding: number;
  status: ShowStatus;
  featuredDesigners: string[];
  teaserVideoUrl?: string;
  posterImageUrl?: string;
  whatsappGroupLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FashionistasTicketTier {
  id: number;
  showId: number;
  tierName: string;
  tierType: TierType;
  basePriceUsd: number;
  basePriceCop: number;
  maxQuantity: number;
  soldQuantity: number;
  benefits: string[];
  seatingSection?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface FashionistasPricingPhase {
  id: number;
  showId: number;
  phaseName: string;
  discountPercentage: number;
  premiumPercentage: number;
  maxTickets?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface FashionistasSeatMap {
  id: number;
  showId: number;
  section: string;
  rowNumber: string;
  seatNumber: string;
  tierId: number;
  isAvailable: boolean;
  isAccessible: boolean;
  xCoordinate?: number;
  yCoordinate?: number;
  createdAt: Date;
}

export interface FashionistasTicket {
  id: number;
  showId: number;
  tierId: number;
  seatId?: number;
  userId: number;
  ticketNumber: string;
  qrCode: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  purchasePriceUsd: number;
  purchasePriceCop: number;
  currencyUsed: Currency;
  status: TicketStatus;
  groupBookingId?: string;
  specialRequirements?: string;
  usedAt?: Date;
  createdAt: Date;
}

export interface FashionistasGroupBooking {
  id: number;
  bookingReference: string;
  showId: number;
  organizerUserId: number;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  totalTickets: number;
  totalAmountUsd: number;
  totalAmountCop: number;
  currencyUsed: Currency;
  discountApplied: number;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FashionistasWaitlist {
  id: number;
  showId: number;
  tierId: number;
  userId: number;
  email: string;
  phone?: string;
  preferredQuantity: number;
  maxPriceUsd?: number;
  maxPriceCop?: number;
  notified: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface FashionistasPromoCode {
  id: number;
  code: string;
  showId?: number;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  applicableTiers: number[];
  minimumTickets: number;
  isActive: boolean;
  createdAt: Date;
}

export interface PricingCalculation {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  phaseName: string;
  currency: Currency;
  fees: {
    stripeFee: number;
    platformFee: number;
    total: number;
  };
}

export interface AvailabilityInfo {
  tierId: number;
  tierName: string;
  available: number;
  total: number;
  percentageSold: number;
  urgencyMessage?: string;
}
