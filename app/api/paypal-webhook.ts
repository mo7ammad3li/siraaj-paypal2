import { updateCredits } from "@/lib/actions/user.actions";
import Transaction from "@/lib/database/models/transaction.model";
import { connectToDatabase } from "@/lib/database/mongoose";
import { handleError } from "@/lib/utils";
import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

const webhookId = process.env.PAYPAL_WEBHOOK_ID!;
const paypalClientId = process.env.PAYPAL_CLIENT_ID!;
const paypalSecret = process.env.PAYPAL_CLIENT_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  // Extract PayPal headers
  const transmissionId = req.headers["paypal-transmission-id"] as string;
  const transmissionTime = req.headers["paypal-transmission-time"] as string;
  const certUrl = req.headers["paypal-cert-url"] as string;
  const authAlgo = req.headers["paypal-auth-algo"] as string;
  const transmissionSig = req.headers["paypal-transmission-sig"] as string;

  // Get the body and parse it
  const body = JSON.stringify(req.body);

  // Verify the webhook signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookId)
    .update(
      transmissionId + "|" + transmissionTime + "|" + body + "|" + webhookId
    )
    .digest("hex");

  if (expectedSignature !== transmissionSig) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const { event_type, resource } = req.body;

  try {
    if (event_type === "PAYMENT.SALE.COMPLETED") {
      const { id, amount, custom } = resource;
      const { plan, credits, buyerId } = JSON.parse(custom);

      await connectToDatabase();

      // Create a new transaction
      const newTransaction = await Transaction.create({
        createdAt: new Date(),
        paypalId: id,
        amount: parseFloat(amount.total),
        plan,
        credits,
        buyer: buyerId,
      });

      // Update the user's credits
      await updateCredits(buyerId, credits);

      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ message: "Event type not handled" });
    }
  } catch (error) {
    handleError(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
