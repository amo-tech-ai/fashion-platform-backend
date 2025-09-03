import { api, APIError } from "encore.dev/api";
import { venueDB } from "./db";
import type { Venue } from "./types";

export interface CreateVenueRequest {
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
  amenities?: string[];
  images?: string[];
  contactEmail: string;
  contactPhone?: string;
}

// Creates a new venue.
export const create = api<CreateVenueRequest, Venue>(
  { expose: true, method: "POST", path: "/venues" },
  async (req) => {
    if (req.capacity <= 0) {
      throw APIError.invalidArgument("Capacity must be greater than 0");
    }

    if (req.hourlyRate < 0) {
      throw APIError.invalidArgument("Hourly rate must be non-negative");
    }

    if (req.dailyRate && req.dailyRate < 0) {
      throw APIError.invalidArgument("Daily rate must be non-negative");
    }

    const row = await venueDB.queryRow<Venue>`
      INSERT INTO venues (
        name, description, address, city, state, country, postal_code,
        latitude, longitude, capacity, hourly_rate, daily_rate,
        amenities, images, contact_email, contact_phone
      )
      VALUES (
        ${req.name}, ${req.description}, ${req.address}, ${req.city}, ${req.state}, 
        ${req.country}, ${req.postalCode}, ${req.latitude}, ${req.longitude},
        ${req.capacity}, ${req.hourlyRate}, ${req.dailyRate},
        ${req.amenities || []}, ${req.images || []}, ${req.contactEmail}, ${req.contactPhone}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create venue");
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      latitude: row.latitude,
      longitude: row.longitude,
      capacity: row.capacity,
      hourlyRate: row.hourly_rate,
      dailyRate: row.daily_rate,
      amenities: row.amenities || [],
      images: row.images || [],
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
