import { api, APIError } from "encore.dev/api";
import { recommendationDB } from "./db";
import type { UserSimilarity } from "./types";

export interface CalculateUserSimilarityRequest {
  userId: number;
  targetUserIds?: number[];
}

export interface CalculateUserSimilarityResponse {
  similarities: UserSimilarity[];
  processed: number;
}

// Calculates user similarity based on interaction patterns.
export const calculateUserSimilarity = api<CalculateUserSimilarityRequest, CalculateUserSimilarityResponse>(
  { expose: true, method: "POST", path: "/recommendations/similarity/:userId" },
  async ({ userId, targetUserIds }) => {
    // Get user's interaction vector
    const userInteractions = await recommendationDB.queryAll`
      SELECT event_id, SUM(interaction_weight) as total_weight
      FROM user_interactions
      WHERE user_id = ${userId}
      GROUP BY event_id
    `;

    if (userInteractions.length === 0) {
      return { similarities: [], processed: 0 };
    }

    // Create user interaction map
    const userVector = new Map<number, number>();
    userInteractions.forEach(interaction => {
      userVector.set(interaction.event_id, interaction.total_weight);
    });

    // Get target users (if not specified, get users with similar interactions)
    let targetUsers: number[];
    if (targetUserIds && targetUserIds.length > 0) {
      targetUsers = targetUserIds;
    } else {
      const eventIds = Array.from(userVector.keys());
      const similarUsersQuery = await recommendationDB.queryAll`
        SELECT DISTINCT user_id
        FROM user_interactions
        WHERE event_id = ANY(${eventIds}) AND user_id != ${userId}
        LIMIT 100
      `;
      targetUsers = similarUsersQuery.map(row => row.user_id);
    }

    const similarities: UserSimilarity[] = [];

    for (const targetUserId of targetUsers) {
      // Get target user's interactions
      const targetInteractions = await recommendationDB.queryAll`
        SELECT event_id, SUM(interaction_weight) as total_weight
        FROM user_interactions
        WHERE user_id = ${targetUserId}
        GROUP BY event_id
      `;

      if (targetInteractions.length === 0) continue;

      // Create target user interaction map
      const targetVector = new Map<number, number>();
      targetInteractions.forEach(interaction => {
        targetVector.set(interaction.event_id, interaction.total_weight);
      });

      // Calculate cosine similarity
      const similarity = calculateCosineSimilarity(userVector, targetVector);

      if (similarity > 0.1) { // Only store meaningful similarities
        // Store similarity
        const row = await recommendationDB.queryRow`
          INSERT INTO user_similarity (user_a_id, user_b_id, similarity_score)
          VALUES (${userId}, ${targetUserId}, ${similarity})
          ON CONFLICT (user_a_id, user_b_id)
          DO UPDATE SET
            similarity_score = ${similarity},
            calculated_at = NOW()
          RETURNING *
        `;

        if (row) {
          similarities.push({
            id: row.id,
            userAId: row.user_a_id,
            userBId: row.user_b_id,
            similarityScore: row.similarity_score,
            calculatedAt: row.calculated_at,
          });
        }
      }
    }

    return {
      similarities,
      processed: targetUsers.length,
    };
  }
);

function calculateCosineSimilarity(vectorA: Map<number, number>, vectorB: Map<number, number>): number {
  const commonKeys = new Set([...vectorA.keys()].filter(key => vectorB.has(key)));
  
  if (commonKeys.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // Calculate for common events
  for (const key of commonKeys) {
    const valueA = vectorA.get(key) || 0;
    const valueB = vectorB.get(key) || 0;
    dotProduct += valueA * valueB;
  }

  // Calculate norms
  for (const [, value] of vectorA) {
    normA += value * value;
  }
  for (const [, value] of vectorB) {
    normB += value * value;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

export interface BatchCalculateSimilarityResponse {
  processed: number;
  errors: number;
}

// Calculates similarity for all users in batch.
export const batchCalculateSimilarity = api<void, BatchCalculateSimilarityResponse>(
  { expose: true, method: "POST", path: "/recommendations/similarity/batch" },
  async () => {
    // Get all users with interactions
    const users = await recommendationDB.queryAll`
      SELECT DISTINCT user_id
      FROM user_interactions
      ORDER BY user_id
    `;

    let processed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        await calculateUserSimilarity({ userId: user.user_id });
        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to calculate similarity for user ${user.user_id}:`, error);
      }
    }

    return { processed, errors };
  }
);
