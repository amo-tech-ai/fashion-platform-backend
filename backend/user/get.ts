import { api, APIError } from "encore.dev/api";
import { userDB } from "./db";
import type { User, UserRole } from "./types";

export interface GetUserParams {
  id: number;
}

// Retrieves a user by ID.
export const get = api<GetUserParams, User>(
  { expose: true, method: "GET", path: "/users/:id" },
  async ({ id }) => {
    const row = await userDB.queryRow`
      SELECT * FROM users WHERE id = ${id}
    `;

    if (!row) {
      throw APIError.notFound("User not found");
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      dateOfBirth: row.date_of_birth,
      profileImageUrl: row.profile_image_url,
      role: row.role as UserRole,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
);
