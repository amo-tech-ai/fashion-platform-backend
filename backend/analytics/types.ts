export interface EventAnalytics {
  id: number;
  eventId: number;
  metricName: string;
  metricValue: number;
  metricDate: Date;
  createdAt: Date;
}

export interface DesignerAnalytics {
  id: number;
  designerId: number;
  metricName: string;
  metricValue: number;
  metricDate: Date;
  createdAt: Date;
}

export interface VenueAnalytics {
  id: number;
  venueId: number;
  metricName: string;
  metricValue: number;
  metricDate: Date;
  createdAt: Date;
}

export interface SponsorAnalytics {
  id: number;
  sponsorshipId: number;
  metricName: string;
  metricValue: number;
  metricDate: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}
