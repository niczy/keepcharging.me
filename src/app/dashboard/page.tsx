'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  amount: number;
  currency: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchSubscriptions();
    }
  }, [session]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSubscription = async () => {
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
      });
      const data = await response.json();
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (error) {
          console.error('Error redirecting to checkout:', error);
        }
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      await fetch(`/api/cancel-subscription?id=${subscriptionId}`, {
        method: 'POST',
      });
      fetchSubscriptions(); // Refresh the list
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  if (!session) {
    return <div>Please sign in to access this page.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Subscriptions</h1>
        
        <button
          onClick={handleNewSubscription}
          className="mb-8 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Set Up New Recurring Charge
        </button>

        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <p>No active subscriptions found.</p>
          ) : (
            subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {(sub.amount / 100).toFixed(2)} {sub.currency.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Next payment: {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">Status: {sub.status}</p>
                </div>
                <button
                  onClick={() => handleCancelSubscription(sub.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}