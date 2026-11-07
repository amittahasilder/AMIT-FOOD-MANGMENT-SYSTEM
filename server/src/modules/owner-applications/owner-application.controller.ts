
// import type { Request, Response } from "express";
// import mongoose from "mongoose";
// import { OwnerApplication } from "./owner-application.model";
// import { User } from "../users/user.model";
// import { createOwnerApplicationSchema } from "./owner-application.validation";

// type AuthUser = {
//   id: string;
//   role: string;
//   isActive: boolean;
// };

// function getAuthUser(res: Response): AuthUser | undefined {
//   return res.locals.authUser as AuthUser | undefined;
// }

// export async function submitOwnerApplication(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   const parsed = createOwnerApplicationSchema.safeParse(req.body);

//   if (!parsed.success) {
//     res.status(400).json({
//       success: false,
//       message: "Invalid owner application data",
//       errors: parsed.error.issues.map((issue) => ({
//         field: issue.path.join("."),
//         message: issue.message,
//       })),
//     });
//     return;
//   }

//   const user = getAuthUser(res);

//   if (!user || !user.isActive) {
//     res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//     return;
//   }

//   if (user.role !== "customer") {
//     res.status(403).json({
//       success: false,
//       message: "Only customer accounts can apply for restaurant-owner access",
//     });
//     return;
//   }

//   try {
//     const existing = await OwnerApplication.findOne({
//       applicant: user.id,
//     }).lean();

//     if (existing) {
//       res.status(409).json({
//         success: false,
//         message: "An owner application already exists for this account",
//         application: existing,
//       });
//       return;
//     }

//     const application = await OwnerApplication.create({
//       ...parsed.data,
//       applicant: user.id,
//       status: "pending",
//     });

//     res.status(201).json({
//       success: true,
//       message: "Owner application submitted for review",
//       application,
//     });
//   } catch (error: unknown) {
//     if (
//       typeof error === "object" &&
//       error !== null &&
//       "code" in error &&
//       error.code === 11000
//     ) {
//       res.status(409).json({
//         success: false,
//         message: "An owner application already exists for this account",
//       });
//       return;
//     }

//     console.error("Submit owner application error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to submit owner application",
//     });
//   }
// }

// export async function getMyOwnerApplication(
//   _req: Request,
//   res: Response
// ): Promise<void> {
//   const user = getAuthUser(res);

//   if (!user || !user.isActive) {
//     res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//     return;
//   }

//   try {
//     const application = await OwnerApplication.findOne({
//       applicant: user.id,
//     })
//       .select("-__v")
//       .lean();

//     res.status(200).json({
//       success: true,
//       application: application ?? null,
//     });
//   } catch (error: unknown) {
//     console.error("Get owner application error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to fetch owner application",
//     });
//   }
// }


import type { Request, Response } from "express";
import mongoose from "mongoose";
import { OwnerApplication } from "./owner-application.model";
import { User } from "../users/user.model";
import {
  createOwnerApplicationSchema,
  reviewOwnerApplicationSchema,
} from "./owner-application.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

function getAuthUser(res: Response): AuthUser | undefined {
  return res.locals.authUser as AuthUser | undefined;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function submitOwnerApplication(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = createOwnerApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid owner application data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const user = getAuthUser(res);

  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (user.role !== "customer") {
    res.status(403).json({
      success: false,
      message: "Only customer accounts can apply for restaurant-owner access",
    });
    return;
  }

  try {
    const existing = await OwnerApplication.findOne({
      applicant: user.id,
    })
      .select("_id status")
      .lean();

    if (existing) {
      res.status(409).json({
        success: false,
        message: "An owner application already exists for this account",
        application: existing,
      });
      return;
    }

    const application = await OwnerApplication.create({
      ...parsed.data,
      applicant: user.id,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Owner application submitted for review",
      application,
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message: "An owner application already exists for this account",
      });
      return;
    }

    console.error("Submit owner application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit owner application",
    });
  }
}

export async function getMyOwnerApplication(
  _req: Request,
  res: Response
): Promise<void> {
  const user = getAuthUser(res);

  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const application = await OwnerApplication.findOne({
      applicant: user.id,
    })
      .select("-__v")
      .lean();

    res.status(200).json({
      success: true,
      application: application ?? null,
    });
  } catch (error: unknown) {
    console.error("Get owner application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch your owner application",
    });
  }
}

export async function listPendingOwnerApplications(
  _req: Request,
  res: Response
): Promise<void> {
  const user = getAuthUser(res);

  if (!user || !user.isActive || user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  try {
    const applications = await OwnerApplication.find({
      status: "pending",
    })
      .select("-__v")
      .populate("applicant", "name email")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error: unknown) {
    console.error("List pending owner applications error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch pending applications",
    });
  }
}

export async function reviewOwnerApplication(
  req: Request,
  res: Response
): Promise<void> {
  const admin = getAuthUser(res);

  if (!admin || !admin.isActive || admin.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid application ID",
    });
    return;
  }

  const parsed = reviewOwnerApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid review data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const application = await OwnerApplication.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "pending",
        },
        {
          $set: {
            status: parsed.data.decision,
            reviewedBy: admin.id,
            reviewedAt: new Date(),
            rejectionReason:
              parsed.data.decision === "rejected"
                ? parsed.data.rejectionReason
                : "",
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!application) {
        throw new Error("APPLICATION_NOT_PENDING");
      }

      if (parsed.data.decision === "approved") {
        const owner = await User.findOneAndUpdate(
          {
            _id: application.applicant,
            role: "customer",
            isActive: true,
          },
          {
            $set: {
              role: "restaurant_owner",
            },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );

        if (!owner) {
          throw new Error("APPLICANT_NOT_ELIGIBLE");
        }
      }

      return {
        application: application.toObject(),
        decision: parsed.data.decision,
      };
    });

    if (!result) {
      res.status(500).json({
        success: false,
        message: "Review transaction did not complete",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        result.decision === "approved"
          ? "Application approved; restaurant-owner role granted"
          : "Application rejected",
      application: result.application,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "APPLICATION_NOT_PENDING"
    ) {
      res.status(409).json({
        success: false,
        message: "Application not found or already reviewed",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "APPLICANT_NOT_ELIGIBLE"
    ) {
      res.status(409).json({
        success: false,
        message:
          "Applicant is not an active customer; no changes were committed",
      });
      return;
    }

    console.error("Review owner application error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to review owner application",
    });
  } finally {
    await session.endSession();
  }
}
