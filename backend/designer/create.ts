import { api, APIError } from "encore.dev/api";
import { designerDB } from "./db";
import type { Designer } from "./types";

export interface CreateDesignerRequest {
  userId: number;
  brandName: string;
  bio?: string;
  website?: string;
  instagram?: string;
}

// Creates a new designer profile.
export const create = api<CreateDesignerRequest, Designer>(
  { expose: true, method: "POST", path: "/designers" },
  async (req) => {
    // Check if designer already exists for this user
    const existing = await designerDB.queryRow`
      SELECT id FROM designers WHERE user_id = ${req.userId}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("Designer profile already exists for this user");
    }

    const row = await designerDB.queryRow<Designer>`
      INSERT INTO designers (user_id, brand_name, bio, website, instagram)
      VALUES (${req.userId}, ${req.brandName}, ${req.bio}, ${req.website}, ${req.instagram})
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create designer");
    }

    return {
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
    };
  }
);
