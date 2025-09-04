import { api, APIError, Query } from "encore.dev/api";
import { db } from "./db";
import type { SponsorProspect, SponsorLead } from "./types";

// Import a list of prospects
export const importProspects = api<{ prospects: Array<{ companyName: string; website?: string; industry?: string }> }, { imported: number }>(
  { method: "POST", path: "/sponsor/prospects/import" },
  async ({ prospects }) => {
    let imported = 0;
    for (const p of prospects) {
      const existing = await db.queryRow`
        SELECT id FROM sponsor_prospects WHERE LOWER(company_name) = LOWER(${p.companyName})
      `;
      if (!existing) {
        await db.exec`
          INSERT INTO sponsor_prospects (company_name, website, industry, source)
          VALUES (${p.companyName}, ${p.website}, ${p.industry}, 'import')
        `;
        imported++;
      }
    }
    return { imported };
  }
);

// Convert a prospect to a lead
export const convertToLead = api<{ prospectId: number; contactName: string; contactEmail: string }, SponsorLead>(
  { method: "POST", path: "/sponsor/prospects/:prospectId/convert" },
  async ({ prospectId, contactName, contactEmail }) => {
    const prospect = await db.queryRow`
      SELECT * FROM sponsor_prospects WHERE id = ${prospectId}
    `;
    if (!prospect) throw APIError.notFound("Prospect not found");

    await using tx = await db.begin();
    try {
      let company = await tx.queryRow`
        SELECT * FROM sponsor_companies WHERE LOWER(name) = LOWER(${prospect.company_name})
      `;
      if (!company) {
        company = await tx.queryRow`
          INSERT INTO sponsor_companies (name, website, industry)
          VALUES (${prospect.company_name}, ${prospect.website}, ${prospect.industry})
          RETURNING *
        `;
      }

      const lead = await tx.queryRow`
        INSERT INTO sponsor_leads (company_id, contact_name, contact_email, lead_source)
        VALUES (${company.id}, ${contactName}, ${contactEmail}, 'prospecting')
        RETURNING *
      `;

      await tx.exec`
        UPDATE sponsor_prospects SET status = 'converted' WHERE id = ${prospectId}
      `;

      await tx.commit();
      return lead as SponsorLead;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
);

export interface GetProspectsParams {
  status?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface GetProspectsResponse {
  prospects: SponsorProspect[];
  total: number;
}

// Get sponsor prospects
export const getProspects = api<GetProspectsParams, GetProspectsResponse>(
  { method: "GET", path: "/sponsor/prospects" },
  async ({ status = 'new', limit = 50, offset = 0 }) => {
    const prospects = await db.queryAll`
      SELECT * FROM sponsor_prospects
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalResult = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_prospects WHERE status = ${status}`;
    return {
      prospects: prospects as SponsorProspect[],
      total: totalResult?.count || 0,
    };
  }
);
