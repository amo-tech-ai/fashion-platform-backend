import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Calendar, DollarSign, Ticket, TrendingUp, PlusCircle, Building2,
  Users, Clock, Target, AlertTriangle, CheckCircle, BarChart3,
  Mail, MessageSquare, FileText, Download, RefreshCw, Bell,
  Eye, Share2, Heart, MousePointer, Zap, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function OrganizerDashboard() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock organizer ID
  const organizerId = 1;

  const { data: dashboardMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', organizerId],
    queryFn: () => backend.organizer.getDashboardMetrics({ organizerId }),
  });

  const { data: realTimeAnalytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['realtime-analytics', organizerId, selectedEvent],
    queryFn: () => backend.organizer.getRealTimeAnalytics({ organizerId, eventId: selectedEvent }),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: communicationHistory } = useQuery({
    queryKey: ['communication-history', organizerId, selectedEvent],
    queryFn: () => backend.organizer.getCommunicationHistory({ organizerId, eventId: selectedEvent }),
  });

  // Auto-refresh controls
  useEffect(() => {
    const interval = setInterval(() => {
      if (autoRefresh) {
        refetchAnalytics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchAnalytics]);

  const handleGenerateReport = async (reportType: string) => {
    try {
      const report = await backend.organizer.generateReport({
        organizerId,
        eventId: selectedEvent,
        reportType: reportType as any,
        includeComparisons: true,
        emailRecipients: ['organizer@example.com'],
      });

      toast({
        title: "Report Generated",
        description: `${reportType} report has been generated and emailed.`,
      });
    } catch (error: any) {
      toast({
        title: "Report Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  if (metricsLoading && analyticsLoading) {
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_sales': return <TrendingUp className="h-4 w-4" />;
      case 'high_demand': return <Zap className="h-4 w-4" />;
      case 'capacity_warning': return <Users className="h-4 w-4" />;
      case 'refund_spike': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'high': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default: return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
            <p className="text-gray-400">Real-time insights and event management</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Event Selector */}
            <Select value={selectedEvent?.toString()} onValueChange={(value) => setSelectedEvent(value ? parseInt(value) : undefined)}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="">All Events</SelectItem>
                {dashboardMetrics?.upcomingEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Auto-refresh controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`border-gray-600 ${autoRefresh ? 'text-green-400' : 'text-gray-300'}`}
              >
                <Activity className="h-4 w-4 mr-2" />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAnalytics()}
                className="border-gray-600 text-gray-300"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Link to="/venues/comparison">
              <Button variant="outline" className="border-gray-600 text-gray-300">
                <Building2 className="h-4 w-4 mr-2" />
                Venue Analytics
              </Button>
            </Link>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        {/* Alerts Section */}
        {realTimeAnalytics?.alerts && realTimeAnalytics.alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Active Alerts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {realTimeAnalytics.alerts.map((alert) => (
                <Card key={alert.id} className={`border ${getAlertColor(alert.severity)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getAlertColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{alert.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{alert.message}</p>
                        <div className="flex items-center justify-between mt-3">
                          <Badge className={getAlertColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.actionRequired && (
                            <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                              Take Action
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="realtime" className="data-[state=active]:bg-purple-600">
              Real-time Analytics
            </TabsTrigger>
            <TabsTrigger value="demographics" className="data-[state=active]:bg-purple-600">
              Demographics
            </TabsTrigger>
            <TabsTrigger value="marketing" className="data-[state=active]:bg-purple-600">
              Marketing
            </TabsTrigger>
            <TabsTrigger value="communications" className="data-[state=active]:bg-purple-600">
              Communications
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Dashboard Metrics */}
            {dashboardMetrics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Today's Bookings</CardTitle>
                      <Ticket className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{dashboardMetrics.today.bookings}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Today's Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">${dashboardMetrics.today.revenue.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Total Events</CardTitle>
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{dashboardMetrics.totalEvents}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">${dashboardMetrics.totalRevenue.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming Events */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Upcoming Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {dashboardMetrics.upcomingEvents.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No upcoming events.</p>
                      ) : (
                        dashboardMetrics.upcomingEvents.map(event => (
                          <div key={event.id} className="p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                              <div className="flex-1 mb-4 md:mb-0">
                                <Link to={`/organizer/events/${event.id}/analytics`}>
                                  <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors">{event.name}</h3>
                                </Link>
                                <p className="text-sm text-gray-400">{new Date(event.date).toLocaleDateString()} • {event.venue}</p>
                                <Link 
                                  to={`/venues/${encodeURIComponent(event.venue)}/analytics`}
                                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                  View venue analytics →
                                </Link>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            {realTimeAnalytics && (
              <>
                {/* Real-time Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Sales Velocity</CardTitle>
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {realTimeAnalytics.realTimeMetrics.salesVelocity.toFixed(1)}
                      </div>
                      <p className="text-xs text-gray-400">bookings/hour</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
                      <Target className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {realTimeAnalytics.realTimeMetrics.conversionRate.toFixed(1)}%
                      </div>
                      <Progress value={realTimeAnalytics.realTimeMetrics.conversionRate} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Avg Ticket Price</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        ${realTimeAnalytics.realTimeMetrics.averageTicketPrice.toFixed(0)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-400">Refund Rate</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {realTimeAnalytics.realTimeMetrics.refundRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Today's Hourly Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {realTimeAnalytics.salesTimeline.hourlyData.slice(8, 20).map((hour) => (
                          <div key={hour.hour} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">{hour.hour}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-purple-400 h-2 rounded-full" 
                                  style={{ width: `${(hour.bookings / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-white text-sm w-12 text-right">
                                {hour.bookings}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Weekly Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {realTimeAnalytics.salesTimeline.weeklyData.slice(-4).map((week) => (
                          <div key={week.week} className="flex items-center justify-between">
                            <span className="text-gray-300">{week.week}</span>
                            <div className="text-right">
                              <div className="text-white font-semibold">${week.revenue.toLocaleString()}</div>
                              <div className="text-gray-400 text-sm">{week.bookings} bookings</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="demographics" className="space-y-6">
            {realTimeAnalytics?.attendeeDemographics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Groups */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {realTimeAnalytics.attendeeDemographics.ageGroups.map((group) => (
                        <div key={group.range} className="flex items-center justify-between">
                          <span className="text-gray-300">{group.range}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-400 h-2 rounded-full" 
                                style={{ width: `${group.percentage}%` }}
                              />
                            </div>
                            <span className="text-white text-sm w-12 text-right">
                              {group.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Gender Distribution */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {realTimeAnalytics.attendeeDemographics.genderDistribution.map((gender) => (
                        <div key={gender.gender} className="flex items-center justify-between">
                          <span className="text-gray-300">{gender.gender}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-pink-400 h-2 rounded-full" 
                                style={{ width: `${gender.percentage}%` }}
                              />
                            </div>
                            <span className="text-white text-sm w-12 text-right">
                              {gender.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Location Distribution */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Geographic Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {realTimeAnalytics.attendeeDemographics.locationDistribution.map((location) => (
                        <div key={location.location} className="flex items-center justify-between">
                          <span className="text-gray-300">{location.location}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-400 h-2 rounded-full" 
                                style={{ width: `${location.percentage}%` }}
                              />
                            </div>
                            <span className="text-white text-sm w-12 text-right">
                              {location.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Type */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Customer Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {realTimeAnalytics.attendeeDemographics.newCustomers}
                        </div>
                        <div className="text-gray-400 text-sm">New Customers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {realTimeAnalytics.attendeeDemographics.repeatCustomers}
                        </div>
                        <div className="text-gray-400 text-sm">Repeat Customers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            {realTimeAnalytics?.marketingMetrics && (
              <>
                {/* Campaign Performance */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Campaign Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-white">Source</TableHead>
                          <TableHead className="text-white text-right">Visitors</TableHead>
                          <TableHead className="text-white text-right">Conversions</TableHead>
                          <TableHead className="text-white text-right">Conv. Rate</TableHead>
                          <TableHead className="text-white text-right">Revenue</TableHead>
                          <TableHead className="text-white text-right">ROI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {realTimeAnalytics.marketingMetrics.campaignPerformance.map((campaign) => (
                          <TableRow key={campaign.source} className="border-gray-800">
                            <TableCell className="text-white">{campaign.source}</TableCell>
                            <TableCell className="text-right text-gray-300">{campaign.visitors.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-gray-300">{campaign.conversions}</TableCell>
                            <TableCell className="text-right text-gray-300">{campaign.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell className="text-right text-white">${campaign.revenue.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <span className={campaign.roi > 100 ? 'text-green-400' : 'text-red-400'}>
                                {campaign.roi.toFixed(0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Social Media & Email Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Share2 className="h-5 w-5 text-blue-400" />
                        <span>Social Media Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {realTimeAnalytics.marketingMetrics.socialMediaMetrics.reach.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-sm">Reach</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {realTimeAnalytics.marketingMetrics.socialMediaMetrics.engagement.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-sm">Engagement</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {realTimeAnalytics.marketingMetrics.socialMediaMetrics.likes.toLocaleString()}
                          </div>
                          <div className="text-gray-400 text-sm">Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {realTimeAnalytics.marketingMetrics.socialMediaMetrics.shares}
                          </div>
                          <div className="text-gray-400 text-sm">Shares</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-green-400" />
                        <span>Email Campaign Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Sent</span>
                          <span className="text-white">{realTimeAnalytics.marketingMetrics.emailMetrics.sent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Open Rate</span>
                          <span className="text-white">{realTimeAnalytics.marketingMetrics.emailMetrics.openRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Click Rate</span>
                          <span className="text-white">{realTimeAnalytics.marketingMetrics.emailMetrics.clickRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Unsubscribed</span>
                          <span className="text-white">{realTimeAnalytics.marketingMetrics.emailMetrics.unsubscribed}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Event Communications</h2>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Update
              </Button>
            </div>

            {communicationHistory && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Communications</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-white">Type</TableHead>
                        <TableHead className="text-white">Subject</TableHead>
                        <TableHead className="text-white text-right">Recipients</TableHead>
                        <TableHead className="text-white text-right">Open Rate</TableHead>
                        <TableHead className="text-white text-right">Sent</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communicationHistory.communications.map((comm) => (
                        <TableRow key={comm.id} className="border-gray-800">
                          <TableCell>
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                              {comm.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{comm.subject}</TableCell>
                          <TableCell className="text-right text-gray-300">{comm.recipientCount}</TableCell>
                          <TableCell className="text-right text-gray-300">
                            {comm.openRate ? `${comm.openRate.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            {new Date(comm.sentAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              comm.status === 'sent' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                              comm.status === 'scheduled' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                              'bg-red-600/20 text-red-400 border-red-600/30'
                            }>
                              {comm.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Automated Reports</h2>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleGenerateReport('daily')}
                  className="border-gray-600 text-gray-300"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Daily Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateReport('weekly')}
                  className="border-gray-600 text-gray-300"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Weekly Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateReport('monthly')}
                  className="border-gray-600 text-gray-300"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Daily Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Automated daily performance summary with key metrics and trends.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last sent:</span>
                      <span className="text-white">Today, 9:00 AM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Recipients:</span>
                      <span className="text-white">3 team members</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Latest
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Weekly Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Comprehensive weekly report with detailed analytics and insights.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last sent:</span>
                      <span className="text-white">Monday, 8:00 AM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Recipients:</span>
                      <span className="text-white">5 stakeholders</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Latest
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Executive</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Executive summary with ROI analysis and strategic recommendations.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Last sent:</span>
                      <span className="text-white">1st of month</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Recipients:</span>
                      <span className="text-white">2 executives</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Latest
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
