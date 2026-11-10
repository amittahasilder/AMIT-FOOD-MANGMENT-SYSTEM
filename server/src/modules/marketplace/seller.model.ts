
import mongoose, { Document, Schema } from "mongoose";

export type SellerStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export interface ISeller extends Document {
  user: mongoose.Types.ObjectId;
  shopName: string;
  description: string;
  phone: string;
  address: string;
  logoUrl: string;
  status: SellerStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sellerSchema = new Schema<ISeller>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    shopName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sellerSchema.index({ status: 1, createdAt: -1 });

const Seller = mongoose.model<ISeller>("Seller", sellerSchema);

export default Seller;
