import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  CreditCard, Users, Gift, AlertCircle, 
  Check, X, Plus, Minus, MapPin 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import backend from '~backend/client';

interface BookingForm {
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  currency: 'USD' | 'COP';
  promoCode: string;
  specialRequests: string;
  tickets: Array<{
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    specialRequirements: string;
  }>;
}

export function BookingPage() {
  const { showId } = useParams<{ showId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const selectedTierId = searchParams.get('tier');
  const [ticketCount, setTicketCount] = React.useState(1);
  const [promoValidation, setPromoValidation] = React.useState<any>(null);
  const [showSeatMap, setShowSeatMap] = React.useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingForm>({
    defaultValues: {
      currency: 'USD',
      tickets: [{ attendeeName: '', attendeeEmail: '', attendeePhone: '', specialRequirements: '' }],
    },
  });

  const watchedCurrency = watch('currency');
  const watchedPromoCode = watch('promoCode');

  // Fetch show details
  const { data: showDetails, isLoading: showLoading } = useQuery({
    queryKey: ['show-details', showId, watchedCurrency],
    queryFn: () => backend.fashionistas.getShowDetails({ 
      showId: parseInt(showId!),
      currency: watchedCurrency 
    }),
    enabled: !!showId,
  });

  // Fetch seat map
  const { data: seatMap } = useQuery({
    queryKey: ['seat-map', showId],
    queryFn: () => backend.fashionistas.getSeatMap({ showId: parseInt(showId!) }),
    enabled: !!showId && showSeatMap,
  });

  // Validate promo code
  const { mutate: validatePromo, isPending: promoLoading } = useMutation({
    mutationFn: (code: string) => backend.fashionistas.validatePromoCode({
      code,
      showId: parseInt(showId!),
      tierIds: [parseInt(selectedTierId!)],
      ticketCount,
      currency: watchedCurrency,
    }),
    onSuccess: (data) => {
      setPromoValidation(data);
      if (!data.isValid) {
        toast({
          title: "Invalid Promo Code",
          description: data.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Promo Code Applied!",
          description: data.message,
        });
      }
    },
  });

  // Create booking
  const { mutate: createBooking, isPending: bookingLoading } = useMutation({
    mutationFn: (data: any) => backend.fashionistas.createBooking(data),
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update ticket forms when count changes
  React.useEffect(() => {
    const currentTickets = watch('tickets');
    const newTickets = Array.from({ length: ticketCount }, (_, index) => 
      currentTickets[index] || { 
        attendeeName: '', 
        attendeeEmail: '', 
        attendeePhone: '', 
        specialRequirements: '' 
      }
    );
    setValue('tickets', newTickets);
  }, [ticketCount, setValue, watch]);

  // Validate promo code when it changes
  React.useEffect(() => {
    if (watchedPromoCode && watchedPromoCode.length >= 3) {
      const timer = setTimeout(() => {
        validatePromo(watchedPromoCode);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPromoValidation(null);
    }
  }, [watchedPromoCode, validatePromo]);

  if (showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!showDetails || !selectedTierId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid booking request</h1>
          <Button onClick={() => navigate(`/shows/${showId}`)}>
            Back to Show Details
          </Button>
        </div>
      </div>
    );
  }

  const selectedTier = showDetails.tiers.find(t => t.id === parseInt(selectedTierId));
  if (!selectedTier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Ticket tier not found</h1>
          <Button onClick={() => navigate(`/shows/${showId}`)}>
            Back to Show Details
          </Button>
        </div>
      </div>
    );
  }

  const baseTotal = selectedTier.currentPrice.finalPrice * ticketCount;
  const groupDiscount = ticketCount >= 6 ? baseTotal * 0.15 : 0;
  const promoDiscount = promoValidation?.isValid ? promoValidation.discountAmount : 0;
  const subtotal = baseTotal - groupDiscount - promoDiscount;
  const fees = subtotal * 0.079; // Stripe + platform fees
  const total = subtotal + fees;

  const onSubmit = (data: BookingForm) => {
    const bookingData = {
      showId: parseInt(showId!),
      organizerUserId: 1, // This would come from auth context
      organizerName: data.organizerName,
      organizerEmail: data.organizerEmail,
      organizerPhone: data.organizerPhone,
      currency: data.currency,
      tickets: data.tickets.map(ticket => ({
        tierId: parseInt(selectedTierId),
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        attendeePhone: ticket.attendeePhone,
        specialRequirements: ticket.specialRequirements,
      })),
      promoCode: data.promoCode || undefined,
      specialRequests: data.specialRequests,
      successUrl: `${window.location.origin}/booking-success`,
      cancelUrl: `${window.location.origin}/shows/${showId}/book?tier=${selectedTierId}`,
    };

    createBooking(bookingData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/shows/${showId}`)}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Back to Show Details
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Booking</h1>
          <p className="text-gray-400">{showDetails.show.title}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Selection */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Ticket Selection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <h3 className="text-white font-semibold">{selectedTier.tierName}</h3>
                      <p className="text-gray-400 text-sm">
                        ${selectedTier.currentPrice.finalPrice} per ticket
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                        disabled={ticketCount <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-white font-semibold w-8 text-center">{ticketCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                        disabled={ticketCount >= 10}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Group Discount Alert */}
                  {ticketCount >= 6 && (
                    <Alert className="border-green-600/30 bg-green-900/20">
                      <Gift className="h-4 w-4" />
                      <AlertDescription className="text-green-400">
                        Group discount applied! Save 15% on 6+ tickets.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Organizer Information */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Organizer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organizerName" className="text-white">Full Name *</Label>
                      <Input
                        id="organizerName"
                        {...register('organizerName', { required: 'Name is required' })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter your full name"
                      />
                      {errors.organizerName && (
                        <p className="text-red-400 text-sm mt-1">{errors.organizerName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="organizerEmail" className="text-white">Email *</Label>
                      <Input
                        id="organizerEmail"
                        type="email"
                        {...register('organizerEmail', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid email address'
                          }
                        })}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter your email"
                      />
                      {errors.organizerEmail && (
                        <p className="text-red-400 text-sm mt-1">{errors.organizerEmail.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organizerPhone" className="text-white">Phone</Label>
                      <Input
                        id="organizerPhone"
                        {...register('organizerPhone')}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-white">Currency</Label>
                      <Select value={watchedCurrency} onValueChange={(value) => setValue('currency', value as 'USD' | 'COP')}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="COP">COP ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendee Information */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Attendee Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Array.from({ length: ticketCount }).map((_, index) => (
                    <div key={index} className="p-4 bg-gray-800/30 rounded-lg space-y-4">
                      <h4 className="text-white font-semibold">Ticket {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Attendee Name *</Label>
                          <Input
                            {...register(`tickets.${index}.attendeeName`, { required: 'Name is required' })}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Enter attendee name"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Attendee Email *</Label>
                          <Input
                            type="email"
                            {...register(`tickets.${index}.attendeeEmail`, { 
                              required: 'Email is required',
                              pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Invalid email address'
                              }
                            })}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Enter attendee email"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Phone</Label>
                          <Input
                            {...register(`tickets.${index}.attendeePhone`)}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Special Requirements</Label>
                          <Input
                            {...register(`tickets.${index}.specialRequirements`)}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Dietary restrictions, accessibility needs, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        {...register('promoCode')}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter promo code"
                      />
                    </div>
                    {promoLoading && (
                      <div className="flex items-center px-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  {promoValidation && (
                    <div className={`mt-2 flex items-center space-x-2 ${promoValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                      {promoValidation.isValid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span className="text-sm">{promoValidation.message}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Special Requests */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Special Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    {...register('specialRequests')}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Any special requests or notes for your booking..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-800 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>{selectedTier.tierName} × {ticketCount}</span>
                      <span>${baseTotal.toFixed(2)}</span>
                    </div>
                    
                    {groupDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Group Discount (15%)</span>
                        <span>-${groupDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Promo Discount</span>
                        <span>-${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-300">
                      <span>Fees</span>
                      <span>${fees.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-2">
                      <div className="flex justify-between text-white font-bold text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)} {watchedCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Proceed to Payment</span>
                      </div>
                    )}
                  </Button>

                  <div className="text-xs text-gray-400 text-center">
                    Secure payment powered by Stripe
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
