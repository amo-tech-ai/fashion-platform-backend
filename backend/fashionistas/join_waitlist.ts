import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import { notification } from "~encore/clients";
import type { FashionistasWaitlist, Currency } from "./types";

export interface JoinWaitlistRequest {
  showId: number;
  tierId: number;
  userId: number;
  email: string;
  phone?: string;
  preferredQuantity: number;
  maxPriceUsd?: number;
  maxPriceCop?: number;
}

// Joins the waitlist for sold-out tickets.
export const joinWaitlist = api<JoinWaitlistRequest, FashionistasWaitlist>(
  { expose: true, method: "POST", path: "/fashionistas/waitlist" },
  async (req) => {
    // Verify show and tier exist
    const tier = await fashionistasDB.queryRow`
      SELECT tt.*, 
             COALESCE(sold.count, 0) as sold_count
      FROM fashionistas_ticket_tiers tt
      LEFT JOIN (
        SELECT tier_id, COUNT(*) as count
        FROM fashionistas_tickets
        WHERE tier_id = ${req.tierId} AND status = 'active'
        GROUP BY tier_id
      ) sold ON tt.id = sold.tier_id
      WHERE tt.id = ${req.tierId} AND tt.show_id = ${req.showId}
    `;

    if (!tier) {
      throw APIError.notFound("Ticket tier not found");
    }

    // Check if tier is actually sold out
    if (tier.sold_count < tier.max_quantity) {
      throw APIError.failedPrecondition("Tickets are still available for this tier");
    }

    // Check if user is already on waitlist for this tier
    const existing = await fashionistasDB.queryRow`
      SELECT id FROM fashionistas_waitlist 
      WHERE show_id = ${req.showId} AND tier_id = ${req.tierId} AND user_id = ${req.userId}
    `;

    if (existing) {
      throw APIError.alreadyExists("You are already on the waitlist for this tier");
    }

    // Set expiration to 24 hours after show date
    const show = await fashionistasDB.queryRow`
      SELECT show_date FROM fashionistas_shows WHERE id = ${req.showId}
    `;

    const expiresAt = new Date(show.show_date.getTime() + 24 * 60 * 60 * 1000);

    const row = await fashionistasDB.queryRow`
      INSERT INTO fashionistas_waitlist (
        show_id, tier_id, user_id, email, phone, preferred_quantity,
        max_price_usd, max_price_cop, expires_at
      )
      VALUES (
        ${req.showId}, ${req.tierId}, ${req.userId}, ${req.email}, ${req.phone},
        ${req.preferredQuantity}, ${req.maxPriceUsd}, ${req.maxPriceCop}, ${expiresAt}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to join waitlist");
    }

    // Send waitlist confirmation email
    const showDetails = await fashionistasDB.queryRow`
      SELECT title FROM fashionistas_shows WHERE id = ${req.showId}
    `;

    // Note: You would implement a specific waitlist confirmation email template
    // For now, using a generic notification
    
    return {
      id: row.id,
      showId: row.show_id,
      tierId: row.tier_id,
      userId: row.user_id,
      email: row.email,
      phone: row.phone,
      preferredQuantity: row.preferred_quantity,
      maxPriceUsd: row.max_price_usd,
      maxPriceCop: row.max_price_cop,
      notified: row.notified,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
);

export interface NotifyWaitlistRequest {
  showId: number;
  tierId: number;
  availableQuantity: number;
}

export interface NotifyWaitlistResponse {
  notified: number;
  message: string;
}

// Notifies waitlist members when tickets become available.
export const notifyWaitlist = api<NotifyWaitlistRequest, NotifyWaitlistResponse>(
  { expose: true, method: "POST", path: "/fashionistas/waitlist/notify" },
  async ({ showId, tierId, availableQuantity }) => {
    // Get waitlist members in order of signup
    const waitlistMembers = await fashionistasDB.queryAll`
      SELECT w.*, s.title as show_title, tt.tier_name
      FROM fashionistas_waitlist w
      JOIN fashionistas_shows s ON w.show_id = s.id
      JOIN fashionistas_ticket_tiers tt ON w.tier_id = tt.id
      WHERE w.show_id = ${showId} 
        AND w.tier_id = ${tierId}
        AND w.notified = false
        AND w.expires_at > NOW()
      ORDER BY w.created_at ASC
      LIMIT ${availableQuantity}
    `;

    let notified = 0;

    for (const member of waitlistMembers) {
      try {
        // Send notification email
        // Note: You would implement a specific waitlist notification email template
        
        // Mark as notified
        await fashionistasDB.exec`
          UPDATE fashionistas_waitlist 
          SET notified = true 
          WHERE id = ${member.id}
        `;

        notified++;
      } catch (error) {
        console.error(`Failed to notify waitlist member ${member.id}:`, error);
      }
    }

    return {
      notified,
      message: `Notified ${notified} waitlist members about available tickets`,
    };
  }
);

export interface GetWaitlistStatusParams {
  showId: number;
  userId: number;
}

export interface GetWaitlistStatusResponse {
  waitlistEntries: Array<{
    id: number;
    tierName: string;
    position: number;
    preferredQuantity: number;
    estimatedWaitTime: string;
    notified: boolean;
  }>;
}

// Gets user's waitlist status for a show.
export const getWaitlistStatus = api<GetWaitlistStatusParams, GetWaitlistStatusResponse>(
  { expose: true, method: "GET", path: "/fashionistas/waitlist/status/:showId/:userId" },
  async ({ showId, userId }) => {
    const userWaitlistEntries = await fashionistasDB.queryAll`
      SELECT w.*, tt.tier_name
      FROM fashionistas_waitlist w
      JOIN fashionistas_ticket_tiers tt ON w.tier_id = tt.id
      WHERE w.show_id = ${showId} AND w.user_id = ${userId}
      ORDER BY w.created_at ASC
    `;

    const waitlistEntries = [];

    for (const entry of userWaitlistEntries) {
      // Calculate position in waitlist
      const position = await fashionistasDB.queryRow`
        SELECT COUNT(*) + 1 as position
        FROM fashionistas_waitlist
        WHERE show_id = ${showId} 
          AND tier_id = ${entry.tier_id}
          AND created_at < ${entry.created_at}
          AND expires_at > NOW()
      `;

      // Estimate wait time (simplified calculation)
      const estimatedWaitTime = position.position <= 10 ? "1-2 days" : 
                              position.position <= 25 ? "3-5 days" : 
                              "1+ weeks";

      waitlistEntries.push({
        id: entry.id,
        tierName: entry.tier_name,
        position: position.position,
        preferredQuantity: entry.preferred_quantity,
        estimatedWaitTime,
        notified: entry.notified,
      });
    }

    return { waitlistEntries };
  }
);
