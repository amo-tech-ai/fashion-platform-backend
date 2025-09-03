export interface VenueAnalytics {
  venueId: string;
  venueName: string;
  totalEvents: number;
  totalRevenue: number;
  totalBookings: number;
  averageCapacityUtilization: number;
  bookingRate: number;
  revenuePerEvent: number;
  peakBookingTimes: PeakBookingTime[];
  seasonalTrends: SeasonalTrend[];
  monthlyMetrics: MonthlyMetric[];
  eventPerformance: EventPerformance[];
}

export interface PeakBookingTime {
  hour: number;
  bookingCount: number;
  percentage: number;
}

export interface SeasonalTrend {
  month: number;
  monthName: string;
  events: number;
  revenue: number;
  bookings: number;
  averageTicketPrice: number;
}

export interface MonthlyMetric {
  month: string;
  events: number;
  revenue: number;
  bookings: number;
  capacityUtilization: number;
}

export interface EventPerformance {
  eventId: number;
  eventName: string;
  date: Date;
  capacity: number;
  ticketsSold: number;
  revenue: number;
  capacityUtilization: number;
  selloutTime?: Date;
}

export interface VenueComparison {
  venue: string;
  totalEvents: number;
  totalRevenue: number;
  averageCapacityUtilization: number;
  revenuePerEvent: number;
  bookingRate: number;
}

export interface VenueOptimization {
  venue: string;
  recommendations: OptimizationRecommendation[];
  pricingInsights: PricingInsight[];
  availabilityInsights: AvailabilityInsight[];
}

export interface OptimizationRecommendation {
  type: 'pricing' | 'scheduling' | 'capacity' | 'marketing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
}

export interface PricingInsight {
  tierName: string;
  currentAveragePrice: number;
  suggestedPrice: number;
  priceChange: number;
  reasoning: string;
}

export interface AvailabilityInsight {
  dayOfWeek: string;
  currentUtilization: number;
  suggestedAction: string;
  potentialRevenue: number;
}
