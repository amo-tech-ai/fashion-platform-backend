import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Crown, UserCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface GroupBookingCardProps {
  groupBooking: {
    id: number;
    groupName: string;
    eventName: string;
    eventDate: Date;
    venue: string;
    inviteCode: string;
    status: string;
    role: 'organizer' | 'member' | 'invited';
    totalBooked: number;
    maxSize: number;
  };
}

export function GroupBookingCard({ groupBooking }: GroupBookingCardProps) {
  const progressPercentage = (groupBooking.totalBooked / groupBooking.maxSize) * 100;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'locked': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'completed': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'cancelled': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'organizer': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'member': return <UserCheck className="h-4 w-4 text-green-400" />;
      case 'invited': return <Mail className="h-4 w-4 text-blue-400" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'organizer': return 'Organizer';
      case 'member': return 'Member';
      case 'invited': return 'Invited';
      default: return '';
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-white text-lg font-semibold mb-1">{groupBooking.groupName}</h3>
            <p className="text-gray-400 text-sm">{groupBooking.eventName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(groupBooking.status)}>
              {groupBooking.status}
            </Badge>
            <div className="flex items-center space-x-1">
              {getRoleIcon(groupBooking.role)}
              <span className="text-xs text-gray-400">{getRoleLabel(groupBooking.role)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <Calendar className="h-4 w-4" />
            <span>{new Date(groupBooking.eventDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <MapPin className="h-4 w-4" />
            <span>{groupBooking.venue}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Group Progress</span>
            <span className="text-white">{groupBooking.totalBooked} / {groupBooking.maxSize}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-gray-400 text-sm">
            <Users className="h-4 w-4" />
            <span>{groupBooking.totalBooked} members</span>
          </div>
          <Link to={`/group/${groupBooking.inviteCode}`}>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              {groupBooking.role === 'invited' ? 'View Invitation' : 'View Group'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
