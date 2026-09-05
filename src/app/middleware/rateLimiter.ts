import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 10, 
    standardHeaders: "draft-7", 
    legacyHeaders: false, 
    message: {
        success: false,
        statusCode: 429,
        message: "Too many login/auth attempts from this IP, please try again after 15 minutes.",
    },
});

export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 100, 
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: "Too many requests from this IP, please slow down.",
    },
});