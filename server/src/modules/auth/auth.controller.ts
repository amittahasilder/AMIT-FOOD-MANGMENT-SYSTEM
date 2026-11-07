
// import type { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import { User } from "../users/user.model";
// import {
//   createAuthToken,
//   getAuthCookieOptions,
//   getClearCookieOptions,
//   AUTH_COOKIE_NAME,
// } from "./auth.utils";
// import { loginSchema, registerSchema } from "./auth.validation";

// function publicUser(user: {
//   _id: unknown;
//   name: string;
//   email: string;
//   role: string;
//   isActive: boolean;
// }) {
//   return {
//     id: String(user._id),
//     name: user.name,
//     email: user.email,
//     role: user.role,
//     isActive: user.isActive,
//   };
// }

// function setAuthCookie(res: Response, userId: string, role: string) {
//   const token = createAuthToken(userId, role);
//   res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
// }

// export async function register(req: Request, res: Response) {
//   const parsed = registerSchema.safeParse(req.body);

//   if (!parsed.success) {
//     res.status(400).json({
//       success: false,
//       message: "Invalid registration data",
//       errors: parsed.error.issues.map((issue) => ({
//         field: issue.path.join("."),
//         message: issue.message,
//       })),
//     });
//     return;
//   }

//   try {
//     const { name, email, password } = parsed.data;

//     const existingUser = await User.findOne({ email }).lean();

//     if (existingUser) {
//       res.status(409).json({
//         success: false,
//         message: "An account with this email already exists",
//       });
//       return;
//     }

//     const passwordHash = await bcrypt.hash(password, 12);

//     const user = await User.create({
//       name,
//       email,
//       passwordHash,
//       role: "customer",
//     });

//     setAuthCookie(res, user._id.toString(), user.role);

//     res.status(201).json({
//       success: true,
//       message: "Account created successfully",
//       user: publicUser(user),
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
//         message: "An account with this email already exists",
//       });
//       return;
//     }

//     console.error("Registration error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to create account",
//     });
//   }
// }

// export async function login(req: Request, res: Response) {
//   const parsed = loginSchema.safeParse(req.body);

//   if (!parsed.success) {
//     res.status(400).json({
//       success: false,
//       message: "Invalid login data",
//     });
//     return;
//   }

//   try {
//     const { email, password } = parsed.data;

//     const user = await User.findOne({ email }).select("+passwordHash");

//     if (!user || !user.isActive) {
//       res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//       return;
//     }

//     const passwordMatches = await bcrypt.compare(
//       password,
//       user.passwordHash
//     );

//     if (!passwordMatches) {
//       res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//       return;
//     }

//     setAuthCookie(res, user._id.toString(), user.role);

//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       user: publicUser(user),
//     });
//   } catch (error: unknown) {
//     console.error("Login error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to log in",
//     });
//   }
// }

// export function logout(_req: Request, res: Response) {
//   res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());

//   res.status(200).json({
//     success: true,
//     message: "Logged out successfully",
//   });
// }

// export function me(_req: Request, res: Response) {
//   const user = res.locals.authUser;

//   if (!user) {
//     res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//     return;
//   }

//   res.status(200).json({
//     success: true,
//     user,
//   });
// }




import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { User } from "../users/user.model";

import {
  createAuthToken,
  getAuthCookieOptions,
  getClearCookieOptions,
  AUTH_COOKIE_NAME,
} from "./auth.utils";

import {
  loginSchema,
  registerSchema,
  registerOwnerSchema,
} from "./auth.validation";

// Public user response
function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

// Set authentication cookie
function setAuthCookie(res: Response, userId: string, role: string) {
  const token = createAuthToken(userId, role);

  res.cookie(
    AUTH_COOKIE_NAME,
    token,
    getAuthCookieOptions()
  );
}

// ========================================
// CUSTOMER REGISTRATION
// ========================================

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid registration data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { name, email, password } = parsed.data;

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "customer",
    });

    setAuthCookie(res, user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: "Customer account created successfully",
      user: publicUser(user),
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    console.error("Customer registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create customer account",
    });
  }
}

// ========================================
// RESTAURANT OWNER REGISTRATION
// ========================================

export async function registerOwner(req: Request, res: Response) {
  const parsed = registerOwnerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid owner registration data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { name, email, password } = parsed.data;

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "restaurant_owner",
      isActive: true,
    });

    setAuthCookie(res, user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message:
        "Restaurant owner account created successfully. Restaurant approval is required.",
      user: publicUser(user),
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    console.error("Owner registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create owner account",
    });
  }
}

// ========================================
// LOGIN
// ========================================

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid login data",
    });
    return;
  }

  try {
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    setAuthCookie(res, user._id.toString(), user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: publicUser(user),
    });
  } catch (error: unknown) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

// ========================================
// LOGOUT
// ========================================

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

// ========================================
// CURRENT USER
// ========================================

export function me(_req: Request, res: Response) {
  const user = res.locals.authUser;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  res.status(200).json({
    success: true,
    user,
  });
}
