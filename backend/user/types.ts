export type UserRole = "customer" | "organizer";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
