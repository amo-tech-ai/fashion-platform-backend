import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import { notification } from "~encore/clients";
import type { SponsorContract, SponsorPayment, SponsorActivation } from "./types";

export interface CreateContractRequest {
  proposalId: number;
  paymentTerms?: string;
  startDate?: Date;
  endDate?: Date;
  deliverables?: Record<string, any>;
  performedBy: string;
}

export interface ContractWithDetails extends SponsorContract {
  companyName: string;
  contactName: string;
  contactEmail: string;
  eventName: string;
  eventDate: Date;
  payments: SponsorPayment[];
  activations: SponsorActivation[];
}

// Create contract from accepted proposal
export const createContract = api<CreateContractRequest, ContractWithDetails>(
  { method: "POST", path: "/sponsor/contracts" },
  async ({ proposalId, paymentTerms = "50% upon signing, 50% 30 days before event", startDate, endDate, deliverables, performedBy }) => {
    await using tx = await db.begin();

    try {
      // Get proposal details
      const proposal = await tx.queryRow`
        SELECT 
          sp.*,
          sl.contact_name,
          sl.contact_email,
          sc.name as company_name,
          sc.id as company_id,
          e.name as event_name,
          e.date as event_date,
          e.id as event_id
        FROM sponsor_proposals sp
        JOIN sponsor_leads sl ON sp.lead_id = sl.id
        LEFT JOIN sponsor_companies sc ON sl.company_id = sc.id
        LEFT JOIN events e ON sp.event_id = e.id
        WHERE sp.id = ${proposalId} AND sp.status = 'accepted'
      `;

      if (!proposal) {
        throw APIError.notFound("Accepted proposal not found");
      }

      // Generate contract number
      const contractNumber = `SPO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Set default dates if not provided
      const contractStartDate = startDate || new Date();
      const contractEndDate = endDate || new Date(proposal.event_date);

      // Create contract
      const contract = await tx.queryRow`
        INSERT INTO sponsor_contracts (
          proposal_id, contract_number, sponsor_company_id, event_id,
          total_amount, payment_terms, start_date, end_date, deliverables
        )
        VALUES (
          ${proposalId}, ${contractNumber}, ${proposal.company_id}, ${proposal.event_id},
          ${proposal.total_amount}, ${paymentTerms}, ${contractStartDate}, ${contractEndDate},
          ${deliverables ? JSON.stringify(deliverables) : null}
        )
        RETURNING *
      `;

      if (!contract) {
        throw APIError.internal("Failed to create contract");
      }

      // Create payment schedule
      const payments = await createPaymentSchedule(contract.id, proposal.total_amount, paymentTerms, proposal.event_date, tx);

      // Create activation checklist
      const activations = await createActivationChecklist(contract.id, proposal.package_id, deliverables, tx);

      // Update lead status
      await tx.exec`
        UPDATE sponsor_leads 
        SET status = 'closed_won', updated_at = NOW()
        WHERE id = ${proposal.lead_id}
      `;

      // Log activity
      await tx.exec`
        INSERT INTO sponsor_lead_activities (lead_id, activity_type, description, performed_by)
        VALUES (${proposal.lead_id}, 'contract_created', 'Contract ${contractNumber} created', ${performedBy})
      `;

      await tx.commit();

      // Send contract for signature
      await notification.sendContractForSignature({
        contractId: contract.id,
        contractNumber,
        recipientEmail: proposal.contact_email,
        recipientName: proposal.contact_name,
        companyName: proposal.company_name,
        totalAmount: proposal.total_amount,
      });

      return {
        id: contract.id,
        proposalId: contract.proposal_id,
        contractNumber: contract.contract_number,
        sponsorCompanyId: contract.sponsor_company_id,
        eventId: contract.event_id,
        totalAmount: contract.total_amount,
        paymentTerms: contract.payment_terms,
        contractDocumentUrl: contract.contract_document_url,
        signatureStatus: contract.signature_status,
        sponsorSignedAt: contract.sponsor_signed_at,
        organizerSignedAt: contract.organizer_signed_at,
        startDate: contract.start_date,
        endDate: contract.end_date,
        deliverables: contract.deliverables,
        createdAt: contract.created_at,
        updatedAt: contract.updated_at,
        companyName: proposal.company_name,
        contactName: proposal.contact_name,
        contactEmail: proposal.contact_email,
        eventName: proposal.event_name,
        eventDate: proposal.event_date,
        payments,
        activations,
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface SignContractRequest {
  contractId: number;
  signatureType: "sponsor" | "organizer";
  signedBy: string;
  signatureData?: string;
}

// Sign contract (sponsor or organizer)
export const signContract = api<SignContractRequest, { success: boolean; fullyExecuted: boolean }>(
  { method: "POST", path: "/sponsor/contracts/sign" },
  async ({ contractId, signatureType, signedBy, signatureData }) => {
    await using tx = await db.begin();

    try {
      const contract = await tx.queryRow`
        SELECT * FROM sponsor_contracts WHERE id = ${contractId}
      `;

      if (!contract) {
        throw APIError.notFound("Contract not found");
      }

      let newStatus = contract.signature_status;
      let updateFields: string[] = [];
      let updateValues: any[] = [];
      let paramIndex = 1;

      if (signatureType === 'sponsor') {
        if (contract.sponsor_signed_at) {
          throw APIError.invalidArgument("Contract already signed by sponsor");
        }
        updateFields.push(`sponsor_signed_at = NOW()`);
        newStatus = contract.organizer_signed_at ? 'both_signed' : 'sponsor_signed';
      } else {
        if (contract.organizer_signed_at) {
          throw APIError.invalidArgument("Contract already signed by organizer");
        }
        updateFields.push(`organizer_signed_at = NOW()`);
        newStatus = contract.sponsor_signed_at ? 'both_signed' : 'sponsor_signed';
      }

      updateFields.push(`signature_status = $${paramIndex}`);
      updateValues.push(newStatus);
      paramIndex++;

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(contractId);

      const query = `
        UPDATE sponsor_contracts 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updatedContract = await tx.rawQueryRow(query, ...updateValues);

      // Create portal access for sponsor if fully executed
      if (newStatus === 'both_signed' && signatureType === 'sponsor') {
        await createSponsorPortalAccess(contractId, tx);
      }

      await tx.commit();

      const fullyExecuted = newStatus === 'both_signed';

      // Send notifications
      if (fullyExecuted) {
        await notification.notifyContractFullyExecuted({
          contractId,
          contractNumber: contract.contract_number,
        });
      }

      return { success: true, fullyExecuted };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

export interface ProcessPaymentRequest {
  paymentId: number;
  paymentMethod: string;
  transactionId: string;
  processedBy: string;
}

// Process sponsor payment
export const processPayment = api<ProcessPaymentRequest, { success: boolean }>(
  { method: "POST", path: "/sponsor/payments/process" },
  async ({ paymentId, paymentMethod, transactionId, processedBy }) => {
    await using tx = await db.begin();

    try {
      // Update payment status
      const payment = await tx.queryRow`
        UPDATE sponsor_payments 
        SET status = 'paid', paid_date = NOW(), payment_method = ${paymentMethod}, transaction_id = ${transactionId}
        WHERE id = ${paymentId} AND status = 'pending'
        RETURNING *
      `;

      if (!payment) {
        throw APIError.notFound("Pending payment not found");
      }

      // Get contract details for notification
      const contract = await tx.queryRow`
        SELECT 
          sc.*,
          sp.name as company_name,
          sl.contact_email
        FROM sponsor_contracts sc
        JOIN sponsor_companies sp ON sc.sponsor_company_id = sp.id
        JOIN sponsor_proposals spr ON sc.proposal_id = spr.id
        JOIN sponsor_leads sl ON spr.lead_id = sl.id
        WHERE sc.id = ${payment.contract_id}
      `;

      await tx.commit();

      // Send payment confirmation
      await notification.sendPaymentConfirmation({
        contractNumber: contract.contract_number,
        recipientEmail: contract.contact_email,
        companyName: contract.company_name,
        amount: payment.amount,
        paymentType: payment.payment_type,
        transactionId,
      });

      return { success: true };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
);

async function createPaymentSchedule(contractId: number, totalAmount: number, paymentTerms: string, eventDate: Date, tx: any): Promise<SponsorPayment[]> {
  const payments: SponsorPayment[] = [];

  // Parse payment terms and create schedule
  if (paymentTerms.includes('50%')) {
    // 50% upon signing, 50% before event
    const depositAmount = totalAmount * 0.5;
    const finalAmount = totalAmount - depositAmount;

    // Deposit payment (due immediately)
    const deposit = await tx.queryRow`
      INSERT INTO sponsor_payments (contract_id, amount, payment_type, due_date, status)
      VALUES (${contractId}, ${depositAmount}, 'deposit', NOW(), 'pending')
      RETURNING *
    `;

    // Final payment (due 30 days before event)
    const finalDueDate = new Date(eventDate);
    finalDueDate.setDate(finalDueDate.getDate() - 30);

    const final = await tx.queryRow`
      INSERT INTO sponsor_payments (contract_id, amount, payment_type, due_date, status)
      VALUES (${contractId}, ${finalAmount}, 'final', ${finalDueDate}, 'pending')
      RETURNING *
    `;

    payments.push(
      {
        id: deposit.id,
        contractId: deposit.contract_id,
        amount: deposit.amount,
        paymentType: deposit.payment_type,
        dueDate: deposit.due_date,
        paidDate: deposit.paid_date,
        paymentMethod: deposit.payment_method,
        transactionId: deposit.transaction_id,
        status: deposit.status,
        createdAt: deposit.created_at,
      },
      {
        id: final.id,
        contractId: final.contract_id,
        amount: final.amount,
        paymentType: final.payment_type,
        dueDate: final.due_date,
        paidDate: final.paid_date,
        paymentMethod: final.payment_method,
        transactionId: final.transaction_id,
        status: final.status,
        createdAt: final.created_at,
      }
    );
  } else {
    // Full payment upon signing
    const fullPayment = await tx.queryRow`
      INSERT INTO sponsor_payments (contract_id, amount, payment_type, due_date, status)
      VALUES (${contractId}, ${totalAmount}, 'full', NOW(), 'pending')
      RETURNING *
    `;

    payments.push({
      id: fullPayment.id,
      contractId: fullPayment.contract_id,
      amount: fullPayment.amount,
      paymentType: fullPayment.payment_type,
      dueDate: fullPayment.due_date,
      paidDate: fullPayment.paid_date,
      paymentMethod: fullPayment.payment_method,
      transactionId: fullPayment.transaction_id,
      status: fullPayment.status,
      createdAt: fullPayment.created_at,
    });
  }

  return payments;
}

async function createActivationChecklist(contractId: number, packageId?: number, customDeliverables?: Record<string, any>, tx?: any): Promise<SponsorActivation[]> {
  const activations: SponsorActivation[] = [];

  // Standard activations based on package
  const standardActivations = [
    { type: 'logo_assets', description: 'Provide high-resolution logo assets', daysBeforeEvent: 45 },
    { type: 'booth_setup', description: 'Coordinate booth setup and design', daysBeforeEvent: 30 },
    { type: 'marketing_materials', description: 'Review and approve marketing materials', daysBeforeEvent: 21 },
    { type: 'staff_credentials', description: 'Submit staff list for credentials', daysBeforeEvent: 14 },
    { type: 'final_walkthrough', description: 'Final venue walkthrough and setup', daysBeforeEvent: 1 },
  ];

  for (const activation of standardActivations) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + activation.daysBeforeEvent);

    const created = await tx.queryRow`
      INSERT INTO sponsor_activations (contract_id, activation_type, description, due_date, status)
      VALUES (${contractId}, ${activation.type}, ${activation.description}, ${dueDate}, 'pending')
      RETURNING *
    `;

    activations.push({
      id: created.id,
      contractId: created.contract_id,
      activationType: created.activation_type,
      description: created.description,
      dueDate: created.due_date,
      completedDate: created.completed_date,
      status: created.status,
      assignedTo: created.assigned_to,
      notes: created.notes,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    });
  }

  return activations;
}

async function createSponsorPortalAccess(contractId: number, tx: any): Promise<void> {
  // Get contract details
  const contract = await tx.queryRow`
    SELECT 
      sc.*,
      sl.contact_email
    FROM sponsor_contracts sc
    JOIN sponsor_proposals sp ON sc.proposal_id = sp.id
    JOIN sponsor_leads sl ON sp.lead_id = sl.id
    WHERE sc.id = ${contractId}
  `;

  if (!contract) return;

  // Generate access token
  const accessToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Create portal access
  await tx.exec`
    INSERT INTO sponsor_portal_access (contract_id, access_email, access_token, permissions)
    VALUES (
      ${contractId}, 
      ${contract.contact_email}, 
      ${accessToken},
      '{"view_contract": true, "view_activations": true, "upload_assets": true}'
    )
  `;

  // Send portal access email
  await notification.sendSponsorPortalAccess({
    recipientEmail: contract.contact_email,
    contractNumber: contract.contract_number,
    accessToken,
  });
}
