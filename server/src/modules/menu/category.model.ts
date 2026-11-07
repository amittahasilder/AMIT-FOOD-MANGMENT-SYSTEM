import { Schema, model, models } from "mongoose";

const categorySchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

categorySchema.index(
  { restaurant: 1, normalizedName: 1 },
  { unique: true }
);

categorySchema.index({ restaurant: 1, sortOrder: 1 });

export const Category =
  models.Category || model("Category", categorySchema);