import React from 'react';
import { Search, Calendar, MapPin, DollarSign, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface SearchFilters {
  query: string;
  venue: string;
  startDate: string;
  endDate: string;
  minPrice: string;
  maxPrice: string;
  availableOnly: boolean;
  eventType: string;
  sortBy: string;
  sortOrder: string;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  filterOptions: {
    venues: string[];
    priceRange: { min: number; max: number };
    eventTypes: string[];
  };
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  filterOptions,
  onClearFilters,
  isLoading = false,
}: SearchFiltersProps) {
  const updateFilter = (key: keyof SearchFilters, value: string | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.venue) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.availableOnly) count++;
    if (filters.eventType) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Filter className="h-5 w-5 text-purple-400" />
            <span>Search & Filters</span>
            {activeFiltersCount > 0 && (
              <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Query */}
        <div>
          <Label htmlFor="search" className="text-gray-300 mb-2 block">
            Search Events
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Search by event name or description..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Venue Filter */}
          <div>
            <Label className="text-gray-300 mb-2 block">Venue</Label>
            <Select value={filters.venue} onValueChange={(value) => updateFilter('venue', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="All venues" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="">All venues</SelectItem>
                {filterOptions.venues.map((venue) => (
                  <SelectItem key={venue} value={venue}>
                    {venue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type Filter */}
          <div>
            <Label className="text-gray-300 mb-2 block">Ticket Type</Label>
            <Select value={filters.eventType} onValueChange={(value) => updateFilter('eventType', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="">All types</SelectItem>
                {filterOptions.eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-gray-300 mb-2 block">Sort By</Label>
            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="availability">Availability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-gray-300 mb-2 block">Order</Label>
            <Select value={filters.sortOrder} onValueChange={(value) => updateFilter('sortOrder', value)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-gray-300 mb-2 block">
                Start Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="endDate" className="text-gray-300 mb-2 block">
                End Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minPrice" className="text-gray-300 mb-2 block">
                Min Price
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-gray-300 mb-2 block">
                Max Price
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="1000"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="availableOnly"
            checked={filters.availableOnly}
            onCheckedChange={(checked) => updateFilter('availableOnly', checked as boolean)}
            className="border-gray-600"
          />
          <Label htmlFor="availableOnly" className="text-gray-300 text-sm">
            Show only events with available tickets
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
