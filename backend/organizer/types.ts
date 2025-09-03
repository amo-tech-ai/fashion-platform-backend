export interface DashboardMetrics {
  today: {
    bookings: number;
    revenue: number;
  };
  upcomingEvents: EventMetric[];
  totalEvents: number;
  totalRevenue: number;
}

export interface EventMetric {
  id: number;
  name: string;
  date: Date;
  venue: string;
  soldPercentage: number;
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  daysUntil: number;
}
