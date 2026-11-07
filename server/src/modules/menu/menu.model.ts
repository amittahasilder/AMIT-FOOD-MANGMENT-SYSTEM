
// import { Schema, model, models } from "mongoose";

// const menuSchema = new Schema(
//   {
//     restaurant: {
//       type: Schema.Types.ObjectId,
//       ref: "Restaurant",
//       required: true,
//       index: true,
//     },

//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 120,
//     },

//     description: {
//       type: String,
//       trim: true,
//       maxlength: 2000,
//       default: "",
//     },

//     category: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 50,
//     },

//     price: {
//       type: Number,
//       required: true,
//       min: 0.01,
//     },

//     discountPrice: {
//       type: Number,
//       min: 0.01,
//       default: null,
//     },

//     imageUrl: {
//       type: String,
//       trim: true,
//       default: "",
//       maxlength: 1000,
//     },

//     isAvailable: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// );

// menuSchema.index({ restaurant: 1, category: 1 });
// menuSchema.index({ restaurant: 1, isAvailable: 1 });

// menuSchema.pre("validate", function () {
//   if (
//     this.discountPrice !== null &&
//     this.discountPrice !== undefined &&
//     this.discountPrice >= this.price
//   ) {
//     this.invalidate(
//       "discountPrice",
//       "Discount price must be lower than regular price"
//     );
//   }
// });

// export const Menu =
//   models.Menu || model("Menu", menuSchema);





import { Schema, model, models } from "mongoose";

const menuSchema = new Schema(
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
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    discountPrice: {
      type: Number,
      min: 0.01,
      default: null,
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    isAvailable: {
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

menuSchema.index({ restaurant: 1, category: 1 });
menuSchema.index({ restaurant: 1, isAvailable: 1 });

menuSchema.pre("validate", function () {
  if (
    this.discountPrice !== null &&
    this.discountPrice !== undefined &&
    this.discountPrice >= this.price
  ) {
    this.invalidate(
      "discountPrice",
      "Discount price must be lower than regular price"
    );
  }
});

export const Menu = models.Menu || model("Menu", menuSchema);
