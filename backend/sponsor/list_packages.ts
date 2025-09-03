import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { SponsorPackage, PackageType } from "./types";

export interface ListPackagesParams {
  packageType?: Query<PackageType>;
  active?: Query<boolean>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListPackagesResponse {
  packages: SponsorPackage[];
  total: number;
}

// Lists sponsor packages with optional filtering.
export const listPackages = api<ListPackagesParams, ListPackagesResponse>(
  { expose: true, method: "GET", path: "/sponsors/packages" },
  async ({ packageType, active, limit = 20, offset = 0 }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (packageType) {
      whereClause += ` AND package_type = $${paramIndex}`;
      params.push(packageType);
      paramIndex++;
    }

    if (active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(active);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM sponsor_packages ${whereClause}`;
    const countResult = await sponsorDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM sponsor_packages 
      ${whereClause}
      ORDER BY price DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await sponsorDB.rawQueryAll(query, ...params);

    const packages = rows.map(row => ({
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
    }));

    return { packages, total };
  }
);
