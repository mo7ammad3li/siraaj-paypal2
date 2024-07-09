"use client";

import { useToast } from "@/components/ui/use-toast";
import {
  FUNDING,
  PayPalButtons,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import { useState } from "react";
import { Button } from "../ui/button";

interface PromoCodes {
  [key: string]: string;
}

const Checkout = ({
  plan,
  amount,
  credits,
  buyerId,
}: {
  plan: string;
  amount: number;
  credits: number;
  buyerId: string;
}) => {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState(amount);
  const [isPromoCodeValid, setIsPromoCodeValid] = useState(true);

  const promoCodes: PromoCodes = {
    DISCOUNT25: "https://www.sandbox.paypal.com/ncp/payment/F6JZVGEAL5L6C",
    // Add more promo codes and corresponding checkout links here
  };

  const handlePromoCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPromoCode(e.target.value);
  };

  const applyPromoCode = () => {
    if (promoCodes[promoCode]) {
      setDiscountedAmount(amount * 0.75);
      setIsPromoCodeValid(true);
      toast({
        title: "Promo code applied!",
        description: "You received a 25% discount.",
        duration: 5000,
        className: "success-toast",
      });
    } else {
      setIsPromoCodeValid(false);
      toast({
        title: "Invalid promo code",
        description: "Please try a different code.",
        duration: 5000,
        className: "error-toast",
      });
    }
  };

  const handleApprove = async (data: any, actions: any) => {
    try {
      const order = await actions.order.capture();

      toast({
        title: "Payment successful",
        description: `You've purchased ${credits} credits.`,
        duration: 5000,
        className: "success-toast",
      });

      // Additional logic here...
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment failed",
        description:
          "There was an error processing your payment. Please try again.",
        duration: 5000,
        className: "error-toast",
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{plan}</h2>
        <p className="text-lg">Credits: {credits}</p>
        <p className="text-lg">Price: ${discountedAmount.toFixed(2)}</p>
        {plan !== "Free" && (
          <>
            <input
              type="text"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={handlePromoCodeChange}
              className={`border rounded p-2 ${
                isPromoCodeValid ? "" : "border-red-500"
              }`}
            />
            <Button
              onClick={applyPromoCode}
              className="w-full rounded bg-purple-600 text-white"
            >
              Apply Promo Code
            </Button>
            <PayPalScriptProvider
              options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
              }}
            >
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          currency_code: "USD",
                          value: amount.toString(),
                        },
                        custom_id: `${plan}|${credits}|${buyerId}`,
                      },
                    ],
                  });
                }}
                onApprove={handleApprove}
              />
            </PayPalScriptProvider>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
