import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import type { FashionistasShow, TierType } from "./types";

export interface CreateShowRequest {
  title: string;
  description?: string;
  showDate: Date;
  featuredDesigners: string[];
  teaserVideoUrl?: string;
  posterImageUrl?: string;
}

export interface CreateShowResponse {
  show: FashionistasShow;
  tiers: Array<{
    id: number;
    tierName: string;
    tierType: TierType;
    basePriceUsd: number;
    basePriceCop: number;
    maxQuantity: number;
    benefits: string[];
  }>;
}

// Creates a new Fashionistas show with default ticket tiers.
export const createShow = api<CreateShowRequest, CreateShowResponse>(
  { expose: true, method: "POST", path: "/fashionistas/shows" },
  async (req) => {
    // Validate show date is in the future
    if (req.showDate <= new Date()) {
      throw APIError.invalidArgument("Show date must be in the future");
    }

    await using tx = await fashionistasDB.begin();

    try {
      // Create the show
      const showRow = await tx.queryRow`
        INSERT INTO fashionistas_shows (
          title, description, show_date, featured_designers, 
          teaser_video_url, poster_image_url
        )
        VALUES (
          ${req.title}, ${req.description}, ${req.showDate}, ${req.featuredDesigners},
          ${req.teaserVideoUrl}, ${req.posterImageUrl}
        )
        RETURNING *
      `;

      if (!showRow) {
        throw APIError.internal("Failed to create show");
      }

      const show: FashionistasShow = {
        id: showRow.id,
        title: showRow.title,
        description: showRow.description,
        showDate: showRow.show_date,
        venueName: showRow.venue_name,
        venueAddress: showRow.venue_address,
        capacitySeated: showRow.capacity_seated,
        capacityStanding: showRow.capacity_standing,
        status: showRow.status as any,
        featuredDesigners: showRow.featured_designers || [],
        teaserVideoUrl: showRow.teaser_video_url,
        posterImageUrl: showRow.poster_image_url,
        whatsappGroupLink: showRow.whatsapp_group_link,
        createdAt: showRow.created_at,
        updatedAt: showRow.updated_at,
      };

      // Create default ticket tiers
      const defaultTiers = [
        {
          tierName: "Standing Room",
          tierType: "standing" as TierType,
          basePriceUsd: 35,
          basePriceCop: 140000,
          maxQuantity: 150,
          benefits: ["General admission", "Welcome cocktail", "Access to main floor"],
          seatingSection: "STANDING"
        },
        {
          tierName: "Standard Seating",
          tierType: "standard" as TierType,
          basePriceUsd: 75,
          basePriceCop: 300000,
          maxQuantity: 300,
          benefits: ["Assigned seat rows 5-10", "Welcome cocktail", "Fashionistas gift bag", "Priority entry"],
          seatingSection: "STANDARD"
        },
        {
          tierName: "Premium Seating",
          tierType: "premium" as TierType,
          basePriceUsd: 150,
          basePriceCop: 600000,
          maxQuantity: 200,
          benefits: ["Premium seats rows 2-4", "Premium gift bag", "2 cocktails", "VIP lounge access"],
          seatingSection: "PREMIUM"
        },
        {
          tierName: "Front Row VIP",
          tierType: "vip" as TierType,
          basePriceUsd: 300,
          basePriceCop: 1200000,
          maxQuantity: 50,
          benefits: ["Front row seats", "Backstage access", "Designer meet & greet", "Premium bar access", "Exclusive gift bag"],
          seatingSection: "VIP"
        },
        {
          tierName: "Table for 4",
          tierType: "table" as TierType,
          basePriceUsd: 1000,
          basePriceCop: 4000000,
          maxQuantity: 10,
          benefits: ["Private table for 4", "Bottle service", "Dedicated server", "VIP parking", "Exclusive perks"],
          seatingSection: "TABLE"
        }
      ];

      const createdTiers = [];
      for (const tier of defaultTiers) {
        const tierRow = await tx.queryRow`
          INSERT INTO fashionistas_ticket_tiers (
            show_id, tier_name, tier_type, base_price_usd, base_price_cop,
            max_quantity, benefits, seating_section
          )
          VALUES (
            ${show.id}, ${tier.tierName}, ${tier.tierType}, ${tier.basePriceUsd}, 
            ${tier.basePriceCop}, ${tier.maxQuantity}, ${tier.benefits}, ${tier.seatingSection}
          )
          RETURNING *
        `;

        if (tierRow) {
          createdTiers.push({
            id: tierRow.id,
            tierName: tierRow.tier_name,
            tierType: tierRow.tier_type as TierType,
            basePriceUsd: tierRow.base_price_usd,
            basePriceCop: tierRow.base_price_cop,
            maxQuantity: tierRow.max_quantity,
            benefits: tierRow.benefits || [],
          });
        }
      }

      // Create default pricing phases
      const showDate = new Date(req.showDate);
      const pricingPhases = [
        {
          phaseName: "Super Early Bird",
          discountPercentage: 40,
          maxTickets: 100,
          startDate: new Date(showDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days before
          endDate: new Date(showDate.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days before
        },
        {
          phaseName: "Early Bird",
          discountPercentage: 25,
          maxTickets: 200,
          startDate: new Date(showDate.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days before
          endDate: new Date(showDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        },
        {
          phaseName: "Regular",
          discountPercentage: 0,
          startDate: new Date(showDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
          endDate: new Date(showDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
        },
        {
          phaseName: "Last Minute",
          premiumPercentage: 10,
          startDate: new Date(showDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
          endDate: new Date(showDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before
        },
        {
          phaseName: "Day-of",
          premiumPercentage: 25,
          startDate: new Date(showDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day before
          endDate: showDate,
        }
      ];

      for (const phase of pricingPhases) {
        await tx.exec`
          INSERT INTO fashionistas_pricing_phases (
            show_id, phase_name, discount_percentage, premium_percentage,
            max_tickets, start_date, end_date
          )
          VALUES (
            ${show.id}, ${phase.phaseName}, ${phase.discountPercentage}, ${phase.premiumPercentage || 0},
            ${phase.maxTickets}, ${phase.startDate}, ${phase.endDate}
          )
        `;
      }

      await tx.commit();

      return {
        show,
        tiers: createdTiers,
      };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
