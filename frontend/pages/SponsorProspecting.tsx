import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Filter, Mail, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import backend from '~backend/client';

export function SponsorProspecting() {
  // This is a simplified view. In a real app, you'd have state for filters.
  const { data, isLoading } = useQuery({
    queryKey: ['sponsor-prospects'],
    queryFn: () => backend.sponsor.getProspects({ status: 'new', limit: 50 }),
  });

  const { data: campaignsData } = useQuery({
    queryKey: ['outreach-campaigns'],
    queryFn: () => backend.sponsor.getCampaigns(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Sponsor Prospecting</h1>
            <p className="text-gray-400">Identify and engage high-value sponsors</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" className="border-gray-600 text-gray-300">
              <Filter className="h-4 w-4 mr-2" />
              Filter Prospects
            </Button>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Import Prospects
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">New Prospects</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Industry</TableHead>
                      <TableHead className="text-white">Fit Score</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.prospects.map((prospect: any) => (
                      <TableRow key={prospect.id} className="border-gray-800">
                        <TableCell>
                          <div className="font-medium text-white">{prospect.companyName}</div>
                          <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                            {prospect.website}
                          </a>
                        </TableCell>
                        <TableCell className="text-gray-300">{prospect.industry}</TableCell>
                        <TableCell className="text-yellow-400 font-bold">{prospect.fitScore}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                            Convert to Lead
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-purple-400" />
                  <span>Outreach Campaigns</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaignsData?.campaigns.map((campaign: any) => (
                  <div key={campaign.id} className="p-3 bg-gray-800/50 rounded-lg">
                    <h4 className="text-white font-medium">{campaign.name}</h4>
                    <p className="text-gray-400 text-sm">{campaign.description}</p>
                    <Button size="sm" variant="ghost" className="text-purple-400 h-auto p-0 mt-2">
                      Enroll Prospects
                    </Button>
                  </div>
                ))}
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
