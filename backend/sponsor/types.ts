export type PackageType = "title" | "presenting" | "gold" | "silver" | "bronze" | "media";
export type SponsorshipStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface Sponsor {
  id: number;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorPackage {
  id: number;
  name: string;
  description?: string;
  packageType: PackageType;
  price: number;
  maxSponsors: number;
  benefits: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventSponsorship {
  id: number;
  eventId: number;
  sponsorId: number;
  packageId: number;
  amountPaid: number;
  contractSignedAt?: Date;
  status: SponsorshipStatus;
  visibilityMetrics: Record<string, any>;
  roiMetrics: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SponsorBenefit {
  id: number;
  sponsorshipId: number;
  benefitType: string;
  benefitValue: string;
  isDelivered: boolean;
  deliveredAt?: Date;
  notes?: string;
  createdAt: Date;
}
