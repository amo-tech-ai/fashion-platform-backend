import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SearchFiltersComponent, SearchFilters } from '../components/SearchFilters';
import { SearchResults } from '../components/SearchResults';
import backend from '~backend/client';

const ITEMS_PER_PAGE = 12;

export function EventList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(0);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    venue: searchParams.get('venue') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    availableOnly: searchParams.get('availableOnly') === 'true',
    eventType: searchParams.get('eventType') || '',
    sortBy: searchParams.get('sortBy') || 'date',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== false) {
        params.set(key, value.toString());
      }
    });

    setSearchParams(params);
    setCurrentPage(0); // Reset to first page when filters change
  }, [filters, setSearchParams]);

  // Build search parameters
  const searchQueryParams = useMemo(() => {
    const params: any = {
      limit: ITEMS_PER_PAGE,
      offset: currentPage * ITEMS_PER_PAGE,
    };

    if (filters.query) params.query = filters.query;
    if (filters.venue) params.venue = filters.venue;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
    if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
    if (filters.availableOnly) params.availableOnly = filters.availableOnly;
    if (filters.eventType) params.eventType = filters.eventType;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }, [filters, currentPage]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events-search', searchQueryParams],
    queryFn: () => backend.event.search(searchQueryParams),
    staleTime: 30 * 1000, // 30 seconds
  });

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      query: '',
      venue: '',
      startDate: '',
      endDate: '',
      minPrice: '',
      maxPrice: '',
      availableOnly: false,
      eventType: '',
      sortBy: 'date',
      sortOrder: 'asc',
    });
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Combine results from all pages
  const allEvents = useMemo(() => {
    if (!data) return [];
    
    // For pagination, we need to accumulate results
    // This is a simplified approach - in a real app you might want to use infinite query
    return data.events;
  }, [data]);

  const hasMore = data ? (currentPage + 1) * ITEMS_PER_PAGE < data.total : false;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-red-400 mb-2">Error loading events</h3>
            <p className="text-gray-500">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Fashion Events</h1>
          <p className="text-gray-400 text-lg">Discover and book tickets for exclusive fashion shows</p>
        </div>

        {/* Search Filters */}
        <SearchFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          filterOptions={data?.filters || { venues: [], priceRange: { min: 0, max: 1000 }, eventTypes: [] }}
          onClearFilters={handleClearFilters}
          isLoading={isLoading}
        />

        {/* Search Results */}
        <SearchResults
          events={allEvents}
          total={data?.total || 0}
          isLoading={isLoading}
          searchQuery={filters.query}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}
