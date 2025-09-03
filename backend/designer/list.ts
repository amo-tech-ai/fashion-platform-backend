import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { designerDB } from "./db";
import type { Designer, VerificationStatus } from "./types";

export interface ListDesignersParams {
  limit?: Query<number>;
  offset?: Query<number>;
  verificationStatus?: Query<VerificationStatus>;
  search?: Query<string>;
}

export interface ListDesignersResponse {
  designers: Designer[];
  total: number;
}

// Lists designers with optional filtering and pagination.
export const list = api<ListDesignersParams, ListDesignersResponse>(
  { expose: true, method: "GET", path: "/designers" },
  async ({ limit = 20, offset = 0, verificationStatus, search }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (verificationStatus) {
      whereClause += ` AND verification_status = $${paramIndex}`;
      params.push(verificationStatus);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (brand_name ILIKE $${paramIndex} OR bio ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM designers ${whereClause}`;
    const countResult = await designerDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM designers 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await designerDB.rawQueryAll(query, ...params);

    const designers = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      brandName: row.brand_name,
      bio: row.bio,
      website: row.website,
      instagram: row.instagram,
      verificationStatus: row.verification_status as any,
      verificationNotes: row.verification_notes,
      commissionRate: row.commission_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { designers, total };
  }
);
