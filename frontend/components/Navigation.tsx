import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, Ticket, Menu, X, Building2, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const isOrganizerRoute = location.pathname.startsWith('/organizer');
  const isVenueRoute = location.pathname.startsWith('/venues');
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  const customerNavItems = [
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/dashboard', label: 'My Dashboard', icon: User },
  ];

  const organizerNavItems = [
    { href: '/organizer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/events', label: 'Public Events', icon: Calendar },
  ];

  const venueNavItems = [
    { href: '/venues/comparison', label: 'Venue Comparison', icon: BarChart3 },
    { href: '/events', label: 'Events', icon: Calendar },
  ];

  let navItems = customerNavItems;
  if (isOrganizerRoute) navItems = organizerNavItems;
  if (isVenueRoute) navItems = venueNavItems;

  const NavContent = () => (
    <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-8">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          to={href}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            location.pathname === href
              ? 'bg-white text-black'
              : 'text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
          onClick={() => setIsOpen(false)}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <nav className="bg-black border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-white">Fashion Events</span>
          </Link>

          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            <NavContent />
            <div className="flex items-center space-x-4">
              {!isOrganizerRoute && !isVenueRoute && !isDashboardRoute && (
                <>
                  <Link to="/dashboard">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      <User className="h-4 w-4 mr-2" />
                      My Dashboard
                    </Button>
                  </Link>
                  <Link to="/organizer">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      Organizer Login
                    </Button>
                  </Link>
                  <Link to="/venues/comparison">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      <Building2 className="h-4 w-4 mr-2" />
                      Venue Analytics
                    </Button>
                  </Link>
                </>
              )}
              {isDashboardRoute && (
                <>
                  <Link to="/organizer">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      Organizer Login
                    </Button>
                  </Link>
                  <Link to="/venues/comparison">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                      <Building2 className="h-4 w-4 mr-2" />
                      Venue Analytics
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black border-gray-800">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <span className="text-xl font-bold text-white">Fashion Events</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <NavContent />
                  {!isOrganizerRoute && !isVenueRoute && !isDashboardRoute && (
                    <>
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                          <User className="h-4 w-4 mr-2" />
                          My Dashboard
                        </Button>
                      </Link>
                      <Link to="/organizer" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                          Organizer Login
                        </Button>
                      </Link>
                      <Link to="/venues/comparison" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                          <Building2 className="h-4 w-4 mr-2" />
                          Venue Analytics
                        </Button>
                      </Link>
                    </>
                  )}
                  {isDashboardRoute && (
                    <>
                      <Link to="/organizer" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                          Organizer Login
                        </Button>
                      </Link>
                      <Link to="/venues/comparison" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                          <Building2 className="h-4 w-4 mr-2" />
                          Venue Analytics
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
