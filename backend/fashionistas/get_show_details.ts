import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import type { FashionistasShow, FashionistasTicketTier, AvailabilityInfo, PricingCalculation, Currency } from "./types";

export interface GetShowDetailsParams {
  showId: number;
  currency?: Currency;
}

export interface GetShowDetailsResponse {
  show: FashionistasShow;
  tiers: Array<FashionistasTicketTier & {
    currentPrice: PricingCalculation;
    availability: AvailabilityInfo;
  }>;
  currentPhase: {
    phaseName: string;
    discountPercentage: number;
    premiumPercentage: number;
    endsAt: Date;
    timeRemaining: string;
  };
  totalAvailability: {
    totalSeats: number;
    totalSold: number;
    percentageSold: number;
    urgencyLevel: "low" | "medium" | "high" | "critical";
  };
  viewingCount: number;
}

// Gets comprehensive show details with real-time pricing and availability.
export const getShowDetails = api<GetShowDetailsParams, GetShowDetailsResponse>(
  { expose: true, method: "GET", path: "/fashionistas/shows/:showId" },
  async ({ showId, currency = "USD" }) => {
    // Get show details
    const showRow = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_shows WHERE id = ${showId}
    `;

    if (!showRow) {
      throw APIError.notFound("Show not found");
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

    // Get current pricing phase
    const currentPhaseRow = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_pricing_phases 
      WHERE show_id = ${showId} 
        AND start_date <= NOW() 
        AND end_date > NOW()
        AND is_active = true
      ORDER BY start_date DESC
      LIMIT 1
    `;

    if (!currentPhaseRow) {
      throw APIError.failedPrecondition("No active pricing phase found for this show");
    }

    // Get all ticket tiers with sold quantities
    const tierRows = await fashionistasDB.queryAll`
      SELECT 
        tt.*,
        COALESCE(sold_counts.sold, 0) as actual_sold
      FROM fashionistas_ticket_tiers tt
      LEFT JOIN (
        SELECT tier_id, COUNT(*) as sold
        FROM fashionistas_tickets
        WHERE show_id = ${showId} AND status = 'active'
        GROUP BY tier_id
      ) sold_counts ON tt.id = sold_counts.tier_id
      WHERE tt.show_id = ${showId} AND tt.is_active = true
      ORDER BY tt.base_price_usd ASC
    `;

    const tiers = [];
    let totalSeats = 0;
    let totalSold = 0;

    for (const tierRow of tierRows) {
      const tier: FashionistasTicketTier = {
        id: tierRow.id,
        showId: tierRow.show_id,
        tierName: tierRow.tier_name,
        tierType: tierRow.tier_type as any,
        basePriceUsd: tierRow.base_price_usd,
        basePriceCop: tierRow.base_price_cop,
        maxQuantity: tierRow.max_quantity,
        soldQuantity: tierRow.actual_sold,
        benefits: tierRow.benefits || [],
        seatingSection: tierRow.seating_section,
        isActive: tierRow.is_active,
        createdAt: tierRow.created_at,
      };

      // Calculate current pricing
      const basePrice = currency === "USD" ? tier.basePriceUsd : tier.basePriceCop;
      let finalPrice = basePrice;

      if (currentPhaseRow.discount_percentage > 0) {
        finalPrice = basePrice * (1 - currentPhaseRow.discount_percentage / 100);
      } else if (currentPhaseRow.premium_percentage > 0) {
        finalPrice = basePrice * (1 + currentPhaseRow.premium_percentage / 100);
      }

      // Apply dynamic pricing based on capacity
      const percentageSold = (tier.soldQuantity / tier.maxQuantity) * 100;
      if (percentageSold >= 70) {
        finalPrice *= 1.1; // 10% increase when 70% sold
      }

      // Round prices appropriately
      if (currency === "USD") {
        finalPrice = Math.ceil(finalPrice / 5) * 5; // Round to nearest $5
      } else {
        finalPrice = Math.ceil(finalPrice / 10000) * 10000; // Round to nearest 10,000 COP
      }

      // Calculate fees
      const stripeFee = finalPrice * 0.029 + (currency === "USD" ? 0.30 : 1200); // Stripe fees
      const platformFee = finalPrice * 0.05; // 5% platform fee
      const totalFees = stripeFee + platformFee;

      const currentPrice: PricingCalculation = {
        basePrice,
        discountAmount: basePrice - finalPrice,
        finalPrice,
        phaseName: currentPhaseRow.phase_name,
        currency,
        fees: {
          stripeFee,
          platformFee,
          total: totalFees,
        },
      };

      // Generate urgency message
      let urgencyMessage: string | undefined;
      const available = tier.maxQuantity - tier.soldQuantity;
      
      if (available <= 5 && available > 0) {
        urgencyMessage = `Only ${available} ${tier.tierName} tickets left!`;
      } else if (percentageSold >= 80) {
        urgencyMessage = `${tier.tierName} is ${Math.round(percentageSold)}% sold out`;
      } else if (available === 0) {
        urgencyMessage = `${tier.tierName} is sold out`;
      }

      const availability: AvailabilityInfo = {
        tierId: tier.id,
        tierName: tier.tierName,
        available,
        total: tier.maxQuantity,
        percentageSold,
        urgencyMessage,
      };

      tiers.push({
        ...tier,
        currentPrice,
        availability,
      });

      totalSeats += tier.maxQuantity;
      totalSold += tier.soldQuantity;
    }

    // Calculate time remaining in current phase
    const timeRemaining = calculateTimeRemaining(currentPhaseRow.end_date);
    
    // Determine urgency level
    const overallPercentageSold = (totalSold / totalSeats) * 100;
    let urgencyLevel: "low" | "medium" | "high" | "critical";
    
    if (overallPercentageSold >= 95) urgencyLevel = "critical";
    else if (overallPercentageSold >= 80) urgencyLevel = "high";
    else if (overallPercentageSold >= 60) urgencyLevel = "medium";
    else urgencyLevel = "low";

    // Simulate viewing count (in real app, this would be tracked)
    const viewingCount = Math.floor(Math.random() * 15) + 3;

    return {
      show,
      tiers,
      currentPhase: {
        phaseName: currentPhaseRow.phase_name,
        discountPercentage: currentPhaseRow.discount_percentage,
        premiumPercentage: currentPhaseRow.premium_percentage,
        endsAt: currentPhaseRow.end_date,
        timeRemaining,
      },
      totalAvailability: {
        totalSeats,
        totalSold,
        percentageSold: overallPercentageSold,
        urgencyLevel,
      },
      viewingCount,
    };
  }
);

function calculateTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return "Expired";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
