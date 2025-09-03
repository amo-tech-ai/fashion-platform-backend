import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { designerDB } from "./db";
import type { Collection } from "./types";

export interface ListCollectionsParams {
  designerId?: Query<number>;
  limit?: Query<number>;
  offset?: Query<number>;
  featured?: Query<boolean>;
}

export interface ListCollectionsResponse {
  collections: Collection[];
  total: number;
}

// Lists collections with optional filtering.
export const listCollections = api<ListCollectionsParams, ListCollectionsResponse>(
  { expose: true, method: "GET", path: "/designers/collections" },
  async ({ designerId, limit = 20, offset = 0, featured }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (designerId) {
      whereClause += ` AND designer_id = $${paramIndex}`;
      params.push(designerId);
      paramIndex++;
    }

    if (featured !== undefined) {
      whereClause += ` AND is_featured = $${paramIndex}`;
      params.push(featured);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM collections ${whereClause}`;
    const countResult = await designerDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM collections 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await designerDB.rawQueryAll(query, ...params);

    const collections = rows.map(row => ({
      id: row.id,
      designerId: row.designer_id,
      name: row.name,
      description: row.description,
      season: row.season,
      year: row.year,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { collections, total };
  }
);
