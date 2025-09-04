import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Star, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { RecommendedEvent } from '~backend/recommendation/engine';

interface RecommendationCardProps {
  event: RecommendedEvent;
  onAddToFavorites?: (eventId: number) => void;
  isFavorite?: boolean;
}

export function RecommendationCard({ event, onAddToFavorites, isFavorite = false }: RecommendationCardProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-all duration-300 group overflow-hidden">
      <div className="aspect-video bg-gradient-to-r from-pink-500/20 to-purple-600/20 relative">
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute top-4 left-4">
          <Badge className="bg-purple-600/80 text-white">
            Fashion Show
          </Badge>
        </div>
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <div className="bg-black/50 px-2 py-1 rounded flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-400" />
            <span className="text-white text-sm">{event.recommendationScore}%</span>
          </div>
          {onAddToFavorites && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddToFavorites(event.id)}
              className={`p-2 ${isFavorite ? 'text-pink-400' : 'text-gray-400 hover:text-pink-400'}`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center space-x-1 text-white text-sm bg-black/50 px-2 py-1 rounded">
            <DollarSign className="h-3 w-3" />
            <span>${event.minPrice} - ${event.maxPrice}</span>
          </div>
        </div>
        <div className="absolute bottom-4 right-4">
          <Progress value={event.recommendationScore} className="w-16 h-2" />
        </div>
      </div>

      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <h3 className="text-white text-xl group-hover:text-pink-400 transition-colors font-semibold">
            {event.name}
          </h3>
        </div>
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
            <MapPin className="h-4 w-4" />
            <span>{event.venue}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Recommendation Reasons */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm">Why we recommend this:</h4>
            <div className="flex flex-wrap gap-2">
              {event.recommendationReasons.map((reason, index) => (
                <Badge key={index} className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

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
            <span className="text-gray-400">{event.available} tickets left</span>
            <span className="text-green-400">From ${event.minPrice}</span>
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
  );
}
