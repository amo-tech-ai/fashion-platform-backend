import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { fashionistasDB } from "./db";
import type { FashionistasShow, ShowStatus } from "./types";

export interface ListShowsParams {
  status?: Query<ShowStatus>;
  upcoming?: Query<boolean>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ShowSummary extends FashionistasShow {
  ticketsSold: number;
  totalCapacity: number;
  percentageSold: number;
  lowestPrice: number;
  highestPrice: number;
  currency: string;
  isSellingFast: boolean;
  daysUntilShow: number;
}

export interface ListShowsResponse {
  shows: ShowSummary[];
  total: number;
}

// Lists Fashionistas shows with summary information.
export const listShows = api<ListShowsParams, ListShowsResponse>(
  { expose: true, method: "GET", path: "/fashionistas/shows" },
  async ({ status, upcoming, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (upcoming !== undefined && upcoming) {
      whereClause += ` AND show_date > NOW()`;
    } else if (upcoming !== undefined && !upcoming) {
      whereClause += ` AND show_date <= NOW()`;
    }

    const countQuery = `SELECT COUNT(*) as count FROM fashionistas_shows ${whereClause}`;
    const countResult = await fashionistasDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM fashionistas_shows 
      ${whereClause}
      ORDER BY show_date ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const showRows = await fashionistasDB.rawQueryAll(query, ...params);

    const shows: ShowSummary[] = [];

    for (const showRow of showRows) {
      // Get ticket sales summary
      const salesSummary = await fashionistasDB.queryRow`
        SELECT 
          COUNT(t.id) as tickets_sold,
          SUM(tt.max_quantity) as total_capacity,
          MIN(tt.base_price_usd) as lowest_price,
          MAX(tt.base_price_usd) as highest_price
        FROM fashionistas_ticket_tiers tt
        LEFT JOIN fashionistas_tickets t ON tt.id = t.tier_id AND t.status = 'active'
        WHERE tt.show_id = ${showRow.id} AND tt.is_active = true
      `;

      const ticketsSold = salesSummary?.tickets_sold || 0;
      const totalCapacity = salesSummary?.total_capacity || 0;
      const percentageSold = totalCapacity > 0 ? (ticketsSold / totalCapacity) * 100 : 0;

      // Check if selling fast (>20% sold in last 24 hours)
      const recentSales = await fashionistasDB.queryRow`
        SELECT COUNT(*) as recent_count
        FROM fashionistas_tickets
        WHERE show_id = ${showRow.id} 
          AND status = 'active'
          AND created_at > NOW() - INTERVAL '24 hours'
      `;

      const isSellingFast = (recentSales?.recent_count || 0) > (totalCapacity * 0.2);

      // Calculate days until show
      const daysUntilShow = Math.ceil((new Date(showRow.show_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const show: ShowSummary = {
        id: showRow.id,
        title: showRow.title,
        description: showRow.description,
        showDate: showRow.show_date,
        venueName: showRow.venue_name,
        venueAddress: showRow.venue_address,
        capacitySeated: showRow.capacity_seated,
        capacityStanding: showRow.capacity_standing,
        status: showRow.status as ShowStatus,
        featuredDesigners: showRow.featured_designers || [],
        teaserVideoUrl: showRow.teaser_video_url,
        posterImageUrl: showRow.poster_image_url,
        whatsappGroupLink: showRow.whatsapp_group_link,
        createdAt: showRow.created_at,
        updatedAt: showRow.updated_at,
        ticketsSold,
        totalCapacity,
        percentageSold,
        lowestPrice: salesSummary?.lowest_price || 0,
        highestPrice: salesSummary?.highest_price || 0,
        currency: "USD",
        isSellingFast,
        daysUntilShow,
      };

      shows.push(show);
    }

    return { shows, total };
  }
);

export interface GetUpcomingShowResponse {
  show?: ShowSummary;
  message: string;
}

// Gets the next upcoming Fashionistas show.
export const getUpcomingShow = api<void, GetUpcomingShowResponse>(
  { expose: true, method: "GET", path: "/fashionistas/shows/upcoming" },
  async () => {
    const showRow = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_shows 
      WHERE show_date > NOW() AND status = 'published'
      ORDER BY show_date ASC 
      LIMIT 1
    `;

    if (!showRow) {
      return {
        message: "No upcoming shows scheduled",
      };
    }

    // Get ticket sales summary
    const salesSummary = await fashionistasDB.queryRow`
      SELECT 
        COUNT(t.id) as tickets_sold,
        SUM(tt.max_quantity) as total_capacity,
        MIN(tt.base_price_usd) as lowest_price,
        MAX(tt.base_price_usd) as highest_price
      FROM fashionistas_ticket_tiers tt
      LEFT JOIN fashionistas_tickets t ON tt.id = t.tier_id AND t.status = 'active'
      WHERE tt.show_id = ${showRow.id} AND tt.is_active = true
    `;

    const ticketsSold = salesSummary?.tickets_sold || 0;
    const totalCapacity = salesSummary?.total_capacity || 0;
    const percentageSold = totalCapacity > 0 ? (ticketsSold / totalCapacity) * 100 : 0;

    // Check if selling fast
    const recentSales = await fashionistasDB.queryRow`
      SELECT COUNT(*) as recent_count
      FROM fashionistas_tickets
      WHERE show_id = ${showRow.id} 
        AND status = 'active'
        AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const isSellingFast = (recentSales?.recent_count || 0) > (totalCapacity * 0.2);
    const daysUntilShow = Math.ceil((new Date(showRow.show_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const show: ShowSummary = {
      id: showRow.id,
      title: showRow.title,
      description: showRow.description,
      showDate: showRow.show_date,
      venueName: showRow.venue_name,
      venueAddress: showRow.venue_address,
      capacitySeated: showRow.capacity_seated,
      capacityStanding: showRow.capacity_standing,
      status: showRow.status as ShowStatus,
      featuredDesigners: showRow.featured_designers || [],
      teaserVideoUrl: showRow.teaser_video_url,
      posterImageUrl: showRow.poster_image_url,
      whatsappGroupLink: showRow.whatsapp_group_link,
      createdAt: showRow.created_at,
      updatedAt: showRow.updated_at,
      ticketsSold,
      totalCapacity,
      percentageSold,
      lowestPrice: salesSummary?.lowest_price || 0,
      highestPrice: salesSummary?.highest_price || 0,
      currency: "USD",
      isSellingFast,
      daysUntilShow,
    };

    return {
      show,
      message: "Next Fashionistas show",
    };
  }
);
