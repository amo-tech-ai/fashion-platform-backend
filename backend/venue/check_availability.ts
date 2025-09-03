import { api } from "encore.dev/api";
import { venueDB } from "./db";

export interface CheckAvailabilityParams {
  venueId: number;
  startDate: Date;
  endDate: Date;
}

export interface CheckAvailabilityResponse {
  isAvailable: boolean;
  conflictingBookings: Array<{
    id: number;
    startDate: Date;
    endDate: Date;
    status: string;
  }>;
}

// Checks venue availability for a given time period.
export const checkAvailability = api<CheckAvailabilityParams, CheckAvailabilityResponse>(
  { expose: true, method: "GET", path: "/venues/:venueId/availability" },
  async ({ venueId, startDate, endDate }) => {
    // Find conflicting bookings
    const conflicts = await venueDB.queryAll`
      SELECT id, start_date, end_date, status 
      FROM venue_bookings 
      WHERE venue_id = ${venueId} 
        AND status IN ('pending', 'confirmed')
        AND (
          (start_date <= ${startDate} AND end_date > ${startDate}) OR
          (start_date < ${endDate} AND end_date >= ${endDate}) OR
          (start_date >= ${startDate} AND end_date <= ${endDate})
        )
      ORDER BY start_date ASC
    `;

    const conflictingBookings = conflicts.map(row => ({
      id: row.id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    }));

    return {
      isAvailable: conflictingBookings.length === 0,
      conflictingBookings,
    };
  }
);
