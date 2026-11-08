
import mongoose, { Document, Schema } from "mongoose";

export type ProductStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived";

export interface IProductImage {
  url: string;
  altText: string;
}

export interface ISellerProduct extends Document {
  seller: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;

  name: string;
  description: string;

  price: number;
  discountPrice?: number;

  sku?: string;

  stockQuantity: number;
  lowStockThreshold: number;

  images: IProductImage[];

  status: ProductStatus;

  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    altText: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const sellerProductSchema = new Schema<ISellerProduct>(
  {
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },

    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    discountPrice: {
      type: Number,
      min: 0.01,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock quantity must be an integer",
      },
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Low stock threshold must be an integer",
      },
    },

    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (images: IProductImage[]) =>
          images.length <= 10,
        message: "Maximum 10 product images are allowed",
      },
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate SKU within the same seller.
// Products without SKU are excluded from this index.
sellerProductSchema.index(
  { seller: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sku: { $type: "string" },
    },
  }
);

// Seller dashboard queries
sellerProductSchema.index({
  seller: 1,
  status: 1,
  createdAt: -1,
});

// Public marketplace queries
sellerProductSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

// Text search
sellerProductSchema.index({
  name: "text",
  description: "text",
});

const SellerProduct = mongoose.model<ISellerProduct>(
  "SellerProduct",
  sellerProductSchema
);

export default SellerProduct;
