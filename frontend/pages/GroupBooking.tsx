import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Calendar, MapPin, DollarSign, Ticket, 
  MessageCircle, Send, UserPlus, Bell, Lock,
  Crown, Gift, Percent, Copy, Check, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function GroupBooking() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userEmail, setUserEmail] = useState('user@example.com'); // In real app, get from auth
  const [userName, setUserName] = useState('John Doe'); // In real app, get from auth
  const [chatMessage, setChatMessage] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: groupBooking, isLoading } = useQuery({
    queryKey: ['group-booking', inviteCode],
    queryFn: () => backend.group.get({ inviteCode: inviteCode! }),
    enabled: !!inviteCode,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: eventDetails } = useQuery({
    queryKey: ['event', groupBooking?.eventId],
    queryFn: () => backend.event.get({ id: groupBooking!.eventId }),
    enabled: !!groupBooking?.eventId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => backend.group.sendMessage({
      inviteCode: inviteCode!,
      senderEmail: userEmail,
      senderName: userName,
      message,
    }),
    onSuccess: () => {
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['group-booking', inviteCode] });
    },
  });

  const sendInvitesMutation = useMutation({
    mutationFn: (emails: string[]) => backend.group.sendInvitations({
      inviteCode: inviteCode!,
      inviterEmail: userEmail,
      inviterName: userName,
      invitations: emails.map(email => ({ email: email.trim() })),
    }),
    onSuccess: (data) => {
      toast({
        title: "Invitations Sent",
        description: `Sent ${data.sent} invitations, skipped ${data.skipped} duplicates.`,
      });
      setInviteEmails('');
      queryClient.invalidateQueries({ queryKey: ['group-booking', inviteCode] });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: () => backend.group.joinGroupBooking({
      inviteCode: inviteCode!,
      ticketTierId: selectedTier!,
      quantity,
      customerEmail: userEmail,
      customerName: userName,
    }),
    onSuccess: (data) => {
      toast({
        title: "Successfully Joined Group!",
        description: data.isComplimentary 
          ? "You received complimentary tickets!"
          : `Group discount applied: $${data.discountApplied.toFixed(2)}`,
      });
      navigate(`/booking/${data.bookingCode}`);
    },
  });

  const sendRemindersMutation = useMutation({
    mutationFn: () => backend.group.sendReminders({
      inviteCode: inviteCode!,
      organizerEmail: userEmail,
    }),
    onSuccess: (data) => {
      toast({
        title: "Reminders Sent",
        description: `Sent reminders to ${data.sent} people.`,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-96" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!groupBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Group booking not found</h1>
          <p className="text-gray-400 mb-6">Please check your invite code and try again.</p>
          <Button onClick={() => navigate('/events')}>Browse Events</Button>
        </div>
      </div>
    );
  }

  const isOrganizer = groupBooking.organizerEmail === userEmail;
  const isMember = groupBooking.members.some(m => m.email === userEmail);
  const isInvited = groupBooking.invitations.some(i => i.email === userEmail);
  const canJoin = groupBooking.canStillJoin && !isMember;
  const progressPercentage = (groupBooking.totalBooked / groupBooking.maxSize) * 100;

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage.trim());
    }
  };

  const handleSendInvites = () => {
    const emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length > 0) {
      sendInvitesMutation.mutate(emails);
    }
  };

  const handleJoinGroup = () => {
    if (selectedTier && quantity > 0) {
      joinGroupMutation.mutate();
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode!);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({
      title: "Invite code copied!",
      description: "Share this code with others to invite them to the group.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'locked': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'completed': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'cancelled': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{groupBooking.groupName}</h1>
              <p className="text-gray-400">{groupBooking.eventName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={getStatusColor(groupBooking.status)}>
                {groupBooking.status}
              </Badge>
              {isOrganizer && (
                <Crown className="h-5 w-5 text-yellow-400" title="Group Organizer" />
              )}
            </div>
          </div>

          {/* Event Info */}
          <div className="flex items-center space-x-6 text-gray-300">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(groupBooking.eventDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>{groupBooking.venue}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{groupBooking.totalBooked} / {groupBooking.maxSize} booked</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Progress */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  <span>Group Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Bookings</span>
                    <span className="text-white">{groupBooking.totalBooked} / {groupBooking.maxSize}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  
                  {/* Benefits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <Percent className="h-4 w-4 text-green-400" />
                      <span className="text-white">{groupBooking.discountPercentage}% Group Discount</span>
                    </div>
                    {groupBooking.complimentaryTickets > 0 && (
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4 text-pink-400" />
                        <span className="text-white">{groupBooking.complimentaryTickets} Complimentary Tickets</span>
                      </div>
                    )}
                  </div>

                  {/* Invite Code */}
                  <div className="mt-6 p-4 bg-purple-600/20 rounded-lg border border-purple-600/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-400 font-medium">Invite Code</p>
                        <p className="text-white text-lg font-mono">{groupBooking.inviteCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInviteCode}
                        className="border-purple-600/30 text-purple-400"
                      >
                        {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Join Group or Member List */}
            {canJoin ? (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Join This Group</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {eventDetails && (
                    <>
                      <div>
                        <Label className="text-gray-300">Select Ticket Type</Label>
                        <Select value={selectedTier?.toString()} onValueChange={(value) => setSelectedTier(parseInt(value))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue placeholder="Choose ticket type" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {eventDetails.tickets.map((ticket) => (
                              <SelectItem key={ticket.id} value={ticket.id.toString()}>
                                {ticket.name} - ${ticket.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-300">Quantity</Label>
                        <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {[...Array(Math.min(5, groupBooking.remainingSlots))].map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1} ticket{i > 0 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTier && (
                        <div className="p-4 bg-green-600/20 rounded-lg border border-green-600/30">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Base Price:</span>
                              <span className="text-white">
                                ${(eventDetails.tickets.find(t => t.id === selectedTier)?.price || 0) * quantity}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Group Discount ({groupBooking.discountPercentage}%):</span>
                              <span className="text-green-400">
                                -${(((eventDetails.tickets.find(t => t.id === selectedTier)?.price || 0) * quantity * groupBooking.discountPercentage) / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-white">Final Price:</span>
                              <span className="text-white">
                                ${(((eventDetails.tickets.find(t => t.id === selectedTier)?.price || 0) * quantity) * (1 - groupBooking.discountPercentage / 100)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleJoinGroup}
                        disabled={!selectedTier || joinGroupMutation.isPending}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {joinGroupMutation.isPending ? 'Joining...' : 'Join Group & Book Tickets'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Group Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupBooking.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.name}</p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white">{member.quantity} tickets</p>
                          <p className="text-gray-400 text-sm">{member.ticketTierName}</p>
                          {member.isComplimentary && (
                            <Badge className="bg-pink-600/20 text-pink-400 border-pink-600/30 text-xs">
                              Complimentary
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {groupBooking.members.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No members have joined yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organizer Actions */}
            {isOrganizer && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Organizer Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Send Invites */}
                  <div>
                    <Label className="text-gray-300">Invite People (comma-separated emails)</Label>
                    <div className="flex space-x-2 mt-2">
                      <Textarea
                        placeholder="email1@example.com, email2@example.com"
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        rows={2}
                      />
                      <Button
                        onClick={handleSendInvites}
                        disabled={!inviteEmails.trim() || sendInvitesMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Send Reminders */}
                  <Button
                    onClick={() => sendRemindersMutation.mutate()}
                    disabled={sendRemindersMutation.isPending}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Send Reminders
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                  <span>Group Chat</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="h-64 overflow-y-auto space-y-3">
                    {groupBooking.chatMessages.map((message) => (
                      <div key={message.id} className={`p-2 rounded-lg ${
                        message.messageType === 'system' 
                          ? 'bg-blue-600/20 border border-blue-600/30' 
                          : 'bg-gray-800/50'
                      }`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium ${
                            message.messageType === 'system' ? 'text-blue-400' : 'text-white'
                          }`}>
                            {message.senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Send Message */}
                  {(isOrganizer || isMember || isInvited) && (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Group Info */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Group Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Organizer:</span>
                  <span className="text-white">{groupBooking.organizerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">
                    {new Date(groupBooking.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment:</span>
                  <span className="text-white">
                    {groupBooking.paymentMethod === 'individual' ? 'Individual' : 'Organizer Pays'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seating:</span>
                  <span className="text-white">
                    {groupBooking.seatingPreference === 'together' ? 'Together' : 
                     groupBooking.seatingPreference === 'scattered' ? 'Scattered' : 'No Preference'}
                  </span>
                </div>
                {groupBooking.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expires:</span>
                    <span className="text-white">
                      {new Date(groupBooking.expiresAt).toLocaleDateString()}
                    </span>
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
