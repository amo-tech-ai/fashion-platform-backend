import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, Clock, DollarSign, Users, AlertTriangle, 
  TrendingUp, CheckCircle, XCircle, Bell, Activity,
  BarChart3, PieChart, Target, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function OrganizerDashboard() {
  // Mock organizer ID - in real app this would come from auth context
  const organizerId = 1;

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['organizer-dashboard', organizerId],
    queryFn: () => backend.organizer.getDashboard({ organizerId }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Dashboard not available</h1>
          <Button>Refresh</Button>
        </div>
      </div>
    );
  }

  const { todayEvents, weekMetrics, urgentTasks, revenueTracking, alerts } = dashboardData;

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Bell className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'high': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default: return 'bg-green-600/20 text-green-400 border-green-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Event Organizer Dashboard</h1>
          <p className="text-gray-400">Manage your fashion events and track performance</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">This Week's Events</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{weekMetrics.totalEvents}</div>
              <p className="text-xs text-gray-400">
                {todayEvents.length} happening today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Revenue This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${revenueTracking.thisMonth.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">
                <span className={revenueTracking.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {revenueTracking.percentageChange >= 0 ? '+' : ''}{revenueTracking.percentageChange.toFixed(1)}%
                </span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Attendance</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{Math.round(weekMetrics.averageAttendance)}</div>
              <p className="text-xs text-gray-400">
                Per event this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Task Completion</CardTitle>
              <Target className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {weekMetrics.completedTasks + weekMetrics.pendingTasks > 0 
                  ? Math.round((weekMetrics.completedTasks / (weekMetrics.completedTasks + weekMetrics.pendingTasks)) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-gray-400">
                {weekMetrics.completedTasks} of {weekMetrics.completedTasks + weekMetrics.pendingTasks} tasks
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Today's Events */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-400" />
                <span>Today's Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No events scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                      <div>
                        <h3 className="text-white font-semibold">{event.projectName}</h3>
                        <p className="text-gray-400 text-sm">
                          {new Date(event.eventTime).toLocaleTimeString()} • {event.attendeeCount} attendees
                        </p>
                        {event.urgentTasks > 0 && (
                          <Badge className="mt-1 bg-red-600/20 text-red-400 border-red-600/30">
                            {event.urgentTasks} urgent tasks
                          </Badge>
                        )}
                      </div>
                      <Badge className={
                        event.status === 'completed' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                        event.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                        'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                      }>
                        {event.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Urgent Tasks */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <span>Urgent Tasks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-400">All caught up! No urgent tasks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm">{task.taskName}</h4>
                        <p className="text-gray-400 text-xs">{task.projectName}</p>
                        <p className="text-gray-500 text-xs">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {task.assignedTo && ` • Assigned to: ${task.assignedTo}`}
                        </p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                  {urgentTasks.length > 5 && (
                    <Button variant="outline" className="w-full mt-4 border-gray-600 text-gray-300">
                      View All {urgentTasks.length} Tasks
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Tracking */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span>Revenue Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">This Month</span>
                  <span className="text-white">${revenueTracking.thisMonth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Last Month</span>
                  <span className="text-white">${revenueTracking.lastMonth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Projected</span>
                  <span className="text-white">${revenueTracking.projectedRevenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm text-gray-400">Growth</span>
                  <Badge className={revenueTracking.percentageChange >= 0 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                    {revenueTracking.percentageChange >= 0 ? '+' : ''}{revenueTracking.percentageChange.toFixed(1)}%
                  </Badge>
                </div>
                <Progress 
                  value={Math.abs(revenueTracking.percentageChange)} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="lg:col-span-2 bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Bell className="h-5 w-5 text-yellow-400" />
                <span>System Alerts</span>
                {alerts.length > 0 && (
                  <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                    {alerts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-400">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 6).map((alert) => (
                    <Alert key={alert.id} className={`border ${
                      alert.severity === 'critical' ? 'border-red-800 bg-red-900/20' :
                      alert.severity === 'high' ? 'border-orange-800 bg-orange-900/20' :
                      alert.severity === 'medium' ? 'border-yellow-800 bg-yellow-900/20' :
                      'border-blue-800 bg-blue-900/20'
                    }`}>
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.severity)}
                        <div className="flex-1">
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-white text-sm">{alert.title}</h4>
                                <p className="text-gray-300 text-sm">{alert.message}</p>
                                <p className="text-gray-500 text-xs mt-1">
                                  {new Date(alert.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {alert.actionRequired && (
                                <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Action Required
                                </Button>
                              )}
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                  {alerts.length > 6 && (
                    <Button variant="outline" className="w-full mt-4 border-gray-600 text-gray-300">
                      View All {alerts.length} Alerts
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
