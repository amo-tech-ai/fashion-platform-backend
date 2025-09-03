import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { Sponsor } from "./types";

export interface ListSponsorsParams {
  limit?: Query<number>;
  offset?: Query<number>;
  industry?: Query<string>;
  search?: Query<string>;
}

export interface ListSponsorsResponse {
  sponsors: Sponsor[];
  total: number;
}

// Lists sponsors with optional filtering and pagination.
export const listSponsors = api<ListSponsorsParams, ListSponsorsResponse>(
  { expose: true, method: "GET", path: "/sponsors" },
  async ({ limit = 20, offset = 0, industry, search }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (industry) {
      whereClause += ` AND industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (company_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM sponsors ${whereClause}`;
    const countResult = await sponsorDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM sponsors 
      ${whereClause}
      ORDER BY company_name ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await sponsorDB.rawQueryAll(query, ...params);

    const sponsors = rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      logoUrl: row.logo_url,
      description: row.description,
      industry: row.industry,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { sponsors, total };
  }
);
