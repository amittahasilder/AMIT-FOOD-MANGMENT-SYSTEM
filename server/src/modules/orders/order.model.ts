
import { Schema, model, models } from "mongoose";

const orderItemSchema = new Schema(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
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

const orderSchema = new Schema(
  {
    // Customer can be null for walk-in POS orders.
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Restaurant or branch receiving the order.
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // Order origin.
    source: {
      type: String,
      enum: ["online", "pos", "marketplace"],
      default: "online",
      required: true,
      index: true,
    },

    // Service type.
    orderType: {
      type: String,
      enum: ["delivery", "pickup", "dine_in"],
      default: "delivery",
      required: true,
      index: true,
    },

    // Table number for dine-in orders.
    tableNumber: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },

    // Staff or admin who created the order.
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    items: {
      type: [orderItemSchema],
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
      trim: true,
      maxlength: 500,
      default: "",
    },

    customerName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    customerPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
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
      index: true,
    },

    // Overall order lifecycle.
    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "picked_up",
        "delivered",
        "served",
        "cancelled",
      ],
      default: "placed",
      index: true,
    },

    // Kitchen-specific lifecycle.
    kitchenStatus: {
      type: String,
      enum: [
        "queued",
        "accepted",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "queued",
      index: true,
    },

    kitchenAcceptedAt: {
      type: Date,
      default: null,
    },

    kitchenStartedAt: {
      type: Date,
      default: null,
    },

    kitchenReadyAt: {
      type: Date,
      default: null,
    },

    servedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Customer order history.
orderSchema.index({ customer: 1, createdAt: -1 });

// Restaurant order dashboard.
orderSchema.index({ restaurant: 1, orderStatus: 1, createdAt: -1 });

// POS order filtering.
orderSchema.index({ restaurant: 1, source: 1, createdAt: -1 });

// Kitchen display queue.
orderSchema.index({ restaurant: 1, kitchenStatus: 1, createdAt: 1 });

// Order type filtering.
orderSchema.index({ restaurant: 1, orderType: 1, createdAt: -1 });

export const Order = models.Order || model("Order", orderSchema);
