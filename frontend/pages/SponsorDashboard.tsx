import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, DollarSign, TrendingUp, Clock, 
  Star, Filter, Search, Plus, Mail, Phone,
  Calendar, MapPin, Award, Target, CheckCircle,
  AlertCircle, XCircle, Eye, Send, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function SponsorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    status: 'all',
    assignedTo: 'all',
    minScore: '',
    maxScore: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [proposalDialog, setProposalDialog] = useState(false);

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['sponsor-leads', filters],
    queryFn: () => backend.sponsor.getLeads({
      status: filters.status === 'all' ? undefined : filters.status,
      assignedTo: filters.assignedTo === 'all' ? undefined : filters.assignedTo,
      minScore: filters.minScore ? parseInt(filters.minScore) : undefined,
      maxScore: filters.maxScore ? parseInt(filters.maxScore) : undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: 50,
    }),
  });

  const { data: packages } = useQuery({
    queryKey: ['sponsorship-packages'],
    queryFn: () => backend.sponsor.getPackages(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { leadId: number; status: string; notes?: string }) =>
      backend.sponsor.updateLeadStatus({
        leadId: data.leadId,
        status: data.status as any,
        notes: data.notes,
        performedBy: 'current.user@company.com', // In real app, get from auth
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsor-leads'] });
      toast({ title: "Lead status updated successfully" });
    },
  });

  const assignLeadMutation = useMutation({
    mutationFn: (data: { leadId: number; assignedTo: string; notes?: string }) =>
      backend.sponsor.assignLead({
        leadId: data.leadId,
        assignedTo: data.assignedTo,
        performedBy: 'current.user@company.com',
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsor-leads'] });
      toast({ title: "Lead assigned successfully" });
    },
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="h-4 w-4 text-blue-400" />;
      case 'qualified': return <Target className="h-4 w-4 text-green-400" />;
      case 'proposal_sent': return <FileText className="h-4 w-4 text-yellow-400" />;
      case 'negotiating': return <TrendingUp className="h-4 w-4 text-orange-400" />;
      case 'closed_won': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'closed_lost': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'qualified': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'proposal_sent': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'negotiating': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'closed_won': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'closed_lost': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Sponsor Dashboard</h1>
            <p className="text-gray-400">Manage sponsor leads and partnerships</p>
          </div>
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Summary Stats */}
        {leadsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{leadsData.summary.totalLeads}</div>
                <p className="text-xs text-gray-400">
                  {leadsData.summary.newLeads} new this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {leadsData.summary.conversionRate.toFixed(1)}%
                </div>
                <Progress value={leadsData.summary.conversionRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Average Score</CardTitle>
                <Star className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {leadsData.summary.averageScore.toFixed(0)}
                </div>
                <p className="text-xs text-gray-400">Out of 100</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Proposals Sent</CardTitle>
                <FileText className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{leadsData.summary.proposalsSent}</div>
                <p className="text-xs text-gray-400">This month</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="leads" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="leads" className="data-[state=active]:bg-purple-600">
              Leads
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-purple-600">
              Packages
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">
              Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-6">
            {/* Filters */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-purple-400" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-gray-300">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                        <SelectItem value="negotiating">Negotiating</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Assigned To</Label>
                    <Select value={filters.assignedTo} onValueChange={(value) => setFilters({...filters, assignedTo: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all">All Team Members</SelectItem>
                        <SelectItem value="senior.manager@company.com">Senior Manager</SelectItem>
                        <SelectItem value="account.manager@company.com">Account Manager</SelectItem>
                        <SelectItem value="junior.sales@company.com">Junior Sales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Min Score</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minScore}
                      onChange={(e) => setFilters({...filters, minScore: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Max Score</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={filters.maxScore}
                      onChange={(e) => setFilters({...filters, maxScore: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Sort By</Label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="lead_score">Lead Score</SelectItem>
                        <SelectItem value="updated_at">Last Updated</SelectItem>
                        <SelectItem value="contact_name">Contact Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads Table */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Sponsor Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-white">Contact</TableHead>
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Score</TableHead>
                      <TableHead className="text-white">Budget</TableHead>
                      <TableHead className="text-white">Timeline</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Assigned To</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsData?.leads.map((lead) => (
                      <TableRow key={lead.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <div className="text-white font-medium">{lead.contactName}</div>
                            <div className="text-gray-400 text-sm">{lead.contactEmail}</div>
                            <div className="text-gray-500 text-xs">{lead.jobTitle}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-white">{lead.company?.name || 'Unknown'}</div>
                            <div className="text-gray-400 text-sm">{lead.company?.industry}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={`text-lg font-bold ${getScoreColor(lead.leadScore)}`}>
                              {lead.leadScore}
                            </span>
                            <Progress value={lead.leadScore} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                            {lead.budgetRange?.replace('_', '-') || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                            {lead.timeline?.replace('_', ' ') || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(lead.status)}
                              <span>{lead.status.replace('_', ' ')}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-300 text-sm">
                            {lead.assignedTo?.split('@')[0] || 'Unassigned'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLead(lead)}
                              className="border-gray-600 text-gray-300"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setProposalDialog(true)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Sponsorship Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages?.packages.map((pkg) => (
                    <Card key={pkg.id} className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-lg">{pkg.name}</CardTitle>
                            <Badge className={`mt-2 ${
                              pkg.tier === 'platinum' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' :
                              pkg.tier === 'gold' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                              pkg.tier === 'silver' ? 'bg-gray-600/20 text-gray-400 border-gray-600/30' :
                              'bg-orange-600/20 text-orange-400 border-orange-600/30'
                            }`}>
                              {pkg.tier.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                              ${pkg.basePrice.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>
                        <div className="space-y-2">
                          <h4 className="text-white font-medium">Benefits:</h4>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(pkg.benefits || {}).slice(0, 4).map((benefit) => (
                              <Badge key={benefit} className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                                {benefit.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 text-sm text-gray-400">
                          {pkg.opportunities.length} upcoming opportunities
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Active Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No active contracts yet.</p>
                  <p className="text-gray-500 text-sm">Contracts will appear here once proposals are accepted.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lead Details Dialog */}
        {selectedLead && (
          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {selectedLead.contactName} - {selectedLead.company?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Lead Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{selectedLead.contactEmail}</span>
                      </div>
                      {selectedLead.contactPhone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-300">{selectedLead.contactPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{selectedLead.jobTitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Lead Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Score:</span>
                        <span className={`font-bold ${getScoreColor(selectedLead.leadScore)}`}>
                          {selectedLead.leadScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-white">{selectedLead.budgetRange?.replace('_', '-')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timeline:</span>
                        <span className="text-white">{selectedLead.timeline?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Source:</span>
                        <span className="text-white">{selectedLead.leadSource}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objectives */}
                {selectedLead.objectives && selectedLead.objectives.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Objectives</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.objectives.map((objective: string, index: number) => (
                        <Badge key={index} className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                          {objective}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                <div>
                  <h3 className="text-white font-semibold mb-4">Recent Activities</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedLead.recentActivities.map((activity: any) => (
                      <div key={activity.id} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white font-medium">{activity.activityType.replace('_', ' ')}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">{activity.description}</p>
                        <p className="text-gray-500 text-xs">by {activity.performedBy}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLead(null)}
                    className="border-gray-600 text-gray-300"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setProposalDialog(true);
                      setSelectedLead(null);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Create Proposal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
