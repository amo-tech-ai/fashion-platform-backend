import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { userDB } from "./db";
import type { User, UserRole } from "./types";

export interface ListUsersParams {
  limit?: Query<number>;
  offset?: Query<number>;
  role?: Query<UserRole>;
  active?: Query<boolean>;
  search?: Query<string>;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
}

// Lists users with optional filtering and pagination.
export const list = api<ListUsersParams, ListUsersResponse>(
  { expose: true, method: "GET", path: "/users" },
  async ({ limit = 20, offset = 0, role, active, search }) => {
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(active);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const countResult = await userDB.rawQueryRow(countQuery, ...params);
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const rows = await userDB.rawQueryAll(query, ...params);

    const users = rows.map(row => ({
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
    }));

    return { users, total };
  }
);
