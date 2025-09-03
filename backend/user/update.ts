import { api, APIError } from "encore.dev/api";
import { userDB } from "./db";
import type { User, UserRole } from "./types";

export interface UpdateUserParams {
  id: number;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  profileImageUrl?: string;
  role?: UserRole;
}

// Updates a user's profile information.
export const update = api<UpdateUserParams & UpdateUserRequest, User>(
  { expose: true, method: "PUT", path: "/users/:id" },
  async ({ id, firstName, lastName, phone, dateOfBirth, profileImageUrl, role }) => {
    let updateClause = "SET updated_at = NOW()";
    const params: any[] = [];
    let paramIndex = 1;

    if (firstName) {
      updateClause += `, first_name = $${paramIndex}`;
      params.push(firstName);
      paramIndex++;
    }

    if (lastName) {
      updateClause += `, last_name = $${paramIndex}`;
      params.push(lastName);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateClause += `, phone = $${paramIndex}`;
      params.push(phone);
      paramIndex++;
    }

    if (dateOfBirth !== undefined) {
      updateClause += `, date_of_birth = $${paramIndex}`;
      params.push(dateOfBirth);
      paramIndex++;
    }

    if (profileImageUrl !== undefined) {
      updateClause += `, profile_image_url = $${paramIndex}`;
      params.push(profileImageUrl);
      paramIndex++;
    }

    if (role) {
      updateClause += `, role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    const query = `
      UPDATE users 
      ${updateClause}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    params.push(id);

    const row = await userDB.rawQueryRow(query, ...params);

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
