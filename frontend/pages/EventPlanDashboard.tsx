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
import backend from '~backend/client';

export function EventPlanDashboard() {
  const { planId } = useParams<{ planId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['production-plan-dashboard', planId],
    queryFn: () => backend.production.getDashboard({ planId: parseInt(planId!) }),
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading event plan dashboard.</div>;

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
          <h1 className="text-3xl font-bold text-white">{data.eventName}</h1>
          <p className="text-gray-400">Production Plan Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${data.totalBudget.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${data.totalSpent.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Budget Variance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${data.budgetVariance.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Timeline Progress</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data.timelineStatus.completionPercentage.toFixed(0)}%</div>
              <Progress value={data.timelineStatus.completionPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Budget Status */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Budget Status by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.budgetStatus.map(item => (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{item.category}</span>
                        <span className="text-white">${item.spent.toLocaleString()} / ${item.allocated.toLocaleString()}</span>
                      </div>
                      <Progress value={(item.spent / item.allocated) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Summary */}
          <div className="space-y-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Timeline Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Milestones</span>
                    <span className="text-white">{data.timelineStatus.totalMilestones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-green-400">{data.timelineStatus.completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">In Progress</span>
                    <span className="text-blue-400">{data.timelineStatus.inProgress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pending</span>
                    <span className="text-yellow-400">{data.timelineStatus.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Delayed</span>
                    <span className="text-red-400">{data.timelineStatus.delayed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
