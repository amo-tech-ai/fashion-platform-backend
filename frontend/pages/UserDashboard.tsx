import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, MapPin, Clock, DollarSign, Ticket, 
  Heart, Star, TrendingUp, Filter, Download,
  User, Mail, Settings, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import backend from '~backend/client';

export function UserDashboard() {
  const [userEmail, setUserEmail] = useState('user@example.com'); // In real app, get from auth
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyLimit, setHistoryLimit] = useState(10);

  const { data: bookingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['booking-history', userEmail, historyFilter, historyLimit],
    queryFn: () => backend.user.getBookingHistory({ 
      email: userEmail,
      limit: historyLimit,
      status: historyFilter === 'all' ? undefined : historyFilter
    }),
    enabled: !!userEmail,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations', userEmail],
    queryFn: () => backend.recommendation.getRecommendations({ email: userEmail }),
    enabled: !!userEmail,
  });

  const { data: insights } = useQuery({
    queryKey: ['booking-insights', userEmail],
    queryFn: () => backend.user.getBookingInsights({ email: userEmail }),
    enabled: !!userEmail,
  });

  if (historyLoading && recommendationsLoading) {
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

  const stats = bookingHistory?.stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
            <p className="text-gray-400">Track your bookings and discover new events</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="email" className="text-gray-300">Email:</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-64 bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your email"
              />
            </div>
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Bookings</CardTitle>
                <Ticket className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalBookings}</div>
                <p className="text-xs text-gray-400">
                  {stats.upcomingEvents} upcoming, {stats.pastEvents} past
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">${stats.totalSpent.toLocaleString()}</div>
                <p className="text-xs text-gray-400">
                  ${(stats.totalSpent / Math.max(stats.totalBookings, 1)).toFixed(0)} avg per booking
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Favorite Venue</CardTitle>
                <MapPin className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white">{stats.favoriteVenue}</div>
                <p className="text-xs text-gray-400">Most visited location</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Preferred Type</CardTitle>
                <Star className="h-4 w-4 text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white">{stats.mostBookedEventType}</div>
                <p className="text-xs text-gray-400">Most booked ticket type</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-600">
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              Booking History
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-purple-600">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-6">
            {/* Personalized Insights */}
            {recommendations?.personalizedInsights && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    <span>Your Profile</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-gray-400 text-sm mb-2">Favorite Venues</h4>
                      <div className="space-y-1">
                        {recommendations.personalizedInsights.favoriteVenues.slice(0, 3).map((venue, index) => (
                          <Badge key={venue} className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                            {venue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-sm mb-2">Preferred Types</h4>
                      <div className="space-y-1">
                        {recommendations.personalizedInsights.preferredEventTypes.slice(0, 3).map((type, index) => (
                          <Badge key={type} className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-sm mb-2">Average Spending</h4>
                      <div className="text-white font-semibold">
                        ${recommendations.personalizedInsights.averageSpending.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-sm mb-2">Booking Frequency</h4>
                      <Badge className={`${
                        recommendations.personalizedInsights.bookingFrequency === 'frequent' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                        recommendations.personalizedInsights.bookingFrequency === 'regular' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                        'bg-gray-600/20 text-gray-400 border-gray-600/30'
                      }`}>
                        {recommendations.personalizedInsights.bookingFrequency}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Events */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-pink-400" />
                  <span>Recommended for You</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendationsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                  </div>
                ) : recommendations?.recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recommendations available yet.</p>
                    <p className="text-gray-500 text-sm">Book some events to get personalized recommendations!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations?.recommendations.slice(0, 5).map((event) => (
                      <div key={event.id} className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg">{event.name}</h3>
                            <div className="flex items-center space-x-4 text-gray-400 text-sm mt-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span>{event.venue}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-4 w-4" />
                                <span>From ${event.minPrice}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-purple-400 font-semibold text-sm">
                              {event.recommendationScore}% match
                            </div>
                            <Progress value={event.recommendationScore} className="w-20 h-2 mt-1" />
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {event.recommendationReasons.map((reason, index) => (
                            <Badge key={index} className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="text-gray-400 text-sm">
                            {event.available} tickets available
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Ticket className="h-5 w-5 text-purple-400" />
                    <span>Booking History</span>
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <Select value={historyFilter} onValueChange={setHistoryFilter}>
                      <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <Skeleton className="h-64" />
                ) : bookingHistory?.bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No bookings found.</p>
                    <p className="text-gray-500 text-sm">Start booking events to see your history here!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-white">Event</TableHead>
                        <TableHead className="text-white">Date</TableHead>
                        <TableHead className="text-white">Venue</TableHead>
                        <TableHead className="text-white">Tickets</TableHead>
                        <TableHead className="text-white text-right">Amount</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Booking Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingHistory?.bookings.map((booking) => (
                        <TableRow key={booking.bookingId} className="border-gray-800">
                          <TableCell className="text-white font-medium">
                            {booking.eventName}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(booking.eventDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-300">{booking.venue}</TableCell>
                          <TableCell className="text-gray-300">
                            {booking.quantity}× {booking.ticketTierName}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            ${booking.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${
                              booking.status === 'confirmed' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                              booking.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                              'bg-red-600/20 text-red-400 border-red-600/30'
                            }`}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {booking.bookingCode}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {insights && (
              <>
                {/* Venue Preferences */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      <span>Venue Preferences</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {insights.venuePreferences.slice(0, 5).map((venue, index) => (
                        <div key={venue.venue} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                            <div>
                              <div className="text-white font-medium">{venue.venue}</div>
                              <div className="text-gray-400 text-sm">
                                {venue.booking_count} bookings • Last: {new Date(venue.last_booking).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold">${venue.total_spent.toLocaleString()}</div>
                            <div className="text-gray-400 text-sm">${venue.avg_spent.toFixed(0)} avg</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Spending Patterns */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-green-400" />
                      <span>Spending Patterns (Last 12 Months)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.spendingPatterns.map((pattern) => (
                        <div key={pattern.month} className="flex items-center justify-between">
                          <span className="text-gray-300">
                            {new Date(pattern.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </span>
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-400 text-sm">{pattern.bookings} bookings</span>
                            <span className="text-white font-medium">${pattern.total_spent.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
