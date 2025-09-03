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
    queryKey: ['production-plan', planId],
    queryFn: () => backend.production.get({ planId: parseInt(planId!) }),
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

  if (!data) return <div>Error loading event plan.</div>;

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
          <p className="text-gray-400 capitalize">{data.eventType.replace('_', ' ')} Production Plan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Event Date</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{new Date(data.eventDate).toLocaleDateString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${data.budget.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Attendees</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data.attendeeCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Timeline</CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data.timelineDays} Days</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Timeline Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.milestones.map(milestone => (
                    <div key={milestone.id} className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(milestone.status)}`}>
                          {getStatusIcon(milestone.status)}
                        </div>
                        <div className="w-px h-8 bg-gray-700"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{milestone.name}</p>
                        <p className="text-gray-400 text-sm">{milestone.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 text-sm">{new Date(milestone.dueDate).toLocaleDateString()}</p>
                        <p className="text-gray-500 text-xs">{milestone.assignedTo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget & Stakeholders */}
          <div className="space-y-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Budget Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.budgetAllocations.map(item => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{item.category}</span>
                        <span className="text-white">${item.allocatedAmount.toLocaleString()} ({item.percentage}%)</span>
                      </div>
                      <Progress value={item.percentage} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Key Stakeholders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.stakeholders.map(stakeholder => (
                    <div key={stakeholder.id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{stakeholder.role}</p>
                        <p className="text-gray-400 text-xs">{stakeholder.responsibilities}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
