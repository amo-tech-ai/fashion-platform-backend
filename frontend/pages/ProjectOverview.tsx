import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, Clock, DollarSign, Users, CheckCircle, 
  AlertTriangle, TrendingUp, MessageSquare, Package,
  Briefcase, MapPin, Phone, Mail, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function ProjectOverview() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project-overview', projectId],
    queryFn: () => backend.organizer.getProjectOverview({ projectId: parseInt(projectId!) }),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project not found</h1>
          <Button>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { project, timeline, budget, staff, designers, vendors, logistics, recentCommunications } = projectData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'in_progress': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'overdue': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'pending': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
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

  const budgetUtilization = budget.total > 0 ? (budget.spent / budget.total) * 100 : 0;
  const completedTasks = timeline.filter(task => task.status === 'completed').length;
  const totalTasks = timeline.length;
  const projectProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{project.projectName}</h1>
              <p className="text-gray-400">{project.description}</p>
            </div>
            <Badge className={getStatusColor(project.projectStatus)}>
              {project.projectStatus.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span>
            </div>
            <Badge className={getPriorityColor(project.priority)}>
              {project.priority} priority
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Budget Status</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${budget.spent.toLocaleString()} / ${budget.total.toLocaleString()}
              </div>
              <Progress value={budgetUtilization} className="mt-2" />
              <p className="text-xs text-gray-400 mt-2">
                {budgetUtilization.toFixed(1)}% utilized • ${budget.remaining.toLocaleString()} remaining
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Project Progress</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {completedTasks} / {totalTasks}
              </div>
              <Progress value={projectProgress} className="mt-2" />
              <p className="text-xs text-gray-400 mt-2">
                {projectProgress.toFixed(1)}% complete • {totalTasks - completedTasks} tasks remaining
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Team Size</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {staff.length + designers.length}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {staff.length} staff • {designers.length} designers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-900/50 border-gray-800">
            <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-600">Timeline</TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-purple-600">Budget</TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-600">Team</TabsTrigger>
            <TabsTrigger value="designers" className="data-[state=active]:bg-purple-600">Designers</TabsTrigger>
            <TabsTrigger value="vendors" className="data-[state=active]:bg-purple-600">Vendors</TabsTrigger>
            <TabsTrigger value="logistics" className="data-[state=active]:bg-purple-600">Logistics</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span>Project Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-white font-semibold">{task.taskName}</h3>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.taskDescription && (
                          <p className="text-gray-400 text-sm mt-1">{task.taskDescription}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          {task.estimatedHours && <span>Est: {task.estimatedHours}h</span>}
                          {task.actualHours && <span>Actual: {task.actualHours}h</span>}
                        </div>
                        {task.completionPercentage > 0 && (
                          <Progress value={task.completionPercentage} className="mt-2 h-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {budget.categories.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{category.category}</span>
                          <span className="text-white">
                            ${category.actual.toLocaleString()} / ${category.budgeted.toLocaleString()}
                          </span>
                        </div>
                        <Progress 
                          value={category.budgeted > 0 ? (category.actual / category.budgeted) * 100 : 0} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs">
                          <span className={category.variance >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {category.variance >= 0 ? 'Under' : 'Over'} by ${Math.abs(category.variance).toLocaleString()}
                          </span>
                          <span className="text-gray-500">
                            {category.budgeted > 0 ? ((category.actual / category.budgeted) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Budget Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-white">${budget.total.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">Total Budget</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-white">${budget.spent.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">Spent</div>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                    <div className={`text-2xl font-bold ${budget.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${budget.remaining.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      {budget.remaining >= 0 ? 'Remaining' : 'Over Budget'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  <span>Staff Assignments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staff.map((member) => (
                    <div key={member.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{member.role}</h3>
                        <Badge className={getStatusColor(member.status)}>
                          {member.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        {member.hourlyRate && <p>Rate: ${member.hourlyRate}/hour</p>}
                        {member.startTime && (
                          <p>Schedule: {new Date(member.startTime).toLocaleString()}</p>
                        )}
                        {member.responsibilities.length > 0 && (
                          <div>
                            <p className="font-medium">Responsibilities:</p>
                            <ul className="list-disc list-inside ml-2">
                              {member.responsibilities.map((resp, index) => (
                                <li key={index}>{resp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="designers" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span>Designer Coordination</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {designers.map((designer) => (
                    <div key={designer.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">{designer.collectionName || 'Collection'}</h3>
                        <Badge className={getStatusColor(designer.status)}>
                          {designer.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1 text-gray-400">
                          {designer.slotTime && (
                            <p><Clock className="h-3 w-3 inline mr-1" />Slot: {new Date(designer.slotTime).toLocaleString()}</p>
                          )}
                          <p><Users className="h-3 w-3 inline mr-1" />Models: {designer.modelCount}</p>
                          <p>Duration: {designer.slotDuration} minutes</p>
                        </div>
                        <div className="space-y-1 text-gray-400">
                          {designer.musicRequirements && <p>Music: {designer.musicRequirements}</p>}
                          {designer.lightingRequirements && <p>Lighting: {designer.lightingRequirements}</p>}
                          {designer.specialRequests && <p>Special: {designer.specialRequests}</p>}
                        </div>
                      </div>
                      {designer.rehearsalTime && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-sm text-gray-400">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Rehearsal: {new Date(designer.rehearsalTime).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-green-400" />
                  <span>Vendor Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold">{vendor.vendorName}</h3>
                          <p className="text-sm text-gray-400">{vendor.vendorType}</p>
                        </div>
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        {vendor.contactPerson && <p><Users className="h-3 w-3 inline mr-1" />{vendor.contactPerson}</p>}
                        {vendor.email && <p><Mail className="h-3 w-3 inline mr-1" />{vendor.email}</p>}
                        {vendor.phone && <p><Phone className="h-3 w-3 inline mr-1" />{vendor.phone}</p>}
                        {vendor.contractAmount && <p><DollarSign className="h-3 w-3 inline mr-1" />${vendor.contractAmount.toLocaleString()}</p>}
                        {vendor.deliveryDate && <p><Calendar className="h-3 w-3 inline mr-1" />Delivery: {new Date(vendor.deliveryDate).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  <span>Logistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {logistics.map((item) => (
                    <div key={item.id} className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold">{item.itemName}</h3>
                          <p className="text-sm text-gray-400">{item.logisticsType} • Qty: {item.quantity}</p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        {item.supplier && <p>Supplier: {item.supplier}</p>}
                        {item.deliveryTime && <p><Clock className="h-3 w-3 inline mr-1" />Delivery: {new Date(item.deliveryTime).toLocaleString()}</p>}
                        {item.location && <p><MapPin className="h-3 w-3 inline mr-1" />Location: {item.location}</p>}
                        {item.cost && <p><DollarSign className="h-3 w-3 inline mr-1" />Cost: ${item.cost.toLocaleString()}</p>}
                      </div>
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
