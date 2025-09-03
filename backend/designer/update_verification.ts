import { api, APIError } from "encore.dev/api";
import { designerDB } from "./db";
import type { Designer, VerificationStatus } from "./types";

export interface UpdateVerificationParams {
  id: number;
}

export interface UpdateVerificationRequest {
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
}

// Updates a designer's verification status.
export const updateVerification = api<UpdateVerificationParams & UpdateVerificationRequest, Designer>(
  { expose: true, method: "PUT", path: "/designers/:id/verification" },
  async ({ id, verificationStatus, verificationNotes }) => {
    const row = await designerDB.queryRow`
      UPDATE designers 
      SET verification_status = ${verificationStatus}, 
          verification_notes = ${verificationNotes},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
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
