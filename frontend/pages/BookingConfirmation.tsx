import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle, Calendar, MapPin, Clock, User, 
  Mail, Ticket, Download, Share2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import backend from '~backend/client';

export function BookingConfirmation() {
  const { bookingCode } = useParams<{ bookingCode: string }>();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingCode],
    queryFn: () => backend.booking.get({ code: bookingCode! }),
    enabled: !!bookingCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Booking not found</h1>
          <p className="text-gray-400 mb-6">Please check your booking code and try again.</p>
          <Link to="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
          <p className="text-gray-400">
            Your tickets have been successfully booked. Check your email for details.
          </p>
        </div>

        {/* Booking Details */}
        <Card className="bg-gray-900/50 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Ticket className="h-5 w-5 text-purple-400" />
              <span>Booking Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booking Code */}
            <div className="text-center p-4 bg-purple-600/20 rounded-lg border border-purple-600/30">
              <p className="text-gray-400 text-sm mb-1">Your Booking Code</p>
              <p className="text-2xl font-bold text-white tracking-wider">
                {booking.bookingCode}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Show this code at the venue entrance
              </p>
            </div>

            {/* Event Information */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg">{booking.eventName}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>
                      {new Date(booking.eventDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span>
                      {new Date(booking.eventDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span>{booking.venue}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <User className="h-4 w-4 text-purple-400" />
                    <span>{booking.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Mail className="h-4 w-4 text-purple-400" />
                    <span>{booking.customerEmail}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Ticket className="h-4 w-4 text-purple-400" />
                    <span>{booking.quantity}× {booking.ticketTierName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Paid</span>
                <span className="text-white font-bold text-xl">
                  ${booking.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-500 text-sm">Status</span>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                  {booking.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Ticket
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Event
          </Button>
        </div>

        {/* Important Information */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                Please arrive at least 30 minutes before the event starts for check-in.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                Bring a valid ID that matches the name on your booking.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                Your booking code will be required for entry. Save this confirmation.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <p>
                For any questions, contact our support team with your booking code.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center mt-8">
          <Link to="/events">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Browse More Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
