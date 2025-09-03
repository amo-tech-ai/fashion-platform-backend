import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: number;
  name: string;
  date: Date;
  venue: string;
  capacity: number;
  description?: string;
  organizerId: number;
  status: string;
  createdAt: Date;
  publishedAt?: Date;
  tickets: Array<{
    id: number;
    eventId: number;
    name: string;
    price: number;
    quantity: number;
    createdAt: Date;
  }>;
  available: number;
  soldOut: boolean;
  minPrice: number;
  maxPrice: number;
}

interface SearchResultsProps {
  events: Event[];
  total: number;
  isLoading: boolean;
  searchQuery?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function SearchResults({
  events,
  total,
  isLoading,
  searchQuery,
  onLoadMore,
  hasMore = false,
}: SearchResultsProps) {
  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (events.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          {searchQuery ? 'No events found' : 'No events available'}
        </h3>
        <p className="text-gray-500">
          {searchQuery 
            ? 'Try adjusting your search criteria or filters'
            : 'Check back soon for upcoming fashion shows!'
          }
        </p>
      </div>
    );
  }

  const highlightText = (text: string, query?: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-400/30 text-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {total} {total === 1 ? 'Event' : 'Events'} Found
          </h2>
          {searchQuery && (
            <p className="text-gray-400 text-sm">
              Search results for "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      {/* Events Grid */}
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
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center space-x-1 text-white text-sm bg-black/50 px-2 py-1 rounded">
                  <DollarSign className="h-3 w-3" />
                  <span>${event.minPrice} - ${event.maxPrice}</span>
                </div>
              </div>
            </div>

            <CardHeader className="pb-4">
              <CardTitle className="text-white text-xl group-hover:text-pink-400 transition-colors">
                {highlightText(event.name, searchQuery)}
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
                  <span>{highlightText(event.venue, searchQuery)}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-4">
                {event.description && (
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {highlightText(event.description, searchQuery)}
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
                    <span>From ${event.minPrice}</span>
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

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-6">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            {isLoading ? 'Loading...' : 'Load More Events'}
          </Button>
        </div>
      )}

      {/* Loading indicator for additional results */}
      {isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}
    </div>
  );
}
