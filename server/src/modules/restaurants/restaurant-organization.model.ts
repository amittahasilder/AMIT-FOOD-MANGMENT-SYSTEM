
import { Schema, model, models } from "mongoose";

const restaurantOrganizationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    ownershipType: {
      type: String,
      enum: ["platform", "partner"],
      required: true,
      default: "partner",
      index: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

restaurantOrganizationSchema.index({
  ownershipType: 1,
  status: 1,
  createdAt: -1,
});

export const RestaurantOrganization =
  models.RestaurantOrganization ||
  model("RestaurantOrganization", restaurantOrganizationSchema);
