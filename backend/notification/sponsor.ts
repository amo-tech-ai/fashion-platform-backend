import { api } from "encore.dev/api";

export interface SendSponsorLeadConfirmationRequest {
  contactEmail: string;
  contactName: string;
  companyName: string;
  leadScore: number;
}

export interface SendPackageRecommendationsRequest {
  contactEmail: string;
  contactName: string;
  packages: Array<{
    packageName: string;
    tier: string;
    price: number;
    matchScore: number;
    benefits: string[];
  }>;
  leadId: number;
}

export interface SendProposalEmailRequest {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  eventName?: string;
  totalAmount: number;
  roiProjections: any;
  trackingUrl: string;
  customMessage?: string;
}

export interface NotifyProposalResponseRequest {
  proposalId: number;
  leadId: number;
  response: string;
  feedback?: string;
  requestedChanges?: string[];
}

export interface SendContractForSignatureRequest {
  contractId: number;
  contractNumber: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  totalAmount: number;
}

export interface NotifyContractFullyExecutedRequest {
  contractId: number;
  contractNumber: string;
}

export interface SendPaymentConfirmationRequest {
  contractNumber: string;
  recipientEmail: string;
  companyName: string;
  amount: number;
  paymentType: string;
  transactionId: string;
}

export interface SendSponsorPortalAccessRequest {
  recipientEmail: string;
  contractNumber: string;
  accessToken: string;
}

export interface SendActivationReminderRequest {
  recipientEmail: string;
  activationType: string;
  dueDate: Date;
}

export interface SendSuccessReportRequest {
  recipientEmail: string;
  contractNumber: string;
  reportUrl: string;
}

export interface SendRenewalOfferRequest {
  recipientEmail: string;
  contractNumber: string;
  offerAmount: number;
  validUntil: Date;
}

// Send immediate confirmation to new sponsor leads
export const sendSponsorLeadConfirmation = api<SendSponsorLeadConfirmationRequest, void>(
  { method: "POST", path: "/internal/send-sponsor-lead-confirmation" },
  async ({ contactEmail, contactName, companyName, leadScore }) => {
    console.log(`Sending sponsor lead confirmation to ${contactEmail}`);
  }
);

// Send automated package recommendations
export const sendPackageRecommendations = api<SendPackageRecommendationsRequest, void>(
  { method: "POST", path: "/internal/send-package-recommendations" },
  async ({ contactEmail, contactName, packages, leadId }) => {
    console.log(`Sending package recommendations to ${contactEmail}`);
  }
);

// Send proposal to prospect
export const sendProposalEmail = api<SendProposalEmailRequest, void>(
  { method: "POST", path: "/internal/send-proposal-email" },
  async (req) => {
    console.log(`Sending proposal to ${req.recipientEmail}`);
  }
);

// Notify sales team of proposal response
export const notifyProposalResponse = api<NotifyProposalResponseRequest, void>(
  { method: "POST", path: "/internal/notify-proposal-response" },
  async (req) => {
    console.log(`Proposal ${req.proposalId} ${req.response} by prospect`);
  }
);

// Send contract for signature
export const sendContractForSignature = api<SendContractForSignatureRequest, void>(
  { method: "POST", path: "/internal/send-contract-for-signature" },
  async (req) => {
    console.log(`Sending contract ${req.contractNumber} for signature to ${req.recipientEmail}`);
  }
);

// Notify when contract is fully executed
export const notifyContractFullyExecuted = api<NotifyContractFullyExecutedRequest, void>(
  { method: "POST", path: "/internal/notify-contract-fully-executed" },
  async (req) => {
    console.log(`Contract ${req.contractNumber} is now fully executed`);
  }
);

// Send payment confirmation
export const sendPaymentConfirmation = api<SendPaymentConfirmationRequest, void>(
  { method: "POST", path: "/internal/send-payment-confirmation" },
  async (req) => {
    console.log(`Payment confirmation for ${req.contractNumber}: $${req.amount} (${req.paymentType})`);
  }
);

// Send sponsor portal access
export const sendSponsorPortalAccess = api<SendSponsorPortalAccessRequest, void>(
  { method: "POST", path: "/internal/send-sponsor-portal-access" },
  async (req) => {
    console.log(`Sending sponsor portal access for ${req.contractNumber} to ${req.recipientEmail}`);
  }
);

// Send activation reminder
export const sendActivationReminder = api<SendActivationReminderRequest, void>(
  { method: "POST", path: "/internal/send-activation-reminder" },
  async (req) => {
    console.log(`Sending activation reminder to ${req.recipientEmail}`);
  }
);

// Send success report
export const sendSuccessReport = api<SendSuccessReportRequest, void>(
  { method: "POST", path: "/internal/send-success-report" },
  async (req) => {
    console.log(`Sending success report to ${req.recipientEmail}`);
  }
);

// Send renewal offer
export const sendRenewalOffer = api<SendRenewalOfferRequest, void>(
  { method: "POST", path: "/internal/send-renewal-offer" },
  async (req) => {
    console.log(`Sending renewal offer to ${req.recipientEmail}`);
  }
);
