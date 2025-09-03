import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const sendGridKey = secret("SendGridApiKey");
const fromEmail = secret("FromEmail");

export interface SendConfirmationEmailRequest {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
}

// Helper function to send confirmation email
export const sendConfirmationEmail = api<SendConfirmationEmailRequest, void>(
  { method: "POST", path: "/internal/send-confirmation" },
  async ({ customerEmail, customerName, bookingCode }) => {
    console.log(`Sending confirmation to ${customerEmail} for booking ${bookingCode}`);
    // In a real app, you would integrate with an email service like SendGrid
    // For example:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(sendGridKey());
    // const msg = {
    //   to: customerEmail,
    //   from: fromEmail(),
    //   subject: 'Your Fashion Event Booking Confirmation',
    //   html: `<h1>Booking Confirmed!</h1><p>Hi ${customerName},</p><p>Your booking code is <strong>${bookingCode}</strong>.</p>`,
    // };
    // await sgMail.send(msg);
  }
);
