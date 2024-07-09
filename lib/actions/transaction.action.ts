"use server";

import { ClientSession } from "mongoose";
import { redirect } from "next/navigation";
import Transaction from "../database/models/transaction.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

interface CheckoutTransactionParams {
  plan: string;
  amount: number;
  credits: number;
  buyerId: string;
  promoCode?: string;
}

interface CreateTransactionParams extends CheckoutTransactionParams {
  transactionId: string;
}

export async function checkoutCredits(transaction: CheckoutTransactionParams) {
  // Placeholder for the actual PayPal transaction logic
  const successUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/profile`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/`;

  // Simulate a successful PayPal transaction by redirecting to the success URL
  redirect(successUrl);
}

export async function createTransaction(
  transaction: CreateTransactionParams,
  session?: ClientSession
) {
  try {
    await connectToDatabase();

    // Create a new transaction with a buyerId and promoCode
    const newTransaction = await Transaction.create(
      [
        {
          ...transaction,
          buyer: transaction.buyerId,
        },
      ],
      { session }
    );

    return JSON.parse(JSON.stringify(newTransaction[0]));
  } catch (error) {
    handleError(error);
  }
}
