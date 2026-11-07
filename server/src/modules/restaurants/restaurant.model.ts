
import { Schema, model, models } from "mongoose";

const restaurantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },
    cuisineTypes: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 20 &&
          items.every((item) => item.trim().length > 0 && item.length <= 50),
        message: "Invalid cuisine types",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

restaurantSchema.index({ status: 1, createdAt: -1 });

export const Restaurant =
  models.Restaurant || model("Restaurant", restaurantSchema);
