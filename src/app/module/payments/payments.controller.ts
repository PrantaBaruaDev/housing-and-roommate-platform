import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payments.service";
import { ICreatePaymentPayload } from "./payments.interface";
import { IRequestUser } from "../auth/auth.interface";

const getOwnUserPaymentsHistory = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as IRequestUser;
		const payments = await PaymentService.getOwnUserPaymentsHistory(user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment history retrieved successfully.",
			data: payments,
		});
	},
);

const getSinglePaymentsByID = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as IRequestUser;
		const { id } = req.params;
		const payment = await PaymentService.getSinglePaymentsByID(
			user.userId,
			id as string,
		);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment retrieved successfully.",
			data: payment,
		});
	},
);

const deletePayments = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as IRequestUser;
		const { id } = req.params;
		const payment = await PaymentService.deletePayment(user, id as string);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Payment deleted successfully.",
			data: payment,
		});
	},
);

const createBkashPayments = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const user = req.user as IRequestUser;
		const payload = req.body as ICreatePaymentPayload;

		const data = await PaymentService.createPaymentCheckoutWithBkash(
			user,
			payload,
		);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.CREATED,
			message: "Bkash checkout session created successfully.",
			data,
		});
	},
);

const handleBkashWebhook = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const { redirectUrl } = await PaymentService.paymentBkashCallback(
			req.query,
		);

		res.redirect(redirectUrl);
	},
);

export const PaymentsController = {
	getOwnUserPaymentsHistory,
	getSinglePaymentsByID,
	deletePayments,
	handleBkashWebhook,
	createBkashPayments,
};
