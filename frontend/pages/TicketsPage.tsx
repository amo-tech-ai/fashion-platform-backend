import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Clock, QrCode, Download, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function TicketsPage() {
  // Mock user ID - in real app this would come from auth context
  const userId = 1;

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['user-tickets', userId],
    queryFn: () => backend.ticket.listUserTickets({ userId }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tickets = ticketsData?.tickets || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Tickets</h1>
          <p className="text-gray-400">Manage your Fashionistas show tickets</p>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <QrCode className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No tickets yet</h3>
            <p className="text-gray-500 mb-6">Book your first Fashionistas show experience!</p>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Browse Shows
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-xl mb-2">
                        Fashionistas Show
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-gray-400 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(ticket.purchaseDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>8:00 PM</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>Dulcina Medellín</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={
                        ticket.status === 'active' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                        ticket.status === 'used' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' :
                        'bg-red-600/20 text-red-400 border-red-600/30'
                      }
                    >
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Ticket Number:</span>
                          <p className="text-white font-mono">{ticket.ticketNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Price Paid:</span>
                          <p className="text-white">${ticket.purchasePrice.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {ticket.usedAt && (
                        <div className="text-sm">
                          <span className="text-gray-400">Used on:</span>
                          <p className="text-white">{new Date(ticket.usedAt).toLocaleString()}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="bg-white p-4 rounded-lg">
                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center">
                          <QrCode className="h-16 w-16 text-gray-600" />
                        </div>
                        <p className="text-center text-xs text-gray-600 mt-2">QR Code</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
