import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Navigation } from './components/Navigation';
import { EventList } from './pages/EventList';
import { EventDetails } from './pages/EventDetails';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { EventAnalytics } from './pages/EventAnalytics';
import { VenueAnalytics } from './pages/VenueAnalytics';
import { VenueComparison } from './pages/VenueComparison';
import { UserDashboard } from './pages/UserDashboard';
import { GroupBooking } from './pages/GroupBooking';
import { CreateGroupBooking } from './pages/CreateGroupBooking';
import { SponsorDashboard } from './pages/SponsorDashboard';
import { SponsorLeadForm } from './pages/SponsorLeadForm';
import { SponsorPortal } from './pages/SponsorPortal';
import { SponsorProspecting } from './pages/SponsorProspecting';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-black text-white">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<EventList />} />
              <Route path="/events" element={<EventList />} />
              <Route path="/events/:eventId" element={<EventDetails />} />
              <Route path="/events/:eventId/create-group" element={<CreateGroupBooking />} />
              <Route path="/group/:inviteCode" element={<GroupBooking />} />
              <Route path="/booking/:bookingCode" element={<BookingConfirmation />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/organizer/events/:eventId/analytics" element={<EventAnalytics />} />
              <Route path="/organizer/sponsors" element={<SponsorDashboard />} />
              <Route path="/organizer/prospecting" element={<SponsorProspecting />} />
              <Route path="/sponsor-us" element={<SponsorLeadForm />} />
              <Route path="/sponsor-portal/:contractId" element={<SponsorPortal />} />
              <Route path="/venues/:venue/analytics" element={<VenueAnalytics />} />
              <Route path="/venues/comparison" element={<VenueComparison />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}
