import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function EventList() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => backend.event.list(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Fashion Events</h1>
          <p className="text-gray-400 text-lg">Discover and book tickets for exclusive fashion shows</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No events available</h3>
            <p className="text-gray-500">Check back soon for upcoming fashion shows!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-all duration-300 group overflow-hidden">
                <div className="aspect-video bg-gradient-to-r from-pink-500/20 to-purple-600/20 relative">
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-purple-600/80 text-white">
                      Fashion Show
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    {event.soldOut ? (
                      <Badge className="bg-red-600/80 text-white">
                        Sold Out
                      </Badge>
                    ) : event.available < 50 ? (
                      <Badge className="bg-orange-600/80 text-white">
                        Almost Sold Out
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-xl group-hover:text-pink-400 transition-colors">
                    {event.name}
                  </CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(event.date).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {event.description && (
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Ticket Pricing */}
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold text-sm">Ticket Options</h4>
                      <div className="space-y-1">
                        {event.tickets.slice(0, 2).map((ticket) => (
                          <div key={ticket.id} className="flex justify-between text-sm">
                            <span className="text-gray-400">{ticket.name}</span>
                            <span className="text-white font-medium">
                              ${ticket.price}
                            </span>
                          </div>
                        ))}
                        {event.tickets.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{event.tickets.length - 2} more options
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>{event.available} tickets left</span>
                      </div>
                      <div className="flex items-center space-x-1 text-green-400">
                        <DollarSign className="h-4 w-4" />
                        <span>From ${Math.min(...event.tickets.map(t => t.price))}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link to={`/events/${event.id}`} className="block">
                      <Button 
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
                        disabled={event.soldOut}
                      >
                        {event.soldOut ? 'Sold Out' : 'View Details & Book'}
                      </Button>
                    </Link>
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
