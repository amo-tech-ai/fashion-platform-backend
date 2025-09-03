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

// Send immediate confirmation to new sponsor leads
export const sendSponsorLeadConfirmation = api<SendSponsorLeadConfirmationRequest, void>(
  { method: "POST", path: "/internal/send-sponsor-lead-confirmation" },
  async ({ contactEmail, contactName, companyName, leadScore }) => {
    console.log(`Sending sponsor lead confirmation to ${contactEmail}`);
    console.log(`Lead Score: ${leadScore}, Company: ${companyName}`);
    
    // In a real app, you would integrate with an email service
    // const emailContent = `
    //   Hi ${contactName},
    //   
    //   Thank you for your interest in sponsoring our fashion events!
    //   
    //   We've received your inquiry for ${companyName} and our team will review it shortly.
    //   Based on your information, we've calculated a lead score of ${leadScore}/100.
    //   
    //   You'll receive personalized package recommendations within the next 5 minutes.
    //   
    //   Best regards,
    //   The Sponsorship Team
    // `;
  }
);

// Send automated package recommendations
export const sendPackageRecommendations = api<SendPackageRecommendationsRequest, void>(
  { method: "POST", path: "/internal/send-package-recommendations" },
  async ({ contactEmail, contactName, packages, leadId }) => {
    console.log(`Sending package recommendations to ${contactEmail}`);
    console.log(`Top package: ${packages[0]?.packageName} (${packages[0]?.matchScore}% match)`);
    
    // In a real app, you would integrate with an email service
    // const emailContent = `
    //   Hi ${contactName},
    //   
    //   Based on your sponsorship requirements, we've identified the following packages that would be perfect for your company:
    //   
    //   ${packages.map(pkg => `
    //     ${pkg.packageName} (${pkg.tier.toUpperCase()})
    //     - Price: $${pkg.price.toLocaleString()}
    //     - Match Score: ${pkg.matchScore}%
    //     - Benefits: ${pkg.benefits.join(', ')}
    //   `).join('\n')}
    //   
    //   Ready to discuss these opportunities? Book a discovery call: [CALENDAR_LINK]
    //   
    //   Best regards,
    //   The Sponsorship Team
    // `;
  }
);

// Send proposal to prospect
export const sendProposalEmail = api<SendProposalEmailRequest, void>(
  { method: "POST", path: "/internal/send-proposal-email" },
  async ({ recipientEmail, recipientName, companyName, eventName, totalAmount, roiProjections, trackingUrl, customMessage }) => {
    console.log(`Sending proposal to ${recipientEmail}`);
    console.log(`Amount: $${totalAmount}, ROI: ${roiProjections.roi}%`);
    
    // In a real app, you would integrate with an email service
    // const emailContent = `
    //   Hi ${recipientName},
    //   
    //   Thank you for your interest in sponsoring ${eventName || 'our fashion events'}!
    //   
    //   We're excited to present a customized sponsorship proposal for ${companyName}.
    //   
    //   Investment: $${totalAmount.toLocaleString()}
    //   Projected ROI: ${roiProjections.roi}%
    //   Estimated Value: $${roiProjections.totalEstimatedValue.toLocaleString()}
    //   
    //   ${customMessage || ''}
    //   
    //   View your detailed proposal: ${trackingUrl}
    //   
    //   Best regards,
    //   The Sponsorship Team
    // `;
  }
);

// Notify sales team of proposal response
export const notifyProposalResponse = api<NotifyProposalResponseRequest, void>(
  { method: "POST", path: "/internal/notify-proposal-response" },
  async ({ proposalId, leadId, response, feedback, requestedChanges }) => {
    console.log(`Proposal ${proposalId} ${response} by prospect`);
    if (feedback) console.log(`Feedback: ${feedback}`);
    
    // In a real app, you would notify the sales team
    // const notificationContent = `
    //   Proposal ${proposalId} has been ${response} by the prospect.
    //   
    //   ${feedback ? `Feedback: ${feedback}` : ''}
    //   ${requestedChanges ? `Requested Changes: ${requestedChanges.join(', ')}` : ''}
    //   
    //   Next steps: ${response === 'accepted' ? 'Prepare contract' : 'Follow up or close lead'}
    // `;
  }
);

// Send contract for signature
export const sendContractForSignature = api<SendContractForSignatureRequest, void>(
  { method: "POST", path: "/internal/send-contract-for-signature" },
  async ({ contractId, contractNumber, recipientEmail, recipientName, companyName, totalAmount }) => {
    console.log(`Sending contract ${contractNumber} for signature to ${recipientEmail}`);
    
    // In a real app, you would integrate with DocuSign or similar
    // const emailContent = `
    //   Hi ${recipientName},
    //   
    //   Congratulations! We're ready to move forward with the sponsorship agreement for ${companyName}.
    //   
    //   Contract: ${contractNumber}
    //   Total Investment: $${totalAmount.toLocaleString()}
    //   
    //   Please review and sign the contract: [DOCUSIGN_LINK]
    //   
    //   Once signed, you'll receive access to your sponsor portal with activation timeline.
    //   
    //   Best regards,
    //   The Sponsorship Team
    // `;
  }
);

// Notify when contract is fully executed
export const notifyContractFullyExecuted = api<NotifyContractFullyExecutedRequest, void>(
  { method: "POST", path: "/internal/notify-contract-fully-executed" },
  async ({ contractId, contractNumber }) => {
    console.log(`Contract ${contractNumber} is now fully executed`);
    
    // In a real app, you would notify relevant teams
    // - Sales team: Commission tracking
    // - Operations team: Activation planning
    // - Finance team: Payment tracking
    // - Marketing team: Sponsor onboarding
  }
);

// Send payment confirmation
export const sendPaymentConfirmation = api<SendPaymentConfirmationRequest, void>(
  { method: "POST", path: "/internal/send-payment-confirmation" },
  async ({ contractNumber, recipientEmail, companyName, amount, paymentType, transactionId }) => {
    console.log(`Payment confirmation for ${contractNumber}: $${amount} (${paymentType})`);
    
    // In a real app, you would send payment confirmation
    // const emailContent = `
    //   Hi there,
    //   
    //   We've successfully processed your ${paymentType} payment for contract ${contractNumber}.
    //   
    //   Amount: $${amount.toLocaleString()}
    //   Transaction ID: ${transactionId}
    //   
    //   Thank you for your partnership!
    //   
    //   Best regards,
    //   The Finance Team
    // `;
  }
);

// Send sponsor portal access
export const sendSponsorPortalAccess = api<SendSponsorPortalAccessRequest, void>(
  { method: "POST", path: "/internal/send-sponsor-portal-access" },
  async ({ recipientEmail, contractNumber, accessToken }) => {
    console.log(`Sending sponsor portal access for ${contractNumber} to ${recipientEmail}`);
    
    // In a real app, you would send portal access details
    // const emailContent = `
    //   Welcome to your Sponsor Portal!
    //   
    //   Contract: ${contractNumber}
    //   
    //   Access your portal: https://sponsor-portal.company.com/login?token=${accessToken}
    //   
    //   In your portal, you can:
    //   - View contract details
    //   - Track activation milestones
    //   - Upload marketing assets
    //   - Access event information
    //   
    //   Best regards,
    //   The Sponsorship Team
    // `;
  }
);
