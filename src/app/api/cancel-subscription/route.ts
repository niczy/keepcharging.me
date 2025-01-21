import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');

    if (!subscriptionId) {
      return new NextResponse('Subscription ID is required', { status: 400 });
    }

    // Cancel the subscription
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new NextResponse('Error canceling subscription', { status: 500 });
  }
}