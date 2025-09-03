import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, TrendingUp, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function HomePage() {
  const { data: showsData, isLoading } = useQuery({
    queryKey: ['fashionistas-shows'],
    queryFn: () => backend.fashionistas.listShows({ upcoming: true, status: 'published' }),
  });

  const { data: upcomingShow } = useQuery({
    queryKey: ['upcoming-show'],
    queryFn: () => backend.fashionistas.getUpcomingShow(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const shows = showsData?.shows || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Fashionistas
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                Medellín
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Experience the most exclusive fashion shows in Medellín. 
              Featuring local and international designers every month.
            </p>
            
            {upcomingShow?.show && (
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-8">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-pink-400" />
                  <span className="text-pink-400 font-semibold">Next Show</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{upcomingShow.show.title}</h3>
                <p className="text-gray-300 mb-4">
                  {new Date(upcomingShow.show.showDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{upcomingShow.show.percentageSold.toFixed(0)}% sold</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Ticket className="h-4 w-4" />
                    <span>From ${upcomingShow.show.lowestPrice}</span>
                  </div>
                </div>
                <Link to={`/shows/${upcomingShow.show.id}`}>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    Get Tickets
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shows Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Upcoming Shows</h2>
          <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
            {shows.length} shows available
          </Badge>
        </div>

        {shows.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No upcoming shows</h3>
            <p className="text-gray-500">Check back soon for new show announcements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shows.map((show) => (
              <Card key={show.id} className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-all duration-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-xl mb-2 group-hover:text-pink-400 transition-colors">
                        {show.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2 text-gray-400 text-sm mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(show.showDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{show.venueName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {show.isSellingFast && (
                        <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Selling Fast
                        </Badge>
                      )}
                      {show.percentageSold >= 80 && (
                        <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                          Almost Sold Out
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Featured Designers */}
                    {show.featuredDesigners.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Featured Designers</p>
                        <div className="flex flex-wrap gap-1">
                          {show.featuredDesigners.slice(0, 3).map((designer, index) => (
                            <Badge key={index} variant="outline" className="text-xs border-gray-700 text-gray-300">
                              {designer}
                            </Badge>
                          ))}
                          {show.featuredDesigners.length > 3 && (
                            <Badge variant="outline" className="text-xs border-gray-700 text-gray-300">
                              +{show.featuredDesigners.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pricing and Availability */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">From</p>
                        <p className="text-2xl font-bold text-white">${show.lowestPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Available</p>
                        <p className="text-lg font-semibold text-green-400">
                          {show.totalCapacity - show.ticketsSold} tickets
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sold</span>
                        <span className="text-gray-300">{show.percentageSold.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(show.percentageSold, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link to={`/shows/${show.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-300">
                        {show.percentageSold >= 100 ? 'Join Waitlist' : 'View Details'}
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
