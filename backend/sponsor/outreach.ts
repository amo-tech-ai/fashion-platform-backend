import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { cron } from "encore.dev/cron";
import { notification } from "~encore/clients";
import type { OutreachCampaign, CampaignEmail, LeadCampaignEnrollment } from "./types";

// Create a new outreach campaign
export const createCampaign = api<{ name: string; description?: string }, OutreachCampaign>(
  { method: "POST", path: "/sponsor/campaigns" },
  async ({ name, description }) => {
    const campaign = await db.queryRow`
      INSERT INTO outreach_campaigns (name, description)
      VALUES (${name}, ${description})
      RETURNING *
    `;
    if (!campaign) throw APIError.internal("Failed to create campaign");
    return campaign as OutreachCampaign;
  }
);

// Enroll a lead into a campaign
export const enrollLeadInCampaign = api<{ leadId: number; campaignId: number }, LeadCampaignEnrollment>(
  { method: "POST", path: "/sponsor/campaigns/enroll" },
  async ({ leadId, campaignId }) => {
    const enrollment = await db.queryRow`
      INSERT INTO lead_campaign_enrollment (lead_id, campaign_id)
      VALUES (${leadId}, ${campaignId})
      ON CONFLICT (lead_id, campaign_id) DO NOTHING
      RETURNING *
    `;
    if (!enrollment) throw APIError.alreadyExists("Lead already enrolled in this campaign");
    return enrollment as LeadCampaignEnrollment;
  }
);

// Cron job to send scheduled emails
export const sendScheduledEmails = cron("send-outreach-emails", {
  schedule: "every 1 hour",
  handler: async () => {
    const enrollments = await db.queryAll`
      SELECT * FROM lead_campaign_enrollment
      WHERE status = 'active'
    `;

    for (const enrollment of enrollments) {
      const lastSent = enrollment.last_sent_at ? new Date(enrollment.last_sent_at) : new Date(enrollment.enrolled_at);
      const nextEmail = await db.queryRow`
        SELECT * FROM campaign_emails
        WHERE campaign_id = ${enrollment.campaign_id}
          AND sequence_number = ${enrollment.current_sequence}
      `;

      if (nextEmail) {
        const sendDate = new Date(lastSent);
        sendDate.setDate(sendDate.getDate() + nextEmail.delay_days);

        if (new Date() >= sendDate) {
          const lead = await db.queryRow`SELECT * FROM sponsor_leads WHERE id = ${enrollment.lead_id}`;
          if (lead) {
            // Mock sending email
            console.log(`Sending email sequence ${nextEmail.sequence_number} to ${lead.contact_email}`);
            
            // Update enrollment
            await db.exec`
              UPDATE lead_campaign_enrollment
              SET current_sequence = ${enrollment.current_sequence + 1},
                  last_sent_at = NOW()
              WHERE id = ${enrollment.id}
            `;
          }
        }
      } else {
        // Campaign completed
        await db.exec`
          UPDATE lead_campaign_enrollment
          SET status = 'completed'
          WHERE id = ${enrollment.id}
        `;
      }
    }
  },
});
