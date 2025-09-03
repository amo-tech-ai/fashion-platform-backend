import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import type { FashionistasSeatMap } from "./types";

export interface GetSeatMapParams {
  showId: number;
}

export interface SeatMapSection {
  section: string;
  tierName: string;
  tierType: string;
  rows: Array<{
    rowNumber: string;
    seats: Array<{
      id: number;
      seatNumber: string;
      isAvailable: boolean;
      isAccessible: boolean;
      price: number;
      currency: string;
      xCoordinate?: number;
      yCoordinate?: number;
    }>;
  }>;
}

export interface GetSeatMapResponse {
  sections: SeatMapSection[];
  legend: Array<{
    tierType: string;
    tierName: string;
    color: string;
    price: number;
    currency: string;
  }>;
}

// Gets interactive seat map with real-time availability.
export const getSeatMap = api<GetSeatMapParams, GetSeatMapResponse>(
  { expose: true, method: "GET", path: "/fashionistas/shows/:showId/seat-map" },
  async ({ showId }) => {
    // Verify show exists
    const show = await fashionistasDB.queryRow`
      SELECT id FROM fashionistas_shows WHERE id = ${showId}
    `;

    if (!show) {
      throw APIError.notFound("Show not found");
    }

    // Get current pricing phase for price calculation
    const currentPhase = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_pricing_phases 
      WHERE show_id = ${showId} 
        AND start_date <= NOW() 
        AND end_date > NOW()
        AND is_active = true
      ORDER BY start_date DESC
      LIMIT 1
    `;

    // Get all seats with tier information
    const seatRows = await fashionistasDB.queryAll`
      SELECT 
        sm.*,
        tt.tier_name,
        tt.tier_type,
        tt.base_price_usd,
        tt.base_price_cop,
        CASE WHEN t.id IS NOT NULL THEN false ELSE sm.is_available END as actual_availability
      FROM fashionistas_seat_map sm
      JOIN fashionistas_ticket_tiers tt ON sm.tier_id = tt.id
      LEFT JOIN fashionistas_tickets t ON sm.id = t.seat_id AND t.status = 'active'
      WHERE sm.show_id = ${showId}
      ORDER BY sm.section, sm.row_number, sm.seat_number
    `;

    // If no seats exist, generate default seat map
    if (seatRows.length === 0) {
      await generateDefaultSeatMap(showId);
      // Re-fetch after generation
      return getSeatMap({ showId });
    }

    // Group seats by section and row
    const sectionMap = new Map<string, SeatMapSection>();

    for (const seatRow of seatRows) {
      const sectionKey = seatRow.section;
      
      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          section: seatRow.section,
          tierName: seatRow.tier_name,
          tierType: seatRow.tier_type,
          rows: [],
        });
      }

      const section = sectionMap.get(sectionKey)!;
      let row = section.rows.find(r => r.rowNumber === seatRow.row_number);
      
      if (!row) {
        row = {
          rowNumber: seatRow.row_number,
          seats: [],
        };
        section.rows.push(row);
      }

      // Calculate current price
      let price = seatRow.base_price_usd;
      if (currentPhase) {
        if (currentPhase.discount_percentage > 0) {
          price = price * (1 - currentPhase.discount_percentage / 100);
        } else if (currentPhase.premium_percentage > 0) {
          price = price * (1 + currentPhase.premium_percentage / 100);
        }
      }
      price = Math.ceil(price / 5) * 5; // Round to nearest $5

      row.seats.push({
        id: seatRow.id,
        seatNumber: seatRow.seat_number,
        isAvailable: seatRow.actual_availability,
        isAccessible: seatRow.is_accessible,
        price,
        currency: "USD",
        xCoordinate: seatRow.x_coordinate,
        yCoordinate: seatRow.y_coordinate,
      });
    }

    // Sort rows and seats
    const sections = Array.from(sectionMap.values());
    sections.forEach(section => {
      section.rows.sort((a, b) => a.rowNumber.localeCompare(b.rowNumber));
      section.rows.forEach(row => {
        row.seats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
      });
    });

    // Create legend
    const tierMap = new Map<string, any>();
    seatRows.forEach(seat => {
      if (!tierMap.has(seat.tier_type)) {
        let price = seat.base_price_usd;
        if (currentPhase) {
          if (currentPhase.discount_percentage > 0) {
            price = price * (1 - currentPhase.discount_percentage / 100);
          } else if (currentPhase.premium_percentage > 0) {
            price = price * (1 + currentPhase.premium_percentage / 100);
          }
        }
        price = Math.ceil(price / 5) * 5;

        tierMap.set(seat.tier_type, {
          tierType: seat.tier_type,
          tierName: seat.tier_name,
          color: getTierColor(seat.tier_type),
          price,
          currency: "USD",
        });
      }
    });

    const legend = Array.from(tierMap.values());

    return {
      sections,
      legend,
    };
  }
);

async function generateDefaultSeatMap(showId: number) {
  // Get tier information
  const tiers = await fashionistasDB.queryAll`
    SELECT * FROM fashionistas_ticket_tiers 
    WHERE show_id = ${showId} AND is_active = true
  `;

  const seatInserts = [];

  for (const tier of tiers) {
    if (tier.tier_type === 'standing') {
      // Standing room doesn't need individual seats
      continue;
    } else if (tier.tier_type === 'table') {
      // Create table seats
      for (let table = 1; table <= tier.max_quantity; table++) {
        for (let seat = 1; seat <= 4; seat++) {
          seatInserts.push({
            showId,
            section: 'TABLE',
            rowNumber: `T${table}`,
            seatNumber: `${seat}`,
            tierId: tier.id,
            xCoordinate: 50 + (table % 5) * 100,
            yCoordinate: 50 + Math.floor(table / 5) * 80,
          });
        }
      }
    } else {
      // Create regular seating
      const rowsPerSection = tier.tier_type === 'vip' ? 1 : 
                           tier.tier_type === 'premium' ? 3 : 10;
      const seatsPerRow = Math.ceil(tier.max_quantity / rowsPerSection);
      
      for (let row = 1; row <= rowsPerSection; row++) {
        for (let seat = 1; seat <= seatsPerRow; seat++) {
          if (seatInserts.length >= tier.max_quantity) break;
          
          seatInserts.push({
            showId,
            section: tier.seating_section || tier.tier_type.toUpperCase(),
            rowNumber: String.fromCharCode(64 + row), // A, B, C, etc.
            seatNumber: `${seat}`,
            tierId: tier.id,
            isAccessible: seat <= 2 && row === 1, // First 2 seats of first row
            xCoordinate: 100 + seat * 40,
            yCoordinate: 200 + row * 50,
          });
        }
      }
    }
  }

  // Insert all seats
  for (const seat of seatInserts) {
    await fashionistasDB.exec`
      INSERT INTO fashionistas_seat_map (
        show_id, section, row_number, seat_number, tier_id, 
        is_accessible, x_coordinate, y_coordinate
      )
      VALUES (
        ${seat.showId}, ${seat.section}, ${seat.rowNumber}, ${seat.seatNumber}, 
        ${seat.tierId}, ${seat.isAccessible || false}, ${seat.xCoordinate}, ${seat.yCoordinate}
      )
    `;
  }
}

function getTierColor(tierType: string): string {
  const colors = {
    standing: "#95a5a6",
    standard: "#3498db",
    premium: "#9b59b6",
    vip: "#f39c12",
    table: "#e74c3c",
  };
  return colors[tierType as keyof typeof colors] || "#95a5a6";
}
