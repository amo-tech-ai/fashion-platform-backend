import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, MapPin, Clock, Users, Star, Gift, 
  TrendingUp, AlertCircle, Play, ExternalLink 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import backend from '~backend/client';

export function ShowDetailsPage() {
  const { showId } = useParams<{ showId: string }>();
  
  const { data: showDetails, isLoading } = useQuery({
    queryKey: ['show-details', showId],
    queryFn: () => backend.fashionistas.getShowDetails({ 
      showId: parseInt(showId!),
      currency: 'USD' 
    }),
    enabled: !!showId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Show not found</h1>
          <Link to="/">
            <Button>Back to Shows</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { show, tiers, currentPhase, totalAvailability, viewingCount } = showDetails;

  const formatTimeRemaining = (timeString: string) => {
    if (timeString === 'Expired') return 'Expired';
    return timeString;
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-800';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      default: return 'text-green-400 bg-green-900/20 border-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-600/10" />
        {show.posterImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${show.posterImageUrl})` }}
          />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {show.title}
            </h1>
            <div className="flex items-center justify-center space-x-6 text-gray-300 mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>
                  {new Date(show.showDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>8:00 PM - 2:00 AM</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>{show.venueName}</span>
              </div>
            </div>
            
            {show.description && (
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                {show.description}
              </p>
            )}

            {/* Live Stats */}
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-pink-400" />
                <span className="text-gray-300">{viewingCount} people viewing</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-gray-300">{totalAvailability.percentageSold.toFixed(0)}% sold</span>
              </div>
            </div>
          </div>

          {/* Teaser Video */}
          {show.teaserVideoUrl && (
            <div className="max-w-2xl mx-auto">
              <Card className="bg-black/50 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <Play className="h-5 w-5 text-pink-400" />
                    <span className="text-white font-semibold">Watch Previous Show Highlights</span>
                  </div>
                  <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                    <Button variant="outline" className="border-pink-500 text-pink-400 hover:bg-pink-500 hover:text-white">
                      <Play className="h-4 w-4 mr-2" />
                      Play Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Pricing Phase Alert */}
            <Alert className={`border ${getUrgencyColor(totalAvailability.urgencyLevel)}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{currentPhase.phaseName} Pricing</strong>
                    {currentPhase.discountPercentage > 0 && (
                      <span className="ml-2 text-green-400">
                        Save {currentPhase.discountPercentage}%!
                      </span>
                    )}
                    {currentPhase.premiumPercentage > 0 && (
                      <span className="ml-2 text-orange-400">
                        +{currentPhase.premiumPercentage}% premium
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      Ends in {formatTimeRemaining(currentPhase.timeRemaining)}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Featured Designers */}
            {show.featuredDesigners.length > 0 && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <span>Featured Designers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {show.featuredDesigners.map((designer, index) => (
                      <div key={index} className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {designer.charAt(0)}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-sm">{designer}</h3>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Venue Information */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-pink-400" />
                  <span>Venue Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{show.venueName}</h3>
                  <p className="text-gray-400">{show.venueAddress}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Seated Capacity:</span>
                    <span className="text-white ml-2">{show.capacitySeated}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Standing Room:</span>
                    <span className="text-white ml-2">{show.capacityStanding}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Selection Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white">Select Your Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-lg border transition-all ${
                      tier.availability.available > 0
                        ? 'border-gray-700 hover:border-pink-500 cursor-pointer'
                        : 'border-gray-800 opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{tier.tierName}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-2xl font-bold text-white">
                            ${tier.currentPrice.finalPrice}
                          </span>
                          {tier.currentPrice.discountAmount > 0 && (
                            <span className="text-sm text-gray-400 line-through">
                              ${tier.currentPrice.basePrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {tier.availability.available > 0 ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                            {tier.availability.available} left
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                            Sold Out
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-1 mb-3">
                      {tier.benefits.slice(0, 3).map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm text-gray-300">
                          <Gift className="h-3 w-3 text-pink-400" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                      {tier.benefits.length > 3 && (
                        <div className="text-sm text-gray-400">
                          +{tier.benefits.length - 3} more benefits
                        </div>
                      )}
                    </div>

                    {/* Urgency Message */}
                    {tier.availability.urgencyMessage && (
                      <div className="text-sm text-orange-400 mb-3">
                        {tier.availability.urgencyMessage}
                      </div>
                    )}

                    {/* Action Button */}
                    {tier.availability.available > 0 ? (
                      <Link to={`/shows/${showId}/book?tier=${tier.id}`}>
                        <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                          Select Tickets
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/waitlist?show=${showId}&tier=${tier.id}`}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                          Join Waitlist
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}

                {/* WhatsApp Group Link */}
                {show.whatsappGroupLink && (
                  <div className="pt-4 border-t border-gray-800">
                    <a
                      href={show.whatsappGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Join Event WhatsApp Group</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
