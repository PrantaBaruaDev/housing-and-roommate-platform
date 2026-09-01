export class ApiError extends Error {
	public statusCode: number;

	constructor(statusCode: number, message: string | undefined, stack = "") {
		super(message);
		this.statusCode = statusCode;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this.constructor, this.constructor);
		}
	}
}
