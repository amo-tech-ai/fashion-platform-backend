import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { User } from "./types";

export interface CreateUserRequest {
  name: string;
  email: string;
  role: "customer" | "organizer";
}

export const create = api<CreateUserRequest, User>(
  { method: "POST", path: "/users" },
  async ({ name, email, role }) => {
    const existing = await db.queryRow`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existing) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    const user = await db.queryRow`
      INSERT INTO users (name, email, role)
      VALUES (${name}, ${email}, ${role})
      RETURNING *
    `;

    if (!user) {
      throw APIError.internal("Failed to create user");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      createdAt: user.created_at,
    };
  }
);
