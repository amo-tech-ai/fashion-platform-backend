import { api, APIError } from "encore.dev/api";
import { sponsorDB } from "./db";
import type { Sponsor } from "./types";

export interface CreateSponsorRequest {
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
}

// Creates a new sponsor.
export const createSponsor = api<CreateSponsorRequest, Sponsor>(
  { expose: true, method: "POST", path: "/sponsors" },
  async (req) => {
    // Check if sponsor already exists
    const existing = await sponsorDB.queryRow`
      SELECT id FROM sponsors WHERE contact_email = ${req.contactEmail}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("Sponsor with this email already exists");
    }

    const row = await sponsorDB.queryRow<Sponsor>`
      INSERT INTO sponsors (
        company_name, contact_email, contact_phone, website, 
        logo_url, description, industry
      )
      VALUES (
        ${req.companyName}, ${req.contactEmail}, ${req.contactPhone}, ${req.website},
        ${req.logoUrl}, ${req.description}, ${req.industry}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create sponsor");
    }

    return {
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
    };
  }
);
