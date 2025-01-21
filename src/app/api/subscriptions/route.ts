import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Stripe from 'stripe';
import { getStripeCustomerId } from '@/lib/models/stripe-customer';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
      // Get the Stripe customer ID from MongoDB
      const stripeCustomerId = await getStripeCustomerId(session.user.id);
      
      if (!stripeCustomerId) {
        // If no Stripe customer ID is found, return empty subscriptions
        return NextResponse.json([]);
      }

      // Fetch all subscriptions for the user using their Stripe customer ID
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        expand: ['data.default_payment_method'],
      });

      // Transform the subscriptions data to match the dashboard's expected format
      const transformedSubscriptions = subscriptions.data.map((sub) => ({
        id: sub.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        amount: sub.items.data[0].price.unit_amount || 0,
        currency: sub.currency,
      }));

      return NextResponse.json(transformedSubscriptions);
    } catch (stripeError: any) {
      // Handle the case where the customer doesn't exist in Stripe
      if (stripeError?.code === 'resource_missing' || stripeError?.raw?.code === 'resource_missing') {
        return NextResponse.json([]);
      }
      // Re-throw other Stripe errors to be caught by the outer try-catch
      throw stripeError;
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return new NextResponse('Error fetching subscriptions', { status: 500 });
  }
}