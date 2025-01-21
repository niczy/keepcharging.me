import { MongoClient } from 'mongodb';
import clientPromise from '../mongodb';

export interface StripeCustomerMapping {
  userId: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const client = await clientPromise;
  const collection = client.db().collection<StripeCustomerMapping>('stripeCustomers');
  
  const mapping = await collection.findOne({ userId });
  return mapping?.stripeCustomerId || null;
}

export async function setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const client = await clientPromise;
  const collection = client.db().collection<StripeCustomerMapping>('stripeCustomers');
  
  const now = new Date();
  await collection.updateOne(
    { userId },
    { 
      $set: {
        stripeCustomerId,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
}