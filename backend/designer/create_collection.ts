import { api, APIError } from "encore.dev/api";
import { designerDB } from "./db";
import type { Collection } from "./types";

export interface CreateCollectionRequest {
  designerId: number;
  name: string;
  description?: string;
  season?: string;
  year?: number;
  isFeatured?: boolean;
}

// Creates a new collection for a designer.
export const createCollection = api<CreateCollectionRequest, Collection>(
  { expose: true, method: "POST", path: "/designers/collections" },
  async (req) => {
    // Verify designer exists
    const designer = await designerDB.queryRow`
      SELECT id FROM designers WHERE id = ${req.designerId}
    `;
    
    if (!designer) {
      throw APIError.notFound("Designer not found");
    }

    const row = await designerDB.queryRow<Collection>`
      INSERT INTO collections (designer_id, name, description, season, year, is_featured)
      VALUES (${req.designerId}, ${req.name}, ${req.description}, ${req.season}, ${req.year}, ${req.isFeatured || false})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create collection");
    }

    return {
      id: row.id,
      designerId: row.designer_id,
      name: row.name,
      description: row.description,
      season: row.season,
      year: row.year,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
