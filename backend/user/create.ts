import { api, APIError } from "encore.dev/api";
import { userDB } from "./db";
import type { User, UserRole } from "./types";

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  role?: UserRole;
}

// Creates a new user.
export const create = api<CreateUserRequest, User>(
  { expose: true, method: "POST", path: "/users" },
  async (req) => {
    // Check if user already exists
    const existing = await userDB.queryRow`
      SELECT id FROM users WHERE email = ${req.email}
    `;
    
    if (existing) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.email)) {
      throw APIError.invalidArgument("Invalid email format");
    }

    await using tx = await userDB.begin();

    try {
      // Create user
      const userRow = await tx.queryRow<User>`
        INSERT INTO users (email, first_name, last_name, phone, date_of_birth, role)
        VALUES (${req.email}, ${req.firstName}, ${req.lastName}, ${req.phone}, ${req.dateOfBirth}, ${req.role || 'customer'})
        RETURNING *
      `;

      if (!userRow) {
        throw APIError.internal("Failed to create user");
      }

      // Create default preferences
      await tx.exec`
        INSERT INTO user_preferences (user_id)
        VALUES (${userRow.id})
      `;

      await tx.commit();

      return {
        id: userRow.id,
        email: userRow.email,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        phone: userRow.phone,
        dateOfBirth: userRow.date_of_birth,
        profileImageUrl: userRow.profile_image_url,
        role: userRow.role as UserRole,
        isActive: userRow.is_active,
        emailVerified: userRow.email_verified,
        lastLogin: userRow.last_login,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      };

    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);
