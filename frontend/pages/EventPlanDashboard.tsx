import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ClipboardList, Calendar, Users, DollarSign, 
  Building2, UserCheck, HardHat, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import backend from '~backend/client';

export function EventPlanDashboard() {
  const { planId } = useParams<{ planId: string }>();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['production-plan', planId],
    queryFn: () => backend.production.get({ planId: parseInt(planId!) }),
    enabled: !!planId,
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

  if (!plan) return <div>Error loading event plan.</div>;

  const budgetSpent = plan.budgetAllocations.reduce((sum, alloc) => sum + alloc.actualAmount, 0);
  const budgetVariance = plan.budget - budgetSpent;
  const completedMilestones = plan.milestones.filter(m => m.status === 'completed').length;
  const timelineProgress = plan.milestones.length > 0 ? (completedMilestones / plan.milestones.length) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'in_progress': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'delayed': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'delayed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{plan.eventName}</h1>
          <p className="text-gray-400">Production Plan Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${plan.budget.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${budgetSpent.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Budget Variance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${budgetVariance.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Timeline Progress</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{timelineProgress.toFixed(0)}%</div>
              <Progress value={timelineProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-600">Timeline</TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-purple-600">Budget</TabsTrigger>
            <TabsTrigger value="stakeholders" className="data-[state=active]:bg-purple-600">Stakeholders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Event Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Event Date</p>
                    <p className="text-white font-semibold">{new Date(plan.eventDate).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <Users className="h-6 w-6 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Attendees</p>
                    <p className="text-white font-semibold">{plan.attendeeCount}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Venue Type</p>
                    <p className="text-white font-semibold">{plan.venueRequirements.type}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <HardHat className="h-6 w-6 text-purple-400 mb-2" />
                    <p className="text-sm text-gray-400">Event Type</p>
                    <p className="text-white font-semibold">{plan.eventType.replace('_', ' ')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Success Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(plan.successCriteria).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-white font-medium">{value as string}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Timeline Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-white">Milestone</TableHead>
                      <TableHead className="text-white">Due Date</TableHead>
                      <TableHead className="text-white">Assigned To</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.milestones.map(m => (
                      <TableRow key={m.id} className="border-gray-800">
                        <TableCell className="text-white font-medium">{m.name}</TableCell>
                        <TableCell className="text-gray-300">{new Date(m.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-gray-300">{m.assignedTo}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(m.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(m.status)}
                              <span>{m.status.replace('_', ' ')}</span>
                            </div>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Budget Allocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.budgetAllocations.map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{item.category} ({item.percentage}%)</span>
                        <span className="text-white">${item.actualAmount.toLocaleString()} / ${item.allocatedAmount.toLocaleString()}</span>
                      </div>
                      <Progress value={(item.actualAmount / item.allocatedAmount) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stakeholders">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Stakeholders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.stakeholders.map(s => (
                    <div key={s.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <h4 className="text-white font-semibold">{s.role}</h4>
                      <p className="text-gray-400 text-sm">{s.responsibilities}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
