export class ApiError extends Error {
    public statusCode: number;
    public code?: string;

    constructor(
        statusCode: number,
        message: string,
        code?: string,
        stack = ""
    ) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        if (code) {
            this.code = code;
        }

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}