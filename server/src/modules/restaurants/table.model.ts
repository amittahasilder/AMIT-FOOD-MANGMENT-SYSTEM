
import { Schema, model, models } from "mongoose";

const tableSchema = new Schema(
  {
    // Which restaurant branch owns this table.
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    // Table identifier, e.g. T01, T02, VIP-01.
    tableNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 30,
    },

    // Maximum number of guests.
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 2,
    },

    // Dining area: Indoor, Outdoor, VIP, Rooftop.
    section: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "Main",
    },

    // Current table availability.
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "maintenance"],
      default: "available",
      required: true,
      index: true,
    },

    // Active order currently assigned to this table.
    currentOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // Track when the table became occupied.
    occupiedAt: {
      type: Date,
      default: null,
    },

    // Operational switch.
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// A table number must be unique within its branch.
tableSchema.index(
  { restaurant: 1, tableNumber: 1 },
  { unique: true }
);

// Efficient branch table dashboard.
tableSchema.index({
  restaurant: 1,
  status: 1,
  isActive: 1,
});

export const RestaurantTable =
  models.RestaurantTable ||
  model("RestaurantTable", tableSchema);
