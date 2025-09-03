import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { designerDB } from "./db";
import type { PortfolioItem } from "./types";

export interface ListPortfolioParams {
  designerId: number;
  collectionId?: Query<number>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListPortfolioResponse {
  items: PortfolioItem[];
  total: number;
}

// Lists portfolio items for a designer.
export const listPortfolio = api<ListPortfolioParams, ListPortfolioResponse>(
  { expose: true, method: "GET", path: "/designers/:designerId/portfolio" },
  async ({ designerId, collectionId, limit = 50, offset = 0 }) => {
    let whereClause = "WHERE designer_id = $1";
    const params: any[] = [designerId];
    let paramIndex = 2;

    if (collectionId) {
      whereClause += ` AND collection_id = $${paramIndex}`;
      params.push(collectionId);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM portfolio_items ${whereClause}`;
    const countResult = await designerDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM portfolio_items 
      ${whereClause}
      ORDER BY order_index ASC, created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await designerDB.rawQueryAll(query, ...params);

    const items = rows.map(row => ({
      id: row.id,
      designerId: row.designer_id,
      collectionId: row.collection_id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      imageKey: row.image_key,
      orderIndex: row.order_index,
      createdAt: row.created_at,
    }));

    return { items, total };
  }
);
