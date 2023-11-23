/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
import functions = require("firebase-functions");
import admin = require("firebase-admin");
import nodemailer = require("nodemailer");
import * as cors from "cors";
import Stripe from 'stripe';
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
admin.initializeApp();

// Export the configured Stripe instance
exports.createPaymentIntent = functions.https.onRequest(async (req: any, res: any) =>
{
  return cors({ origin: true })(req, res, async () =>
  {
    const { amount, currency, email, referral } = req.body;
    if (!amount || !currency || !email)
    {
      throw new Error('Amount, currency, and email are required.');
    }
    try
    {
      const customer = await stripe.customers.create({
        email,
        metadata: referral ? { referral } : undefined, // only include referral in metadata if it's defined
      });

      const newAmount = Math.round(amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: newAmount,
        currency,
        customer: customer.id,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Save the payment information and complete the order in your Firebase Firestore or Realtime Database
      // Replace this code with your actual implementation

      res.send({ clientSecret: paymentIntent.client_secret, customerId: customer.id });

    } catch (e: any)
    {
      console.error('Error creating payment intent or customer:', e);
      res.status(400).send({ error: { message: e.message } });
    }
  })
});

export const stripeWebhook = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) =>
{
  let event: Stripe.Event;

  try
  {
    event = stripe.webhooks.constructEvent(
      req.rawBody.toString(),
      req.headers['stripe-signature'] as string,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err)
  {
    const error = err as Error;
    console.error(`Error validating webhook signature: ${error.message}`);
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded')
  {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;




    // Here, you can add your logic to do something when a payment is successful
    // For example, you can mark an order as paid in your database, or send a confirmation email
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
});

