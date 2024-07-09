import { createTransaction } from "@/lib/actions/transaction.action";
import { updateCredits } from "@/lib/actions/user.actions";
import { connectToDatabase } from "@/lib/database/mongoose";
import crypto from "crypto";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const paypalSignature = headersList.get("paypal-transmission-sig");
    const paypalCertUrl = headersList.get("paypal-cert-url");
    const paypalTransmissionId = headersList.get("paypal-transmission-id");
    const paypalTransmissionTime = headersList.get("paypal-transmission-time");

    if (!webhookId) {
      return NextResponse.json(
        {
          error: "Server configuration error: PAYPAL_WEBHOOK_ID is not defined",
        },
        { status: 500 }
      );
    }

    const body = await req.text();

    // Verify the PayPal signature
    const verifiedSignature = crypto
      .createHmac("sha256", webhookId)
      .update(
        paypalTransmissionId +
        "|" +
        paypalTransmissionTime +
        "|" +
        body +
        "|" +
        webhookId
      )
      .digest("base64");

    // Uncomment the following lines for debugging
    // console.log("Verified signature:", verifiedSignature);
    // console.log("Received signature:", paypalSignature);

    // if (verifiedSignature !== paypalSignature) {
    //   console.log("Invalid signature");
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    // }

    const event = JSON.parse(body);

    if (
      event.event_type === "CHECKOUT.ORDER.APPROVED" ||
      event.event_type === "PAYMENT.CAPTURE.COMPLETED"
    ) {
      await connectToDatabase();
      const order = event.resource;
      let customId, plan, credits, buyerId, orderAmount;

      if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
        customId = order.purchase_units[0]?.custom_id || order.purchase_units[0]?.reference_id;
        orderAmount = order.purchase_units[0]?.amount.value;
      }
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        customId = order.custom_id || order.reference_id;
        orderAmount = order.amount.value;
      }

      // Log the customId for debugging
      console.log("customId:", customId);

      if (!customId) {
        console.log("Custom ID is undefined");
        return NextResponse.json(
          { error: "Custom ID is undefined" },
          { status: 400 }
        );
      }

      [plan, credits, buyerId] = customId.split("|");

      // Check if the customId is in the expected format
      if (!plan || !credits || !buyerId) {
        console.log("Custom ID is not in the expected format");
        return NextResponse.json(
          { error: "Custom ID is not in the expected format" },
          { status: 400 }
        );
      }

      // Log the extracted values for debugging
      console.log("plan:", plan);
      console.log("credits:", credits);
      console.log("buyerId:", buyerId);
      console.log("orderAmount:", orderAmount);

      // Start a database transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create transaction
        const transaction = await createTransaction(
          {
            transactionId: order.id,
            plan,
            amount: parseFloat(orderAmount),
            credits: parseInt(credits),
            buyerId,
          },
          session
        );

        // Update user credits
        const updatedUser = await updateCredits(
          buyerId,
          parseInt(credits),
          session
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        console.log("Transaction created:", transaction);
        console.log("Credits updated:", updatedUser);

        return NextResponse.json(
          { message: "Webhook processed successfully" },
          { status: 200 }
        );
      } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    }

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PayPal webhook error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
