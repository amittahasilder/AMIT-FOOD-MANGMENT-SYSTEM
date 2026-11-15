
import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["sslcommerz"],
      default: "sslcommerz",
      required: true,
    },

    tranId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    sessionKey: {
      type: String,
      default: null,
      select: false,
    },

    amount: {
      type: Number,
      required: true,
      min: 10,
    },

    currency: {
      type: String,
      default: "BDT",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "initiated",
        "pending",
        "success",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "initiated",
      index: true,
    },

    bankTranId: {
      type: String,
      default: null,
    },

    validationId: {
      type: String,
      default: null,
    },

    cardType: {
      type: String,
      default: null,
    },

    riskLevel: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ order: 1, createdAt: -1 });

export const Payment = model("Payment", paymentSchema);
