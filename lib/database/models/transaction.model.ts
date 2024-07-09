import { Schema, model, models } from "mongoose";

const TransactionSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  plan: {
    type: String,
  },
  credits: {
    type: Number,
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  promoCode: {
    type: String,
  },
});

const Transaction = models?.Transaction || model("Transaction", TransactionSchema);

export default Transaction;
