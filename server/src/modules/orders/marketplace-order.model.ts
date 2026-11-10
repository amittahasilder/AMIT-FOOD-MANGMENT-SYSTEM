import mongoose, { Schema, models, model } from "mongoose";

const marketplaceOrderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "SellerProduct",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const marketplaceOrderSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    items: {
      type: [marketplaceOrderItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: "Order must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
    },

    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

marketplaceOrderSchema.index({
  customer: 1,
  createdAt: -1,
});

marketplaceOrderSchema.index({
  seller: 1,
  orderStatus: 1,
  createdAt: -1,
});

export const MarketplaceOrder =
  models.MarketplaceOrder ||
  model("MarketplaceOrder", marketplaceOrderSchema);