import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { ApiError } from "../errors/ApiError";

export interface IErrorSource {
    path: string | number;
    message: string;
}

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
    let mainMessage: string = "Something went wrong";
    let errorSources: IErrorSource[] = [];
    let isHandledError = false;

    const isTokenExpired =
        err instanceof jwt.TokenExpiredError ||
        err?.name === "TokenExpiredError" ||
        err?.message?.includes("jwt expired");

    const isJsonWebTokenError =
        err instanceof jwt.JsonWebTokenError ||
        err?.name === "JsonWebTokenError" ||
        err?.message?.includes("jwt malformed") ||
        err?.message?.includes("invalid token") ||
        err?.message?.includes("invalid signature");

    if (isTokenExpired) {
        statusCode = httpStatus.UNAUTHORIZED;
        mainMessage = "Unauthorized: Session expired, please log in again.";
        errorSources = [
            {
                path: "authorization",
                message: "Token has expired.",
            },
        ];
        isHandledError = true;
    } else if (isJsonWebTokenError) {
        statusCode = httpStatus.UNAUTHORIZED;
        mainMessage = "Unauthorized: Invalid or expired session, please log in again.";
        errorSources = [
            {
                path: "authorization",
                message: "Invalid or malformed authorization token.",
            },
        ];
        isHandledError = true;
    }

    else if (err instanceof ApiError) {
        statusCode = err.statusCode;
        mainMessage = err.message;
        errorSources = [
            {
                path: req.originalUrl,
                message: err.message,
            },
        ];
        isHandledError = true;
    }

    else if (err instanceof ZodError) {
        statusCode = httpStatus.BAD_REQUEST;
        mainMessage = "Validation error: Invalid input data provided.";
        errorSources = err.issues.map((issue) => ({
            path: issue.path.map(String).join(".") || req.originalUrl,
            message: issue.message,
        }));
        isHandledError = true;
    }

    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.BAD_REQUEST;
            const targetField = (err.meta?.target as string[])?.join(", ") || "";
            mainMessage = targetField
                ? `Duplicate value for field: ${targetField}`
                : "Duplicate key error";
            errorSources = [
                {
                    path: targetField || req.originalUrl,
                    message: mainMessage,
                },
            ];
            isHandledError = true;
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            mainMessage = "The requested record was not found.";
            errorSources = [
                {
                    path: req.originalUrl,
                    message: mainMessage,
                },
            ];
            isHandledError = true;
        }
    }

    else if (err instanceof Error) {
        statusCode = (err as any).statusCode || httpStatus.BAD_REQUEST;
        mainMessage = err.message;
        errorSources = [
            {
                path: req.originalUrl,
                message: err.message,
            },
        ];
        isHandledError = true;
    }

    if (config.node_env === "production" && !isHandledError) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        mainMessage = "Something went wrong";
        errorSources = [];
    }

    const devDetails =
        config.node_env === "development"
            ? {
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
                        .split("\n")
                        .map((line: string) => line.trim())
                    : undefined,
            }
            : undefined;

    res.status(statusCode).json({
        success: false,
        message: mainMessage,
        errors: errorSources,
        ...(devDetails && { devDetails }),
    });
};