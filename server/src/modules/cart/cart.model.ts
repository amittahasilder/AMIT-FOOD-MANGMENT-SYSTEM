
import mongoose, { Schema, models, model } from "mongoose";

export type CartItemType = "restaurant" | "marketplace";

export interface ICartItem {
  itemType: CartItemType;
  menuItem?: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// CART ITEM SCHEMA
// ==========================================

const cartItemSchema = new Schema<ICartItem>(
  {
    itemType: {
      type: String,
      enum: ["restaurant", "marketplace"],
      required: true,
    },

    menuItem: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
    },

    product: {
      type: Schema.Types.ObjectId,
      ref: "SellerProduct",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
  },
  { _id: true }
);

// ==========================================
// CART ITEM VALIDATION
// ==========================================

cartItemSchema.pre("validate", function () {
  if (this.itemType === "restaurant") {
    if (!this.menuItem || this.product) {
      this.invalidate(
        "menuItem",
        "Restaurant items must reference a menu item only"
      );
    }
  }

  if (this.itemType === "marketplace") {
    if (!this.product || this.menuItem) {
      this.invalidate(
        "product",
        "Marketplace items must reference a seller product only"
      );
    }
  }
});

// ==========================================
// CART SCHEMA
// ==========================================

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ==========================================
// EXPORT CART MODEL
// ==========================================

export const Cart =
  models.Cart || model<ICart>("Cart", cartSchema);
