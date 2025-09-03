import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, MapPin, Clock, Users, DollarSign, 
  Minus, Plus, CreditCard, Mail, User, Phone, UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isBooking, setIsBooking] = useState(false);

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => backend.event.list(),
  });

  const event = events?.events.find(e => e.id === parseInt(eventId!));

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  const selectedTicket = selectedTier ? event.tickets.find(t => t.id === selectedTier) : null;
  const totalPrice = selectedTicket ? selectedTicket.price * quantity : 0;
  const tax = totalPrice * 0.1; // 10% tax
  const finalTotal = totalPrice + tax;

  const handleBooking = async () => {
    if (!selectedTicket || !customerInfo.name || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a ticket type.",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      const booking = await backend.booking.book({
        eventId: event.id,
        ticketTierId: selectedTicket.id,
        quantity,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
      });

      toast({
        title: "Booking Confirmed!",
        description: `Your booking code is ${booking.bookingCode}. Check your email for details.`,
      });

      // Navigate to booking confirmation page
      navigate(`/booking/${booking.bookingCode}`);
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header */}
        <div className="mb-8">
          <div className="aspect-video bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-lg relative mb-6">
            <div className="absolute inset-0 bg-black/40 rounded-lg" />
            <div className="absolute bottom-6 left-6">
              <h1 className="text-4xl font-bold text-white mb-2">{event.name}</h1>
              <div className="flex items-center space-x-4 text-gray-200">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-5 w-5" />
                  <span>
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-5 w-5" />
                  <span>
                    {new Date(event.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-5 w-5" />
                  <span>{event.venue}</span>
                </div>
              </div>
            </div>
          </div>

          {event.description && (
            <p className="text-gray-300 text-lg max-w-3xl">
              {event.description}
            </p>
          )}
        </div>

        {/* Group Booking Option */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-600/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-lg font-semibold mb-2">Booking for a Group?</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    Get group discounts and coordinate seating for 5+ people
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-purple-300">
                    <span>• 10-20% group discounts</span>
                    <span>• Complimentary tickets</span>
                    <span>• Seated together</span>
                    <span>• Group chat</span>
                  </div>
                </div>
                <Link to={`/events/${event.id}/create-group`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Group Booking
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Select Your Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.tickets.map((ticket) => {
                  const soldCount = 0; // This would come from booking data
                  const available = ticket.quantity - soldCount;
                  const isSelected = selectedTier === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      } ${available === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => available > 0 && setSelectedTier(ticket.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{ticket.name}</h3>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-2xl font-bold text-white">
                              ${ticket.price}
                            </span>
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{available} available</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          {available === 0 ? (
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                              Sold Out
                            </Badge>
                          ) : available < 10 ? (
                            <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                              Limited
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quantity Selection */}
            {selectedTicket && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Quantity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="border-gray-600 text-gray-300"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-white text-xl font-semibold w-12 text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      disabled={quantity >= 10}
                      className="border-gray-600 text-gray-300"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-gray-400 text-sm">
                      (Maximum 10 tickets per booking)
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Information */}
            {selectedTicket && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-300">
                        Full Name *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-300">
                        Email Address *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={customerInfo.email}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">
                      Phone Number (Optional)
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="pl-10 bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Summary */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 sticky top-8">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTicket ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{selectedTicket.name}</span>
                        <span className="text-white">${selectedTicket.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Quantity</span>
                        <span className="text-white">×{quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white">${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tax (10%)</span>
                        <span className="text-white">${tax.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-2">
                        <div className="flex justify-between">
                          <span className="text-white font-semibold">Total</span>
                          <span className="text-white font-bold text-xl">
                            ${finalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={isBooking || !customerInfo.name || !customerInfo.email}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {isBooking ? 'Processing...' : 'Complete Booking'}
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      You will receive a confirmation email with your booking code
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Select a ticket type to continue</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Info */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span>
                    {new Date(event.date).toLocaleDateString('en-US', {
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
                    {new Date(event.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>{event.available} tickets remaining</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
