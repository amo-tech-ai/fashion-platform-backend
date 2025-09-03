import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";

const stripeSecretKey = secret("StripeSecretKey");

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  orderId: number;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

// Creates a Stripe payment intent for ticket orders.
export const createPaymentIntent = api<CreatePaymentIntentRequest, CreatePaymentIntentResponse>(
  { expose: true, method: "POST", path: "/payment/intent" },
  async ({ amount, currency, orderId, metadata }) => {
    try {
      const stripe = require('stripe')(stripeSecretKey());
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          orderId: orderId.toString(),
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      throw APIError.internal(`Payment intent creation failed: ${error.message}`);
    }
  }
);

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  status: string;
  orderId: number;
}

// Confirms a payment and retrieves order information.
export const confirmPayment = api<ConfirmPaymentRequest, ConfirmPaymentResponse>(
  { expose: true, method: "POST", path: "/payment/confirm" },
  async ({ paymentIntentId }) => {
    try {
      const stripe = require('stripe')(stripeSecretKey());
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw APIError.failedPrecondition(`Payment not completed. Status: ${paymentIntent.status}`);
      }

      const orderId = parseInt(paymentIntent.metadata.orderId);
      if (!orderId) {
        throw APIError.invalidArgument("Order ID not found in payment metadata");
      }

      return {
        status: paymentIntent.status,
        orderId,
      };
    } catch (error: any) {
      throw APIError.internal(`Payment confirmation failed: ${error.message}`);
    }
  }
);

export interface CreateCheckoutSessionRequest {
  orderId: number;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// Creates a Stripe checkout session for ticket purchases.
export const createCheckoutSession = api<CreateCheckoutSessionRequest, CreateCheckoutSessionResponse>(
  { expose: true, method: "POST", path: "/payment/checkout" },
  async ({ orderId, amount, currency, successUrl, cancelUrl, customerEmail }) => {
    try {
      const stripe = require('stripe')(stripeSecretKey());
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Event Tickets - Order #${orderId}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
          orderId: orderId.toString(),
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      throw APIError.internal(`Checkout session creation failed: ${error.message}`);
    }
  }
);

export interface RefundPaymentRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundPaymentResponse {
  refundId: string;
  status: string;
  amount: number;
}

// Processes a refund for a payment.
export const refundPayment = api<RefundPaymentRequest, RefundPaymentResponse>(
  { expose: true, method: "POST", path: "/payment/refund" },
  async ({ paymentIntentId, amount, reason }) => {
    try {
      const stripe = require('stripe')(stripeSecretKey());
      
      const refundData: any = {
        payment_intent: paymentIntentId,
      };
      
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }
      
      if (reason) {
        refundData.reason = reason;
      }
      
      const refund = await stripe.refunds.create(refundData);

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Convert back to dollars
      };
    } catch (error: any) {
      throw APIError.internal(`Refund processing failed: ${error.message}`);
    }
  }
);
