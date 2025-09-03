import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, CheckCircle, Clock, DollarSign, 
  Upload, ListChecks, MessageSquare, BarChart2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import backend from '~backend/client';

export function SponsorPortal() {
  const { contractId } = useParams<{ contractId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['sponsor-portal', contractId],
    queryFn: () => backend.sponsor.getPortalData({ contractId: parseInt(contractId!) }),
    enabled: !!contractId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading sponsor portal.</div>;

  const { contract, companyName, eventName, activations, assets, payments } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'approved':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'in_progress':
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'cancelled':
      case 'rejected':
      case 'overdue':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Sponsor Portal</h1>
          <p className="text-gray-400">Welcome, {companyName}!</p>
        </div>

        <Card className="bg-gray-900/50 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Sponsorship for {eventName}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Contract</p>
              <p className="text-white font-semibold">{contract.contractNumber}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Amount</p>
              <p className="text-white font-semibold">${contract.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Signature Status</p>
              <Badge className={getStatusColor(contract.signatureStatus)}>
                {contract.signatureStatus.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activations" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="activations" className="data-[state=active]:bg-purple-600">Activations</TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-purple-600">Assets</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-purple-600">Payments</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="activations">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <ListChecks className="h-5 w-5 text-purple-400" />
                  <span>Activation Checklist</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activations.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{item.activationType.replace('_', ' ')}</p>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        <p className="text-xs text-gray-500 mt-1">Due: {new Date(item.dueDate!).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-white flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-400" />
                  <span>Asset Collection</span>
                </CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700">Upload Asset</Button>
              </CardHeader>
              <CardContent>
                {assets.length > 0 ? (
                  <div className="space-y-3">
                    {assets.map(asset => (
                      <div key={asset.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{asset.assetType}</p>
                          <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                            View File
                          </a>
                        </div>
                        <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">No assets uploaded yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span>Payment Schedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium capitalize">{payment.paymentType} Payment</p>
                        <p className="text-gray-400 text-sm">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">${payment.amount.toLocaleString()}</p>
                        <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <BarChart2 className="h-5 w-5 text-orange-400" />
                  <span>Performance Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  Performance data will be available after the event.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
