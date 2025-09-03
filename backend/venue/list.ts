import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { venueDB } from "./db";
import type { Venue } from "./types";

export interface ListVenuesParams {
  limit?: Query<number>;
  offset?: Query<number>;
  city?: Query<string>;
  country?: Query<string>;
  minCapacity?: Query<number>;
  maxCapacity?: Query<number>;
  maxHourlyRate?: Query<number>;
  amenities?: Query<string>;
  search?: Query<string>;
  active?: Query<boolean>;
}

export interface ListVenuesResponse {
  venues: Venue[];
  total: number;
}

// Lists venues with optional filtering and pagination.
export const list = api<ListVenuesParams, ListVenuesResponse>(
  { expose: true, method: "GET", path: "/venues" },
  async ({ 
    limit = 20, 
    offset = 0, 
    city, 
    country, 
    minCapacity, 
    maxCapacity, 
    maxHourlyRate, 
    amenities, 
    search, 
    active = true 
  }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(active);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (country) {
      whereClause += ` AND country ILIKE $${paramIndex}`;
      params.push(`%${country}%`);
      paramIndex++;
    }

    if (minCapacity) {
      whereClause += ` AND capacity >= $${paramIndex}`;
      params.push(minCapacity);
      paramIndex++;
    }

    if (maxCapacity) {
      whereClause += ` AND capacity <= $${paramIndex}`;
      params.push(maxCapacity);
      paramIndex++;
    }

    if (maxHourlyRate) {
      whereClause += ` AND hourly_rate <= $${paramIndex}`;
      params.push(maxHourlyRate);
      paramIndex++;
    }

    if (amenities) {
      whereClause += ` AND amenities && $${paramIndex}`;
      params.push([amenities]);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM venues ${whereClause}`;
    const countResult = await venueDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM venues 
      ${whereClause}
      ORDER BY name ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await venueDB.rawQueryAll(query, ...params);

    const venues = rows.map(row => ({
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
    }));

    return { venues, total };
  }
);
