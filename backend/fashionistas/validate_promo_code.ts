import { api, APIError } from "encore.dev/api";
import { fashionistasDB } from "./db";
import type { FashionistasPromoCode, Currency } from "./types";

export interface ValidatePromoCodeRequest {
  code: string;
  showId: number;
  tierIds: number[];
  ticketCount: number;
  currency: Currency;
}

export interface ValidatePromoCodeResponse {
  isValid: boolean;
  promoCode?: FashionistasPromoCode;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

// Validates a promo code and calculates discount.
export const validatePromoCode = api<ValidatePromoCodeRequest, ValidatePromoCodeResponse>(
  { expose: true, method: "POST", path: "/fashionistas/promo-codes/validate" },
  async ({ code, showId, tierIds, ticketCount, currency }) => {
    // Get promo code
    const promoRow = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_promo_codes 
      WHERE code = ${code.toUpperCase()} AND is_active = true
    `;

    if (!promoRow) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: "Invalid promo code",
      };
    }

    const promoCode: FashionistasPromoCode = {
      id: promoRow.id,
      code: promoRow.code,
      showId: promoRow.show_id,
      discountType: promoRow.discount_type as any,
      discountValue: promoRow.discount_value,
      maxUses: promoRow.max_uses,
      usedCount: promoRow.used_count,
      validFrom: promoRow.valid_from,
      validUntil: promoRow.valid_until,
      applicableTiers: promoRow.applicable_tiers || [],
      minimumTickets: promoRow.minimum_tickets,
      isActive: promoRow.is_active,
      createdAt: promoRow.created_at,
    };

    // Check if promo code is valid for this show
    if (promoCode.showId && promoCode.showId !== showId) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: "Promo code not valid for this show",
      };
    }

    // Check date validity
    const now = new Date();
    if (now < promoCode.validFrom || now > promoCode.validUntil) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: "Promo code has expired",
      };
    }

    // Check usage limit
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: "Promo code usage limit reached",
      };
    }

    // Check minimum tickets
    if (ticketCount < promoCode.minimumTickets) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        message: `Minimum ${promoCode.minimumTickets} tickets required for this promo code`,
      };
    }

    // Check applicable tiers
    if (promoCode.applicableTiers.length > 0) {
      const hasValidTier = tierIds.some(tierId => promoCode.applicableTiers.includes(tierId));
      if (!hasValidTier) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: 0,
          message: "Promo code not valid for selected ticket types",
        };
      }
    }

    // Calculate current ticket prices
    const currentPhase = await fashionistasDB.queryRow`
      SELECT * FROM fashionistas_pricing_phases 
      WHERE show_id = ${showId} 
        AND start_date <= NOW() 
        AND end_date > NOW()
        AND is_active = true
      ORDER BY start_date DESC
      LIMIT 1
    `;

    let totalAmount = 0;
    for (const tierId of tierIds) {
      const tier = await fashionistasDB.queryRow`
        SELECT * FROM fashionistas_ticket_tiers WHERE id = ${tierId}
      `;
      
      if (tier) {
        let price = currency === "USD" ? tier.base_price_usd : tier.base_price_cop;
        
        // Apply current phase pricing
        if (currentPhase) {
          if (currentPhase.discount_percentage > 0) {
            price = price * (1 - currentPhase.discount_percentage / 100);
          } else if (currentPhase.premium_percentage > 0) {
            price = price * (1 + currentPhase.premium_percentage / 100);
          }
        }
        
        totalAmount += price;
      }
    }

    // Calculate discount
    let discountAmount = 0;
    
    if (promoCode.discountType === "percentage") {
      discountAmount = totalAmount * (promoCode.discountValue / 100);
    } else if (promoCode.discountType === "fixed_usd" && currency === "USD") {
      discountAmount = promoCode.discountValue;
    } else if (promoCode.discountType === "fixed_cop" && currency === "COP") {
      discountAmount = promoCode.discountValue;
    } else if (promoCode.discountType === "fixed_usd" && currency === "COP") {
      discountAmount = promoCode.discountValue * 4000; // Approximate conversion
    } else if (promoCode.discountType === "fixed_cop" && currency === "USD") {
      discountAmount = promoCode.discountValue / 4000; // Approximate conversion
    }

    // Ensure discount doesn't exceed total amount
    discountAmount = Math.min(discountAmount, totalAmount);
    const finalAmount = totalAmount - discountAmount;

    return {
      isValid: true,
      promoCode,
      discountAmount,
      finalAmount,
      message: `Promo code applied! You saved ${currency === "USD" ? "$" : "COP $"}${discountAmount.toFixed(currency === "USD" ? 2 : 0)}`,
    };
  }
);

export interface CreatePromoCodeRequest {
  code: string;
  showId?: number;
  discountType: "percentage" | "fixed_usd" | "fixed_cop";
  discountValue: number;
  maxUses?: number;
  validFrom: Date;
  validUntil: Date;
  applicableTiers?: number[];
  minimumTickets?: number;
}

// Creates a new promo code.
export const createPromoCode = api<CreatePromoCodeRequest, FashionistasPromoCode>(
  { expose: true, method: "POST", path: "/fashionistas/promo-codes" },
  async (req) => {
    // Check if code already exists
    const existing = await fashionistasDB.queryRow`
      SELECT id FROM fashionistas_promo_codes WHERE code = ${req.code.toUpperCase()}
    `;

    if (existing) {
      throw APIError.alreadyExists("Promo code already exists");
    }

    const row = await fashionistasDB.queryRow`
      INSERT INTO fashionistas_promo_codes (
        code, show_id, discount_type, discount_value, max_uses,
        valid_from, valid_until, applicable_tiers, minimum_tickets
      )
      VALUES (
        ${req.code.toUpperCase()}, ${req.showId}, ${req.discountType}, ${req.discountValue},
        ${req.maxUses}, ${req.validFrom}, ${req.validUntil}, ${req.applicableTiers || []}, 
        ${req.minimumTickets || 1}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create promo code");
    }

    return {
      id: row.id,
      code: row.code,
      showId: row.show_id,
      discountType: row.discount_type as any,
      discountValue: row.discount_value,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      applicableTiers: row.applicable_tiers || [],
      minimumTickets: row.minimum_tickets,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
);
