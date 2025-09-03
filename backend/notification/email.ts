import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";

const sendGridApiKey = secret("SendGridApiKey");
const fromEmail = secret("FromEmail");

export interface SendEmailRequest {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface SendEmailResponse {
  messageId: string;
  status: string;
}

// Sends an email using SendGrid.
export const sendEmail = api<SendEmailRequest, SendEmailResponse>(
  { expose: true, method: "POST", path: "/notifications/email" },
  async ({ to, subject, htmlContent, textContent, templateId, templateData }) => {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(sendGridApiKey());

      const msg: any = {
        to,
        from: fromEmail(),
        subject,
      };

      if (templateId) {
        msg.templateId = templateId;
        msg.dynamicTemplateData = templateData || {};
      } else {
        msg.html = htmlContent;
        if (textContent) {
          msg.text = textContent;
        }
      }

      const [response] = await sgMail.send(msg);

      return {
        messageId: response.headers['x-message-id'] || 'unknown',
        status: 'sent',
      };
    } catch (error: any) {
      throw APIError.internal(`Email sending failed: ${error.message}`);
    }
  }
);

export interface SendTicketConfirmationRequest {
  userEmail: string;
  userName: string;
  eventTitle: string;
  ticketCount: number;
  totalAmount: number;
  orderNumber: string;
}

// Sends a ticket confirmation email.
export const sendTicketConfirmation = api<SendTicketConfirmationRequest, SendEmailResponse>(
  { expose: true, method: "POST", path: "/notifications/ticket-confirmation" },
  async ({ userEmail, userName, eventTitle, ticketCount, totalAmount, orderNumber }) => {
    const subject = `Ticket Confirmation - ${eventTitle}`;
    const htmlContent = `
      <h2>Ticket Confirmation</h2>
      <p>Dear ${userName},</p>
      <p>Thank you for your purchase! Your tickets for <strong>${eventTitle}</strong> have been confirmed.</p>
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Number of Tickets:</strong> ${ticketCount}</p>
        <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
      </div>
      <p>Your tickets will be available in your account and can be accessed using the QR codes provided.</p>
      <p>We look forward to seeing you at the event!</p>
      <p>Best regards,<br>Fashion Platform Team</p>
    `;

    return await sendEmail({
      to: userEmail,
      subject,
      htmlContent,
    });
  }
);

export interface SendDesignerVerificationRequest {
  designerEmail: string;
  designerName: string;
  status: string;
  notes?: string;
}

// Sends a designer verification status email.
export const sendDesignerVerification = api<SendDesignerVerificationRequest, SendEmailResponse>(
  { expose: true, method: "POST", path: "/notifications/designer-verification" },
  async ({ designerEmail, designerName, status, notes }) => {
    const subject = `Designer Application ${status === 'verified' ? 'Approved' : 'Update'}`;
    
    let htmlContent = `
      <h2>Designer Application Update</h2>
      <p>Dear ${designerName},</p>
    `;

    if (status === 'verified') {
      htmlContent += `
        <p>Congratulations! Your designer application has been <strong>approved</strong>.</p>
        <p>You can now:</p>
        <ul>
          <li>Create and manage your collections</li>
          <li>Upload portfolio items</li>
          <li>Participate in fashion events</li>
          <li>Access designer tools and features</li>
        </ul>
      `;
    } else if (status === 'rejected') {
      htmlContent += `
        <p>We regret to inform you that your designer application has been <strong>declined</strong>.</p>
        ${notes ? `<p><strong>Feedback:</strong> ${notes}</p>` : ''}
        <p>You may reapply in the future after addressing any feedback provided.</p>
      `;
    }

    htmlContent += `
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
      <p>Best regards,<br>Fashion Platform Team</p>
    `;

    return await sendEmail({
      to: designerEmail,
      subject,
      htmlContent,
    });
  }
);

export interface SendEventReminderRequest {
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: Date;
  venueAddress: string;
}

// Sends an event reminder email.
export const sendEventReminder = api<SendEventReminderRequest, SendEmailResponse>(
  { expose: true, method: "POST", path: "/notifications/event-reminder" },
  async ({ userEmail, userName, eventTitle, eventDate, venueAddress }) => {
    const subject = `Event Reminder - ${eventTitle}`;
    const eventDateStr = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const htmlContent = `
      <h2>Event Reminder</h2>
      <p>Dear ${userName},</p>
      <p>This is a friendly reminder about your upcoming event:</p>
      <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>${eventTitle}</h3>
        <p><strong>Date & Time:</strong> ${eventDateStr}</p>
        <p><strong>Venue:</strong> ${venueAddress}</p>
      </div>
      <p>Please arrive at least 30 minutes before the event starts. Don't forget to bring your tickets!</p>
      <p>We're excited to see you there!</p>
      <p>Best regards,<br>Fashion Platform Team</p>
    `;

    return await sendEmail({
      to: userEmail,
      subject,
      htmlContent,
    });
  }
);
