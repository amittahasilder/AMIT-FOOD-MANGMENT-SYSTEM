
import { Schema, model, models } from "mongoose";

const restaurantSchema = new Schema(
  {
    // Branch / outlet name
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

    // Restaurant owner
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Parent business organization.
    // Optional for backward compatibility with existing restaurants.
    organization: {
      type: Schema.Types.ObjectId,
      ref: "RestaurantOrganization",
      default: null,
      index: true,
    },

    // Unique branch code within an organization.
    branchCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: null,
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
          items.every(
            (item) =>
              item.trim().length > 0 && item.length <= 50
          ),
        message: "Invalid cuisine types",
      },
    },

    // Admin approval status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
      index: true,
    },

    // Operational availability of this branch
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

restaurantSchema.index({ status: 1, createdAt: -1 });

restaurantSchema.index({
  organization: 1,
  branchCode: 1,
}, {
  unique: true,
  partialFilterExpression: {
    organization: { $type: "objectId" },
    branchCode: { $type: "string" },
  },
});

export const Restaurant =
  models.Restaurant || model("Restaurant", restaurantSchema);
