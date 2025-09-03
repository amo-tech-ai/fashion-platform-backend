import { api, APIError } from "encore.dev/api";
import { organizerDB } from "./db";
import type { EventOrganizer } from "./types";

export interface CreateOrganizerRequest {
  userId: number;
  companyName: string;
  bio?: string;
  website?: string;
  phone?: string;
  email: string;
  specializations?: string[];
  yearsExperience?: number;
  portfolioUrl?: string;
}

// Creates a new event organizer profile.
export const createOrganizer = api<CreateOrganizerRequest, EventOrganizer>(
  { expose: true, method: "POST", path: "/organizers" },
  async (req) => {
    // Check if organizer already exists for this user
    const existing = await organizerDB.queryRow`
      SELECT id FROM event_organizers WHERE user_id = ${req.userId}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("Organizer profile already exists for this user");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.email)) {
      throw APIError.invalidArgument("Invalid email format");
    }

    const row = await organizerDB.queryRow`
      INSERT INTO event_organizers (
        user_id, company_name, bio, website, phone, email, 
        specializations, years_experience, portfolio_url
      )
      VALUES (
        ${req.userId}, ${req.companyName}, ${req.bio}, ${req.website}, ${req.phone}, 
        ${req.email}, ${req.specializations || []}, ${req.yearsExperience || 0}, ${req.portfolioUrl}
      )
      RETURNING *
    `;

    if (!row) {
      throw APIError.internal("Failed to create organizer profile");
    }

    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      bio: row.bio,
      website: row.website,
      phone: row.phone,
      email: row.email,
      verificationStatus: row.verification_status as any,
      specializations: row.specializations || [],
      yearsExperience: row.years_experience,
      portfolioUrl: row.portfolio_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
