import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, TrendingUp, Calendar, DollarSign, Users, 
  Trophy, Target, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import backend from '~backend/client';

export function VenueComparison() {
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

  const { data, isLoading } = useQuery({
    queryKey: ['venue-comparison', dateRange],
    queryFn: () => backend.venue.getComparison({ 
      startDate: start, 
      endDate: end 
    }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading venue comparison data.</div>;

  const { venues, topPerformer, averages } = data;

  const getPerformanceIndicator = (value: number, average: number) => {
    const diff = ((value - average) / average) * 100;
    if (Math.abs(diff) < 5) return { icon: null, color: 'text-gray-400', text: '±0%' };
    if (diff > 0) return { 
      icon: <ArrowUp className="h-3 w-3" />, 
      color: 'text-green-400', 
      text: `+${diff.toFixed(1)}%` 
    };
    return { 
      icon: <ArrowDown className="h-3 w-3" />, 
      color: 'text-red-400', 
      text: `${diff.toFixed(1)}%` 
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Venue Performance Comparison</h1>
            <p className="text-gray-400">Compare performance across all venues</p>
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

        {/* Top Performer & Averages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-600/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400">Top Performer</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">{topPerformer.venue}</div>
              <div className="text-sm text-yellow-400">
                ${topPerformer.totalRevenue.toLocaleString()} revenue
              </div>
              <div className="text-xs text-gray-400">
                {topPerformer.averageCapacityUtilization.toFixed(1)}% capacity utilization
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Revenue/Event</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${averages.revenuePerEvent.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Industry benchmark</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Utilization</CardTitle>
              <Target className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {averages.capacityUtilization.toFixed(1)}%
              </div>
              <Progress value={averages.capacityUtilization} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Venue Comparison Table */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <span>Venue Performance Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-white">Venue</TableHead>
                  <TableHead className="text-white text-right">Events</TableHead>
                  <TableHead className="text-white text-right">Total Revenue</TableHead>
                  <TableHead className="text-white text-right">Revenue/Event</TableHead>
                  <TableHead className="text-white text-right">Capacity Utilization</TableHead>
                  <TableHead className="text-white text-right">Booking Rate</TableHead>
                  <TableHead className="text-white text-center">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.map((venue, index) => {
                  const revenueIndicator = getPerformanceIndicator(venue.revenuePerEvent, averages.revenuePerEvent);
                  const utilizationIndicator = getPerformanceIndicator(venue.averageCapacityUtilization, averages.capacityUtilization);
                  const bookingIndicator = getPerformanceIndicator(venue.bookingRate, averages.bookingRate);

                  return (
                    <TableRow key={venue.venue} className="border-gray-800">
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center space-x-2">
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-400" />}
                          <span>{venue.venue}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-gray-300">{venue.totalEvents}</TableCell>
                      <TableCell className="text-right text-white">
                        ${venue.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-white">${venue.revenuePerEvent.toLocaleString()}</span>
                          <div className={`flex items-center ${revenueIndicator.color}`}>
                            {revenueIndicator.icon}
                            <span className="text-xs">{revenueIndicator.text}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-white">{venue.averageCapacityUtilization.toFixed(1)}%</span>
                          <div className={`flex items-center ${utilizationIndicator.color}`}>
                            {utilizationIndicator.icon}
                            <span className="text-xs">{utilizationIndicator.text}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-white">{venue.bookingRate.toFixed(1)}</span>
                          <div className={`flex items-center ${bookingIndicator.color}`}>
                            {bookingIndicator.icon}
                            <span className="text-xs">{bookingIndicator.text}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-1">
                          {venue.revenuePerEvent > averages.revenuePerEvent && (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                              Revenue+
                            </Badge>
                          )}
                          {venue.averageCapacityUtilization > averages.capacityUtilization && (
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                              Util+
                            </Badge>
                          )}
                          {venue.bookingRate > averages.bookingRate && (
                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                              Book+
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <span>Revenue Leaders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {venues.slice(0, 5).map((venue, index) => (
                  <div key={venue.venue} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                      <span className="text-white">{venue.venue}</span>
                    </div>
                    <span className="text-green-400 font-medium">
                      ${venue.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Utilization Leaders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {venues
                  .sort((a, b) => b.averageCapacityUtilization - a.averageCapacityUtilization)
                  .slice(0, 5)
                  .map((venue, index) => (
                    <div key={venue.venue} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                        <span className="text-white">{venue.venue}</span>
                      </div>
                      <span className="text-blue-400 font-medium">
                        {venue.averageCapacityUtilization.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                <span>Efficiency Leaders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {venues
                  .sort((a, b) => b.revenuePerEvent - a.revenuePerEvent)
                  .slice(0, 5)
                  .map((venue, index) => (
                    <div key={venue.venue} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                        <span className="text-white">{venue.venue}</span>
                      </div>
                      <span className="text-orange-400 font-medium">
                        ${venue.revenuePerEvent.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
