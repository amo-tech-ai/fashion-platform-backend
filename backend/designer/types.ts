export type VerificationStatus = "pending" | "verified" | "rejected";

export interface Designer {
  id: number;
  userId: number;
  brandName: string;
  bio?: string;
  website?: string;
  instagram?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  commissionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: number;
  designerId: number;
  name: string;
  description?: string;
  season?: string;
  year?: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  id: number;
  designerId: number;
  collectionId?: number;
  title: string;
  description?: string;
  imageUrl: string;
  imageKey: string;
  orderIndex: number;
  createdAt: Date;
}
