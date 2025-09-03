import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Users, DollarSign, Calendar, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function CreateEventPlan() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'designer_showcase' as 'designer_showcase' | 'fashion_networking' | 'product_launch',
    attendeeCount: 300,
    budget: 35000,
    timelineDays: 30,
    organizerId: 1, // Mock organizer ID
  });

  const createPlanMutation = useMutation({
    mutationFn: () => backend.production.create(formData),
    onSuccess: (data) => {
      toast({
        title: "Event Plan Created!",
        description: "Your event framework has been generated.",
      });
      navigate(`/organizer/plans/${data.planId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Plan",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter an event name.",
        variant: "destructive",
      });
      return;
    }
    createPlanMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center space-x-2">
              <ClipboardList />
              <span>Create New Event Plan</span>
            </CardTitle>
            <p className="text-gray-400">Define your event to generate a complete production framework.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="eventName" className="text-gray-300">Event Name *</Label>
                <Input id="eventName" value={formData.eventName} onChange={(e) => setFormData({ ...formData, eventName: e.target.value })} required className="bg-gray-800 border-gray-700 text-white" />
              </div>

              <div>
                <Label htmlFor="eventType" className="text-gray-300">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="designer_showcase">Designer Showcase</SelectItem>
                    <SelectItem value="fashion_networking">Fashion Networking</SelectItem>
                    <SelectItem value="product_launch">Product Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="attendeeCount" className="text-gray-300">Attendees</Label>
                  <Input id="attendeeCount" type="number" value={formData.attendeeCount} onChange={(e) => setFormData({ ...formData, attendeeCount: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="budget" className="text-gray-300">Budget ($)</Label>
                  <Input id="budget" type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <Label htmlFor="timelineDays" className="text-gray-300">Timeline (Days)</Label>
                  <Input id="timelineDays" type="number" value={formData.timelineDays} onChange={(e) => setFormData({ ...formData, timelineDays: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createPlanMutation.isPending}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                {createPlanMutation.isPending ? 'Generating Plan...' : 'Generate Event Plan'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
