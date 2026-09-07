import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { ApiError } from "../errors/ApiError";

export const globalErrorHandler = async (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (config.node_env === "development") {
        console.error("Error from Global Error Handler:", err);
    }

    let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = "INTERNAL_SERVER_ERROR";
    let errorName: string = "InternalServerError";
    let displayMessage: string = "Internal Server Error";
    let validationIssues: any[] = [];

    let isHandledError = false;

    // JWT Errors (Handled)
    if (err instanceof jwt.TokenExpiredError) {
        statusCode = httpStatus.UNAUTHORIZED;
        errorCode = "TOKEN_EXPIRED";
        displayMessage = "Unauthorized: Session expired, please log in again.";
        errorName = "TokenExpiredError";
        isHandledError = true;
    } else if (err instanceof jwt.JsonWebTokenError) {
        statusCode = httpStatus.UNAUTHORIZED;
        errorCode = "INVALID_TOKEN";
        displayMessage = "Unauthorized: Invalid or expired session please log in again.";
        errorName = "JsonWebTokenError";
        isHandledError = true;
    }

    // Custom ApiError
    else if (err instanceof ApiError) {
        statusCode = err.statusCode;
        displayMessage = err.message;
        errorCode = err.code || "API_ERROR";
        errorName = err.name || "ApiError";
        isHandledError = true;
    }
	else if (err instanceof Error) {
		statusCode = (err as any).statusCode || httpStatus.BAD_REQUEST; 
		displayMessage = err.message; 
		errorCode = (err as any).code || "BAD_REQUEST";
		errorName = err.name || "Error";
		isHandledError = true; 
	}
    // Zod Validation Errors
    else if (err instanceof ZodError) {
        statusCode = httpStatus.BAD_REQUEST;
        errorCode = "VALIDATION_ERROR";
        displayMessage = "Validation error: Invalid input data provided.";
        errorName = "ValidationError";
        validationIssues = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        isHandledError = true;
    }

    // Prisma Known Errors
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.BAD_REQUEST;
            errorCode = "DUPLICATE_ENTRY";
            const targetField = (err.meta?.target as string[])?.join(", ");
            displayMessage = targetField 
                ? `Duplicate value for field: ${targetField}` 
                : "Duplicate key error";
            errorName = "DuplicateEntryError";
            isHandledError = true;
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            errorCode = "RECORD_NOT_FOUND";
            displayMessage = "The requested record was not found.";
            errorName = "NotFoundError";
            isHandledError = true;
        }
    }

    // Production Sanitization
    if (config.node_env === "production" && !isHandledError) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        errorCode = "INTERNAL_SERVER_ERROR";
        errorName = "InternalServerError";
        displayMessage = "Internal Server Error";
    }

    // Dev Details Output
    const errorDetails = {
        name: config.node_env === "production" && !isHandledError ? "InternalServerError" : (err?.name || errorName),
        statusCode: statusCode,
        code: errorCode,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
        ...(validationIssues.length > 0 && { issues: validationIssues }),
        ...(config.node_env === "development" && {
			rawMessage: err?.message
				? err.message
					.replace(/\t/g, "    ")
					.split(/[\r\n]+/)
					.filter((line: string) => line.trim().length > 0) 
				: undefined,
			rawCode: err?.code,
			details: err?.details || err,
			stack: err?.stack
				? err.stack
					.replace(/\t/g, "    ")
					.split("\n").map((line: string) => line.trim())
				: undefined,
        }),
    };

    res.status(statusCode).json({
        success: false,
        message: displayMessage,
        error: errorDetails,
    });
};
