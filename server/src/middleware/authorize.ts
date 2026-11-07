
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../modules/users/user.model";

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const user = res.locals.authUser as
      | { id: string; role: UserRole; isActive: boolean }
      | undefined;

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
}
