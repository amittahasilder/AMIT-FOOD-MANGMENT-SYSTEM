
import mongoose, { Document, Schema } from "mongoose";

export interface IProductCategory extends Document {
  seller: mongoose.Types.ObjectId;
  name: string;
  normalizedName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productCategorySchema = new Schema<IProductCategory>(
  {
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
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
      validate: {
        validator: Number.isInteger,
        message: "Sort order must be an integer",
      },
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

// Same seller cannot create duplicate category names.
productCategorySchema.index(
  { seller: 1, normalizedName: 1 },
  { unique: true }
);

// Seller category listing
productCategorySchema.index({
  seller: 1,
  isActive: 1,
  sortOrder: 1,
});

const ProductCategory = mongoose.model<IProductCategory>(
  "ProductCategory",
  productCategorySchema
);

export default ProductCategory;
