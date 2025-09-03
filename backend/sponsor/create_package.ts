import { api, APIError } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { SponsorPackage, PackageType } from "./types";

export interface CreatePackageRequest {
  name: string;
  description?: string;
  packageType: PackageType;
  price: number;
  maxSponsors?: number;
  benefits: string[];
}

// Creates a new sponsor package.
export const createPackage = api<CreatePackageRequest, SponsorPackage>(
  { expose: true, method: "POST", path: "/sponsors/packages" },
  async (req) => {
    if (req.price < 0) {
      throw APIError.invalidArgument("Price must be non-negative");
    }

    if (req.benefits.length === 0) {
      throw APIError.invalidArgument("Package must include at least one benefit");
    }

    const row = await sponsorDB.queryRow<SponsorPackage>`
      INSERT INTO sponsor_packages (
        name, description, package_type, price, max_sponsors, benefits
      )
      VALUES (
        ${req.name}, ${req.description}, ${req.packageType}, ${req.price},
        ${req.maxSponsors || 1}, ${req.benefits}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create sponsor package");
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      packageType: row.package_type as PackageType,
      price: row.price,
      maxSponsors: row.max_sponsors,
      benefits: row.benefits || [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
