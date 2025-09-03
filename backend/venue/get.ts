import { api, APIError } from "encore.dev/api";
import { venueDB } from "./db";
import type { Venue } from "./types";

export interface GetVenueParams {
  id: number;
}

// Retrieves a venue by ID.
export const get = api<GetVenueParams, Venue>(
  { expose: true, method: "GET", path: "/venues/:id" },
  async ({ id }) => {
    const row = await venueDB.queryRow`
      SELECT * FROM venues WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("Venue not found");
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
