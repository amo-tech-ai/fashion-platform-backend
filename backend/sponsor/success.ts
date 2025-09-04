import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { CronJob } from "encore.dev/cron";
import { notification } from "~encore/clients";
import type { SponsorContract, SponsorAsset, SponsorActivation, RenewalOffer } from "./types";

export interface SponsorPortalData {
  contract: SponsorContract;
  companyName: string;
  eventName: string;
  activations: SponsorActivation[];
  assets: SponsorAsset[];
  payments: any[];
}

// Get data for the sponsor portal
export const getPortalData = api<{ contractId: number }, SponsorPortalData>(
  { method: "GET", path: "/sponsor/portal/:contractId" },
  async ({ contractId }) => {
    const contract = await db.queryRow`
      SELECT 
        sc.*,
        comp.name as company_name,
        e.name as event_name
      FROM sponsor_contracts sc
      JOIN sponsor_companies comp ON sc.sponsor_company_id = comp.id
      JOIN events e ON sc.event_id = e.id
      WHERE sc.id = ${contractId}
    `;
    if (!contract) throw APIError.notFound("Contract not found");

    const activations = await db.queryAll`SELECT * FROM sponsor_activations WHERE contract_id = ${contractId}`;
    const assets = await db.queryAll`SELECT * FROM sponsor_assets WHERE contract_id = ${contractId}`;
    const payments = await db.queryAll`SELECT * FROM sponsor_payments WHERE contract_id = ${contractId}`;

    return {
      contract: contract as SponsorContract,
      companyName: contract.company_name,
      eventName: contract.event_name,
      activations: activations as SponsorActivation[],
      assets: assets as SponsorAsset[],
      payments,
    };
  }
);

// Upload an asset for a contract
export const uploadAsset = api<{ contractId: number; assetType: string; fileUrl: string; submittedBy: string }, SponsorAsset>(
  { method: "POST", path: "/sponsor/portal/assets" },
  async ({ contractId, assetType, fileUrl, submittedBy }) => {
    const asset = await db.queryRow`
      INSERT INTO sponsor_assets (contract_id, asset_type, file_url, submitted_by)
      VALUES (${contractId}, ${assetType}, ${fileUrl}, ${submittedBy})
      RETURNING *
    `;
    if (!asset) throw APIError.internal("Failed to upload asset");
    return asset as SponsorAsset;
  }
);

// Cron job to send activation reminders
export const sendActivationReminders = new CronJob("send-activation-reminders", {
  schedule: "@daily",
  handler: async () => {
    const upcomingActivations = await db.queryAll`
      SELECT * FROM sponsor_activations
      WHERE status = 'pending' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `;
    for (const activation of upcomingActivations) {
      // In a real app, you'd get sponsor contact info and send an email
      console.log(`Reminder for activation ${activation.id} due on ${activation.due_date}`);
    }
  },
});

// Cron job to generate renewal offers
export const generateRenewalOffers = new CronJob("generate-renewal-offers", {
  schedule: "@daily",
  handler: async () => {
    const expiringContracts = await db.queryAll`
      SELECT * FROM sponsor_contracts
      WHERE renewal_status = 'pending' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
    `;
    for (const contract of expiringContracts) {
      const offerAmount = contract.total_amount * 0.9; // 10% early bird discount
      await db.exec`
        INSERT INTO renewal_offers (contract_id, offer_amount, incentives, status)
        VALUES (${contract.id}, ${offerAmount}, ARRAY['10% discount', 'Priority booth selection'], 'draft')
      `;
      await db.exec`
        UPDATE sponsor_contracts SET renewal_status = 'offered' WHERE id = ${contract.id}
      `;
    }
  },
});
