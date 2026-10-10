import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type z from "zod";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../errors/ApiError";

export const validateRequest = (
	zodSchema: z.ZodObject, 
	source: "body" | "query" | "params" = "body",
) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const payload = req.body ?? {};

		const result = zodSchema.safeParse(payload);

		if (!result.success) {
			console.log(result.error);
			console.log(result.error.issues);

			throw new ApiError(
				httpStatus.BAD_REQUEST,
				result.error.issues[0]?.message,
			);
		}

		if (source === "query") {
			Object.defineProperty(req, "query", {
				value: result.data,
				writable: true,
				configurable: true,
				enumerable: true,
			});
		} else {
			req[source] = result.data as any;
		}

		next();
	});
};
