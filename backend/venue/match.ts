import { api } from "encore.dev/api";
import { db } from "./db";

export interface VenueRequirements {
  sqft: number;
  capacity: number;
  features: string[];
  budget: number;
}

export interface MatchedVenue {
  id: number;
  name: string;
  location: string;
  capacitySeated: number;
  capacityStanding: number;
  sqft: number;
  baseCost: number;
  matchScore: number;
  matchReasons: string[];
}

// Match venues based on event requirements
export const match = api<VenueRequirements, { venues: MatchedVenue[] }>(
  { method: "POST", path: "/venues/match", expose: true },
  async (req) => {
    const allVenues = await db.queryAll`SELECT * FROM venues`;

    const scoredVenues = allVenues.map(venue => {
      let score = 0;
      const reasons: string[] = [];

      // Capacity check
      if ((venue.capacity_seated || 0) + (venue.capacity_standing || 0) >= req.capacity) {
        score += 30;
        reasons.push("Sufficient capacity");
      } else {
        score -= 20;
      }

      // Sqft check
      if ((venue.square_footage || 0) >= req.sqft) {
        score += 20;
        reasons.push("Adequate space");
      }

      // Feature check
      const requiredFeatures = new Set(req.features);
      const venueFeatures = new Set(venue.features || []);
      let matchedFeatures = 0;
      for (const feature of requiredFeatures) {
        if (venueFeatures.has(feature)) {
          matchedFeatures++;
        }
      }
      const featureMatchPercentage = (matchedFeatures / requiredFeatures.size) * 100;
      score += (featureMatchPercentage / 100) * 30;
      if (featureMatchPercentage > 50) {
        reasons.push(`${featureMatchPercentage.toFixed(0)}% feature match`);
      }

      // Budget check
      if ((venue.base_cost || 0) <= req.budget) {
        score += 20;
        reasons.push("Within budget");
      } else {
        score -= 10;
      }

      return {
        id: venue.id,
        name: venue.name,
        location: venue.location,
        capacitySeated: venue.capacity_seated,
        capacityStanding: venue.capacity_standing,
        sqft: venue.square_footage,
        baseCost: venue.base_cost,
        matchScore: Math.max(0, Math.min(100, score)),
        matchReasons: reasons,
      };
    });

    const sortedVenues = scoredVenues.sort((a, b) => b.matchScore - a.matchScore);

    return { venues: sortedVenues };
  }
);
