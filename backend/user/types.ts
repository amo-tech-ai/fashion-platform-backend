export type UserRole = "customer" | "organizer" | "designer" | "admin";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  profileImageUrl?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: number;
  userId: number;
  newsletterSubscribed: boolean;
  eventNotifications: boolean;
  marketingEmails: boolean;
  preferredLanguage: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
