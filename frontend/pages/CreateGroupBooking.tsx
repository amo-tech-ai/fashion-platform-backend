import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Users, Calendar, MapPin, DollarSign, 
  Gift, Percent, ArrowRight, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function CreateGroupBooking() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    organizerEmail: 'organizer@example.com', // In real app, get from auth
    organizerName: 'Jane Organizer', // In real app, get from auth
    groupName: '',
    estimatedSize: 10,
    maxSize: 15,
    seatingPreference: 'together' as 'together' | 'scattered' | 'no_preference',
    paymentMethod: 'individual' as 'individual' | 'organizer_pays',
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => backend.event.get({ id: parseInt(eventId!) }),
    enabled: !!eventId,
  });

  const createGroupMutation = useMutation({
    mutationFn: () => backend.group.create({
      eventId: parseInt(eventId!),
      ...formData,
    }),
    onSuccess: (data) => {
      toast({
        title: "Group Booking Created!",
        description: `Your invite code is ${data.inviteCode}. Share it with your group!`,
      });
      navigate(`/group/${data.inviteCode}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Group",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event not found</h1>
          <Button onClick={() => navigate('/events')}>Browse Events</Button>
        </div>
      </div>
    );
  }

  const calculateBenefits = (size: number) => {
    let discountPercentage = 0;
    let complimentaryTickets = 0;

    if (size >= 20) {
      discountPercentage = 20;
      complimentaryTickets = Math.floor(size / 10);
    } else if (size >= 10) {
      discountPercentage = 15;
      complimentaryTickets = Math.floor(size / 10);
    } else if (size >= 5) {
      discountPercentage = 10;
    }

    return { discountPercentage, complimentaryTickets };
  };

  const benefits = calculateBenefits(formData.estimatedSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }
    createGroupMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Group Booking</h1>
          <p className="text-gray-400">Organize a group booking for {event.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Group Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="groupName" className="text-gray-300">
                    Group Name *
                  </Label>
                  <Input
                    id="groupName"
                    type="text"
                    placeholder="e.g., Fashion Week Team, Design Studio Group"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimatedSize" className="text-gray-300">
                      Estimated Size
                    </Label>
                    <Select 
                      value={formData.estimatedSize.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, estimatedSize: parseInt(value) })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {[...Array(46)].map((_, i) => (
                          <SelectItem key={i + 5} value={(i + 5).toString()}>
                            {i + 5} people
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxSize" className="text-gray-300">
                      Maximum Size
                    </Label>
                    <Select 
                      value={formData.maxSize.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, maxSize: parseInt(value) })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {[...Array(46)].map((_, i) => (
                          <SelectItem key={i + 5} value={(i + 5).toString()}>
                            {i + 5} people
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 mb-3 block">Seating Preference</Label>
                  <RadioGroup 
                    value={formData.seatingPreference} 
                    onValueChange={(value: any) => setFormData({ ...formData, seatingPreference: value })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="together" id="together" />
                      <Label htmlFor="together" className="text-gray-300">
                        Seated together (when possible)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scattered" id="scattered" />
                      <Label htmlFor="scattered" className="text-gray-300">
                        Scattered seating is fine
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no_preference" id="no_preference" />
                      <Label htmlFor="no_preference" className="text-gray-300">
                        No preference
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-gray-300 mb-3 block">Payment Method</Label>
                  <RadioGroup 
                    value={formData.paymentMethod} 
                    onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="text-gray-300">
                        Each person pays for their own tickets
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="organizer_pays" id="organizer_pays" />
                      <Label htmlFor="organizer_pays" className="text-gray-300">
                        I'll pay for the entire group
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group Booking'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Event Info & Benefits */}
          <div className="space-y-6">
            {/* Event Details */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-white text-lg font-semibold">{event.name}</h3>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="h-4 w-4" />
                  <span>{event.available} tickets available</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <DollarSign className="h-4 w-4" />
                  <span>From ${event.tickets[0]?.price || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Group Benefits */}
            <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-600/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Gift className="h-5 w-5 text-green-400" />
                  <span>Group Benefits</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4 text-green-400" />
                    <span className="text-white">Group Discount</span>
                  </div>
                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                    {benefits.discountPercentage}%
                  </Badge>
                </div>

                {benefits.complimentaryTickets > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-pink-400" />
                      <span className="text-white">Complimentary Tickets</span>
                    </div>
                    <Badge className="bg-pink-600/20 text-pink-400 border-pink-600/30">
                      {benefits.complimentaryTickets}
                    </Badge>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-600/20 rounded-lg border border-blue-600/30">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <p className="font-medium mb-1">Discount Tiers:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• 5-9 people: 10% off</li>
                        <li>• 10-19 people: 15% off + 1 free ticket per 10</li>
                        <li>• 20+ people: 20% off + 1 free ticket per 10</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">How Group Booking Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <p>Create your group and get a unique invite code</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <p>Share the invite code with your group members</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <p>Each person books their own tickets with automatic group discounts</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                  <p>Coordinate through group chat and get seated together when possible</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
