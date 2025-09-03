import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, PieChart, Users, DollarSign, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import backend from '~backend/client';

export function EventAnalytics() {
  const { eventId } = useParams<{ eventId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['event-analytics', eventId],
    queryFn: () => backend.event.getAnalytics({ id: parseInt(eventId!) }),
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading event analytics.</div>;

  const { salesByDay, tierBreakdown, customers, totalBookings, totalRevenue } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Event Analytics</h1>
          <p className="text-gray-400">Detailed performance for your event</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Bookings</CardTitle>
              <Ticket className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalBookings}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Unique Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{customers.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <BarChart className="h-5 w-5 text-orange-400" />
                <span>Sales Over Time (Last 30 Days)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Placeholder for graph */}
              <div className="h-64 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Sales graph placeholder</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-pink-400" />
                <span>Ticket Tier Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tierBreakdown.map(tier => (
                  <div key={tier.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{tier.name}</span>
                      <span className="text-white">{tier.sold} / {tier.sold + tier.available}</span>
                    </div>
                    <Progress value={(tier.sold / (tier.sold + tier.available)) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-white">Customer</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white text-right">Quantity</TableHead>
                  <TableHead className="text-white text-right">Amount</TableHead>
                  <TableHead className="text-white">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.slice(0, 10).map((customer, index) => (
                  <TableRow key={index} className="border-gray-800">
                    <TableCell>{customer.customerName}</TableCell>
                    <TableCell>{customer.customerEmail}</TableCell>
                    <TableCell className="text-right">{customer.quantity}</TableCell>
                    <TableCell className="text-right">${customer.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(customer.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
