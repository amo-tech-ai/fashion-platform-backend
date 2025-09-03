import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, Bell, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function WaitlistPage() {
  // Mock user ID - in real app this would come from auth context
  const userId = 1;

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ['waitlist-status', userId],
    queryFn: () => backend.fashionistas.getWaitlistStatus({ showId: 1, userId }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const waitlistEntries = waitlistData?.waitlistEntries || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Waitlist Status</h1>
          <p className="text-gray-400">Track your position for sold-out shows</p>
        </div>

        {waitlistEntries.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No waitlist entries</h3>
            <p className="text-gray-500 mb-6">Join the waitlist when shows sell out to get notified of available tickets!</p>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Browse Shows
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {waitlistEntries.map((entry) => (
              <Card key={entry.id} className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-xl mb-2">
                        {entry.tierName}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-gray-400 text-sm">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>Position #{entry.position}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Est. wait: {entry.estimatedWaitTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{entry.preferredQuantity} ticket(s)</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={
                        entry.notified 
                          ? 'bg-green-600/20 text-green-400 border-green-600/30'
                          : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                      }
                    >
                      {entry.notified ? 'Notified' : 'Waiting'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {entry.notified ? (
                        <div className="flex items-center space-x-2 text-green-400">
                          <Bell className="h-4 w-4" />
                          <span>You've been notified! Check your email for booking instructions.</span>
                        </div>
                      ) : (
                        <span>We'll notify you when tickets become available</span>
                      )}
                    </div>
                    
                    {entry.notified && (
                      <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                        Book Now
                      </Button>
                    )}
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
