export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Venue {
  id: number;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  hourlyRate: number;
  dailyRate?: number;
  amenities: string[];
  images: string[];
  contactEmail: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueBooking {
  id: number;
  venueId: number;
  eventId?: number;
  bookerId: number;
  startDate: Date;
  endDate: Date;
  totalCost: number;
  status: BookingStatus;
  bookingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueAvailability {
  id: number;
  venueId: number;
  date: Date;
  isAvailable: boolean;
  blockedReason?: string;
  createdAt: Date;
}
