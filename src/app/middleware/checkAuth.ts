import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { Role, UserStatus } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import { ApiError } from "../errors/ApiError";
import httpStatus from 'http-status';

export interface JwtUserPayload {
  email: string;
  name: string;
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface User extends JwtUserPayload {}

    interface Request {
      user?: User;
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				"Unauthorized: Missing or invalid Bearer token"
			);
		}

		const token = authHeader.split(" ")[1];

		if (!token) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success || !verifiedToken.data) {
			if(config.node_env === "development") {
				throw new ApiError(undefined, verifiedToken.error);
			} else {
				throw new ApiError(
					httpStatus.UNAUTHORIZED,
					"Unauthorized: Invalided or expired session please log in again."
				);
			}
		}

		const { email, name, userId, role } = verifiedToken.data as JwtPayload;

		if (requiredRoles.length && !requiredRoles.includes(role)) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				"Forbidden: You do not have permission to access this resource"
			);
		}

		const user = await prisma.users.findUnique({
			where: {
				id: userId,
				email,
				name,
				role,
			},
		});
		if (!user) {
			throw new ApiError(
				httpStatus.UNAUTHORIZED,
				"Unauthorized: User account no longer exists"
			);
		}

		if (user.status === UserStatus.BLOCKED || user.isDeleted) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				"Forbidden: Your account is blocked or inactive"
			);
		}

		req.user = {
			email: user.email,
			name: user.name,
			userId: user.id,
			role: user.role,
		};

		next();
	});
};
