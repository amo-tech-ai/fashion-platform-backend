import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { ShowDetailsPage } from './pages/ShowDetailsPage';
import { BookingPage } from './pages/BookingPage';
import { TicketsPage } from './pages/TicketsPage';
import { WaitlistPage } from './pages/WaitlistPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { ProjectOverview } from './pages/ProjectOverview';

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
              <Route path="/" element={<HomePage />} />
              <Route path="/shows/:showId" element={<ShowDetailsPage />} />
              <Route path="/shows/:showId/book" element={<BookingPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/waitlist" element={<WaitlistPage />} />
              <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
              <Route path="/organizer/projects/:projectId" element={<ProjectOverview />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}
