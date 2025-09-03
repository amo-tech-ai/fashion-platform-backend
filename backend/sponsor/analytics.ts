import { api } from "encore.dev/api";
import { db } from "./db";

export interface PipelineAnalyticsResponse {
  funnel: {
    prospects: number;
    leads: number;
    qualified: number;
    proposals: number;
    contracts: number;
  };
  conversionRates: {
    prospectToLead: number;
    leadToQualified: number;
    qualifiedToProposal: number;
    proposalToContract: number;
    overall: number;
  };
  averageTimeToConvert: number; // in days
  pipelineValue: number;
}

// Get pipeline analytics
export const getPipelineAnalytics = api<void, PipelineAnalyticsResponse>(
  { method: "GET", path: "/sponsor/analytics/pipeline" },
  async () => {
    const prospectsCount = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_prospects`;
    const leadsCount = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_leads`;
    const qualifiedCount = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_leads WHERE status = 'qualified'`;
    const proposalsCount = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_proposals`;
    const contractsCount = await db.queryRow`SELECT COUNT(*) as count FROM sponsor_contracts`;

    const funnel = {
      prospects: prospectsCount?.count || 0,
      leads: leadsCount?.count || 0,
      qualified: qualifiedCount?.count || 0,
      proposals: proposalsCount?.count || 0,
      contracts: contractsCount?.count || 0,
    };

    const conversionRates = {
      prospectToLead: funnel.prospects > 0 ? (funnel.leads / funnel.prospects) * 100 : 0,
      leadToQualified: funnel.leads > 0 ? (funnel.qualified / funnel.leads) * 100 : 0,
      qualifiedToProposal: funnel.qualified > 0 ? (funnel.proposals / funnel.qualified) * 100 : 0,
      proposalToContract: funnel.proposals > 0 ? (funnel.contracts / funnel.proposals) * 100 : 0,
      overall: funnel.prospects > 0 ? (funnel.contracts / funnel.prospects) * 100 : 0,
    };

    const avgTimeToConvertResult = await db.queryRow`
      SELECT AVG(sc.created_at - sl.created_at) as avg_duration
      FROM sponsor_contracts sc
      JOIN sponsor_proposals sp ON sc.proposal_id = sp.id
      JOIN sponsor_leads sl ON sp.lead_id = sl.id
    `;

    const pipelineValueResult = await db.queryRow`
      SELECT SUM(sp.total_amount) as value
      FROM sponsor_proposals sp
      JOIN sponsor_leads sl ON sp.lead_id = sl.id
      WHERE sl.status IN ('qualified', 'proposal_sent', 'negotiating')
    `;

    return {
      funnel,
      conversionRates,
      averageTimeToConvert: avgTimeToConvertResult?.avg_duration?.days || 0,
      pipelineValue: pipelineValueResult?.value || 0,
    };
  }
);
