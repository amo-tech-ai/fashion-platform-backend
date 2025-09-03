import { api, APIError } from "encore.dev/api";
import { designerDB } from "./db";
import type { Designer } from "./types";

export interface GetDesignerParams {
  id: number;
}

// Retrieves a designer by ID.
export const get = api<GetDesignerParams, Designer>(
  { expose: true, method: "GET", path: "/designers/:id" },
  async ({ id }) => {
    const row = await designerDB.queryRow`
      SELECT * FROM designers WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("Designer not found");
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
