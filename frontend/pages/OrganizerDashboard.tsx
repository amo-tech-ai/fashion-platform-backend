import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, Ticket, TrendingUp, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function OrganizerDashboard() {
  // Mock organizer ID
  const organizerId = 1;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', organizerId],
    queryFn: () => backend.organizer.getDashboardMetrics({ organizerId }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading dashboard data.</div>;

  const { today, upcomingEvents, totalEvents, totalRevenue } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Fashion Events Dashboard</h1>
            <p className="text-gray-400">Welcome back, Organizer!</p>
          </div>
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Today's Bookings</CardTitle>
              <Ticket className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{today.bookings}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${today.revenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalEvents}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No upcoming events.</p>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 mb-4 md:mb-0">
                        <Link to={`/events/${event.id}/analytics`}>
                          <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors">{event.name}</h3>
                        </Link>
                        <p className="text-sm text-gray-400">{new Date(event.date).toLocaleDateString()} • {event.venue}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Sold</span>
                          <span className="text-white">{event.soldPercentage}%</span>
                        </div>
                        <Progress value={event.soldPercentage} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{event.ticketsSold} / {event.totalTickets} tickets</span>
                          <span>${event.revenue.toLocaleString()} revenue</span>
                        </div>
                      </div>
                      <div className="text-right md:ml-8 mt-4 md:mt-0">
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                          {event.daysUntil} days left
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
