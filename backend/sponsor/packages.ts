import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { SponsorshipPackage, EventSponsorshipOpportunity } from "./types";

export interface CreatePackageRequest {
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "custom";
  basePrice: number;
  description?: string;
  benefits: Record<string, any>;
  maxSponsors?: number;
}

export interface UpdatePackageRequest {
  packageId: number;
  name?: string;
  tier?: "bronze" | "silver" | "gold" | "platinum" | "custom";
  basePrice?: number;
  description?: string;
  benefits?: Record<string, any>;
  maxSponsors?: number;
  isActive?: boolean;
}

export interface PackageWithOpportunities extends SponsorshipPackage {
  opportunities: Array<{
    eventId: number;
    eventName: string;
    eventDate: Date;
    venue: string;
    customPrice?: number;
    availableSlots: number;
    soldSlots: number;
  }>;
}

// Create a new sponsorship package
export const createPackage = api<CreatePackageRequest, SponsorshipPackage>(
  { method: "POST", path: "/sponsor/packages" },
  async ({ name, tier, basePrice, description, benefits, maxSponsors = 1 }) => {
    const packageRow = await db.queryRow`
      INSERT INTO sponsorship_packages (name, tier, base_price, description, benefits, max_sponsors)
      VALUES (${name}, ${tier}, ${basePrice}, ${description}, ${JSON.stringify(benefits)}, ${maxSponsors})
      RETURNING *
    `;

    if (!packageRow) {
      throw APIError.internal("Failed to create package");
    }

    return {
      id: packageRow.id,
      name: packageRow.name,
      tier: packageRow.tier,
      basePrice: packageRow.base_price,
      description: packageRow.description,
      benefits: packageRow.benefits,
      maxSponsors: packageRow.max_sponsors,
      isActive: packageRow.is_active,
      createdAt: packageRow.created_at,
      updatedAt: packageRow.updated_at,
    };
  }
);

// Get all sponsorship packages
export const getPackages = api<void, { packages: PackageWithOpportunities[] }>(
  { method: "GET", path: "/sponsor/packages", expose: true },
  async () => {
    const packages = await db.queryAll`
      SELECT * FROM sponsorship_packages 
      WHERE is_active = true
      ORDER BY base_price ASC
    `;

    const packagesWithOpportunities: PackageWithOpportunities[] = [];

    for (const pkg of packages) {
      // Get opportunities for this package
      const opportunities = await db.queryAll`
        SELECT 
          eso.*,
          e.name as event_name,
          e.date as event_date,
          e.venue
        FROM event_sponsorship_opportunities eso
        JOIN events e ON eso.event_id = e.id
        WHERE eso.package_id = ${pkg.id} 
          AND eso.is_available = true
          AND e.date >= NOW()
        ORDER BY e.date ASC
      `;

      packagesWithOpportunities.push({
        id: pkg.id,
        name: pkg.name,
        tier: pkg.tier,
        basePrice: pkg.base_price,
        description: pkg.description,
        benefits: pkg.benefits,
        maxSponsors: pkg.max_sponsors,
        isActive: pkg.is_active,
        createdAt: pkg.created_at,
        updatedAt: pkg.updated_at,
        opportunities: opportunities.map(opp => ({
          eventId: opp.event_id,
          eventName: opp.event_name,
          eventDate: opp.event_date,
          venue: opp.venue,
          customPrice: opp.custom_price,
          availableSlots: opp.available_slots,
          soldSlots: opp.sold_slots,
        })),
      });
    }

    return { packages: packagesWithOpportunities };
  }
);

