import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const designerDB = SQLDatabase.named("designer");
const eventDB = SQLDatabase.named("event");
const venueDB = SQLDatabase.named("venue");

export interface GlobalSearchParams {
  query: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
  types?: Query<string>;
}

export interface SearchResult {
  id: number;
  type: "designer" | "event" | "venue";
  title: string;
  description?: string;
  imageUrl?: string;
  metadata: Record<string, any>;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  total: number;
  counts: {
    designers: number;
    events: number;
    venues: number;
  };
}

// Performs a global search across designers, events, and venues.
export const globalSearch = api<GlobalSearchParams, GlobalSearchResponse>(
  { expose: true, method: "GET", path: "/search" },
  async ({ query, limit = 20, offset = 0, types }) => {
    const searchTypes = types ? types.split(',') : ['designer', 'event', 'venue'];
    const results: SearchResult[] = [];
    const counts = { designers: 0, events: 0, venues: 0 };

    const searchTerm = `%${query}%`;

    // Search designers
    if (searchTypes.includes('designer')) {
      const designerResults = await designerDB.queryAll`
        SELECT d.id, d.brand_name, d.bio, d.verification_status,
               COUNT(pi.id) as portfolio_count
        FROM designers d
        LEFT JOIN portfolio_items pi ON d.id = pi.designer_id
        WHERE d.verification_status = 'verified'
          AND (d.brand_name ILIKE ${searchTerm} OR d.bio ILIKE ${searchTerm})
        GROUP BY d.id, d.brand_name, d.bio, d.verification_status
        ORDER BY d.brand_name ASC
        LIMIT ${Math.ceil(limit / searchTypes.length)}
      `;

      for (const row of designerResults) {
        results.push({
          id: row.id,
          type: 'designer',
          title: row.brand_name,
          description: row.bio,
          metadata: {
            verificationStatus: row.verification_status,
            portfolioCount: row.portfolio_count,
          },
        });
      }

      const designerCount = await designerDB.queryRow`
        SELECT COUNT(*) as count FROM designers
        WHERE verification_status = 'verified'
          AND (brand_name ILIKE ${searchTerm} OR bio ILIKE ${searchTerm})
      `;
      counts.designers = designerCount?.count || 0;
    }

    // Search events
    if (searchTypes.includes('event')) {
      const eventResults = await eventDB.queryAll`
        SELECT id, title, description, event_type, start_date, status
        FROM events
        WHERE status = 'published'
          AND (title ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
        ORDER BY start_date ASC
        LIMIT ${Math.ceil(limit / searchTypes.length)}
      `;

      for (const row of eventResults) {
        results.push({
          id: row.id,
          type: 'event',
          title: row.title,
          description: row.description,
          metadata: {
            eventType: row.event_type,
            startDate: row.start_date,
            status: row.status,
          },
        });
      }

      const eventCount = await eventDB.queryRow`
        SELECT COUNT(*) as count FROM events
        WHERE status = 'published'
          AND (title ILIKE ${searchTerm} OR description ILIKE ${searchTerm})
      `;
      counts.events = eventCount?.count || 0;
    }

    // Search venues
    if (searchTypes.includes('venue')) {
      const venueResults = await venueDB.queryAll`
        SELECT id, name, description, city, country, capacity
        FROM venues
        WHERE is_active = true
          AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR city ILIKE ${searchTerm})
        ORDER BY name ASC
        LIMIT ${Math.ceil(limit / searchTypes.length)}
      `;

      for (const row of venueResults) {
        results.push({
          id: row.id,
          type: 'venue',
          title: row.name,
          description: row.description,
          metadata: {
            city: row.city,
            country: row.country,
            capacity: row.capacity,
          },
        });
      }

      const venueCount = await venueDB.queryRow`
        SELECT COUNT(*) as count FROM venues
        WHERE is_active = true
          AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR city ILIKE ${searchTerm})
      `;
      counts.venues = venueCount?.count || 0;
    }

    // Sort results by relevance (simple alphabetical for now)
    results.sort((a, b) => a.title.localeCompare(b.title));

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);
    const total = counts.designers + counts.events + counts.venues;

    return {
      results: paginatedResults,
      total,
      counts,
    };
  }
);
