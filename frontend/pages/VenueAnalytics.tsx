import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, Calendar, DollarSign, Users, 
  Clock, Target, Lightbulb, AlertTriangle, CheckCircle,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import backend from '~backend/client';

export function VenueAnalytics() {
  const { venue } = useParams<{ venue: string }>();
  const [dateRange, setDateRange] = useState('12months');

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '3months':
        start.setMonth(start.getMonth() - 3);
        break;
      case '6months':
        start.setMonth(start.getMonth() - 6);
        break;
      case '12months':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setFullYear(start.getFullYear() - 1);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const { start, end } = getDateRange();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['venue-analytics', venue, dateRange],
    queryFn: () => backend.venue.getAnalytics({ 
      venue: venue!, 
      startDate: start, 
      endDate: end 
    }),
    enabled: !!venue,
  });

  const { data: optimization } = useQuery({
    queryKey: ['venue-optimization', venue],
    queryFn: () => backend.venue.getOptimization({ venue: venue! }),
    enabled: !!venue,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return <div>Error loading venue analytics.</div>;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-400" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-400" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-400" />;
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-400" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Venue Analytics</h1>
            <p className="text-gray-400">{analytics.venueName}</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${analytics.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">
                ${analytics.revenuePerEvent.toFixed(0)} per event
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Capacity Utilization</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analytics.averageCapacityUtilization.toFixed(1)}%
              </div>
              <Progress value={analytics.averageCapacityUtilization} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.totalEvents}</div>
              <p className="text-xs text-gray-400">
                {analytics.bookingRate.toFixed(1)} bookings per event
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.totalBookings}</div>
              <p className="text-xs text-gray-400">
                Booking rate: {analytics.bookingRate.toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Peak Booking Times */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <span>Peak Booking Times</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.peakBookingTimes.slice(0, 6).map((time) => (
                  <div key={time.hour} className="flex items-center justify-between">
                    <span className="text-gray-300">
                      {time.hour}:00 - {time.hour + 1}:00
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-400 h-2 rounded-full" 
                          style={{ width: `${time.percentage}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-12 text-right">
                        {time.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Trends */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                <span>Seasonal Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.seasonalTrends.slice(0, 6).map((trend) => (
                  <div key={trend.month} className="flex items-center justify-between">
                    <span className="text-gray-300 w-20">{trend.monthName.slice(0, 3)}</span>
                    <div className="flex-1 mx-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{trend.events} events</span>
                        <span>${trend.revenue.toLocaleString()}</span>
                      </div>
                      <Progress value={(trend.revenue / Math.max(...analytics.seasonalTrends.map(t => t.revenue))) * 100} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optimization Recommendations */}
        {optimization && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  <span>Optimization Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimization.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        {getPriorityIcon(rec.priority)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white font-medium">{rec.title}</h4>
                            <Badge 
                              className={`text-xs ${
                                rec.priority === 'high' ? 'bg-red-600/20 text-red-400 border-red-600/30' :
                                rec.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                                'bg-green-600/20 text-green-400 border-green-600/30'
                              }`}
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{rec.description}</p>
                          <p className="text-green-400 text-xs">{rec.expectedImpact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span>Pricing Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimization.pricingInsights.map((insight, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{insight.tierName}</h4>
                        <div className="flex items-center space-x-1">
                          {getPriceChangeIcon(insight.priceChange)}
                          <span className={`text-sm ${
                            insight.priceChange > 0 ? 'text-green-400' :
                            insight.priceChange < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {insight.priceChange > 0 ? '+' : ''}{insight.priceChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Current: ${insight.currentAveragePrice.toFixed(2)}</span>
                        <span className="text-white">Suggested: ${insight.suggestedPrice.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-400 text-xs">{insight.reasoning}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Event Performance Table */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Event Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-white">Event</TableHead>
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white text-right">Capacity</TableHead>
                  <TableHead className="text-white text-right">Sold</TableHead>
                  <TableHead className="text-white text-right">Utilization</TableHead>
                  <TableHead className="text-white text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.eventPerformance.slice(0, 10).map((event) => (
                  <TableRow key={event.eventId} className="border-gray-800">
                    <TableCell className="text-white">{event.eventName}</TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(event.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">{event.capacity}</TableCell>
                    <TableCell className="text-right text-gray-300">{event.ticketsSold}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={`text-sm ${
                          event.capacityUtilization >= 90 ? 'text-green-400' :
                          event.capacityUtilization >= 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {event.capacityUtilization.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-white">
                      ${event.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