// Update a sponsorship package
export const updatePackage = api<UpdatePackageRequest, SponsorshipPackage>(
  { method: "PUT", path: "/sponsor/packages" },
  async ({ packageId, name, tier, basePrice, description, benefits, maxSponsors, isActive }) => {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (tier !== undefined) {
      updateFields.push(`tier = $${paramIndex}`);
      updateValues.push(tier);
      paramIndex++;
    }

    if (basePrice !== undefined) {
      updateFields.push(`base_price = $${paramIndex}`);
      updateValues.push(basePrice);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (benefits !== undefined) {
      updateFields.push(`benefits = $${paramIndex}`);
      updateValues.push(JSON.stringify(benefits));
      paramIndex++;
    }

    if (maxSponsors !== undefined) {
      updateFields.push(`max_sponsors = $${paramIndex}`);
      updateValues.push(maxSponsors);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(packageId);

    const query = `
      UPDATE sponsorship_packages 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const packageRow = await db.rawQueryRow(query, ...updateValues);

    if (!packageRow) {
      throw APIError.notFound("Package not found");
    }

    return {
      id: packageRow.id,
      name: packageRow.name,
      tier: packageRow.tier,
      basePrice: packageRow.base_price,
      description: packageRow.description,
      benefits: packageRow.benefits,
      maxSponsors: packageRow.max_sponsors,
      isActive: packageRow.is_active,
      createdAt: packageRow.created_at,
      updatedAt: packageRow.updated_at,
    };
  }
);

export interface CreateEventOpportunityRequest {
  eventId: number;
  packageId: number;
  customPrice?: number;
  customBenefits?: Record<string, any>;
  availableSlots?: number;
}

// Create sponsorship opportunity for an event
export const createEventOpportunity = api<CreateEventOpportunityRequest, EventSponsorshipOpportunity>(
  { method: "POST", path: "/sponsor/opportunities" },
  async ({ eventId, packageId, customPrice, customBenefits, availableSlots = 1 }) => {
    const opportunity = await db.queryRow`
      INSERT INTO event_sponsorship_opportunities (
        event_id, package_id, custom_price, custom_benefits, available_slots
      )
      VALUES (
        ${eventId}, ${packageId}, ${customPrice}, 
        ${customBenefits ? JSON.stringify(customBenefits) : null}, ${availableSlots}
      )
      RETURNING *
    `;

    if (!opportunity) {
      throw APIError.internal("Failed to create opportunity");
    }

    return {
      id: opportunity.id,
      eventId: opportunity.event_id,
      packageId: opportunity.package_id,
      customPrice: opportunity.custom_price,
      customBenefits: opportunity.custom_benefits,
      availableSlots: opportunity.available_slots,
      soldSlots: opportunity.sold_slots,
      isAvailable: opportunity.is_available,
      createdAt: opportunity.created_at,
    };
  }
);

export interface GetEventOpportunitiesParams {
  eventId: number;
}

// Get sponsorship opportunities for an event
export const getEventOpportunities = api<GetEventOpportunitiesParams, { opportunities: Array<EventSponsorshipOpportunity & { package: SponsorshipPackage }> }>(
  { method: "GET", path: "/sponsor/opportunities/:eventId", expose: true },
  async ({ eventId }) => {
    const opportunities = await db.queryAll`
      SELECT 
        eso.*,
        sp.name as package_name,
        sp.tier as package_tier,
        sp.base_price as package_base_price,
        sp.description as package_description,
        sp.benefits as package_benefits,
        sp.max_sponsors as package_max_sponsors,
        sp.is_active as package_is_active,
        sp.created_at as package_created_at,
        sp.updated_at as package_updated_at
      FROM event_sponsorship_opportunities eso
      JOIN sponsorship_packages sp ON eso.package_id = sp.id
      WHERE eso.event_id = ${eventId} 
        AND eso.is_available = true
        AND sp.is_active = true
      ORDER BY sp.base_price ASC
    `;

    return {
      opportunities: opportunities.map(opp => ({
        id: opp.id,
        eventId: opp.event_id,
        packageId: opp.package_id,
        customPrice: opp.custom_price,
        customBenefits: opp.custom_benefits,
        availableSlots: opp.available_slots,
        soldSlots: opp.sold_slots,
        isAvailable: opp.is_available,
        createdAt: opp.created_at,
        package: {
          id: opp.package_id,
          name: opp.package_name,
          tier: opp.package_tier,
          basePrice: opp.package_base_price,
          description: opp.package_description,
          benefits: opp.package_benefits,
          maxSponsors: opp.package_max_sponsors,
          isActive: opp.package_is_active,
          createdAt: opp.package_created_at,
          updatedAt: opp.package_updated_at,
        },
      })),
    };
  }
);
