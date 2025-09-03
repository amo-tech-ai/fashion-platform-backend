import { api, APIError } from "encore.dev/api";
import { designerDB } from "./db";
import type { PortfolioItem } from "./types";

export interface AddPortfolioItemRequest {
  designerId: number;
  collectionId?: number;
  title: string;
  description?: string;
  imageUrl: string;
  imageKey: string;
  orderIndex?: number;
}

// Adds a new portfolio item for a designer.
export const addPortfolioItem = api<AddPortfolioItemRequest, PortfolioItem>(
  { expose: true, method: "POST", path: "/designers/portfolio" },
  async (req) => {
    // Verify designer exists
    const designer = await designerDB.queryRow`
      SELECT id FROM designers WHERE id = ${req.designerId}
    `;
    
    if (!designer) {
      throw APIError.notFound("Designer not found");
    }

    // Verify collection exists if provided
    if (req.collectionId) {
      const collection = await designerDB.queryRow`
        SELECT id FROM collections WHERE id = ${req.collectionId} AND designer_id = ${req.designerId}
      `;
      
      if (!collection) {
        throw APIError.notFound("Collection not found or doesn't belong to designer");
      }
    }

    // Get next order index if not provided
    let orderIndex = req.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await designerDB.queryRow`
        SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
        FROM portfolio_items 
        WHERE designer_id = ${req.designerId}
      `;
      orderIndex = maxOrder?.next_order || 0;
    }

    const row = await designerDB.queryRow<PortfolioItem>`
      INSERT INTO portfolio_items (designer_id, collection_id, title, description, image_url, image_key, order_index)
      VALUES (${req.designerId}, ${req.collectionId}, ${req.title}, ${req.description}, ${req.imageUrl}, ${req.imageKey}, ${orderIndex})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to add portfolio item");
    }

    return {
      id: row.id,
      designerId: row.designer_id,
      collectionId: row.collection_id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      imageKey: row.image_key,
      orderIndex: row.order_index,
      createdAt: row.created_at,
    };
  }
);
