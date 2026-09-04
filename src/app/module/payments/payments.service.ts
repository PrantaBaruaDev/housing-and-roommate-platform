import { Prisma } from "../../../generated/prisma/client";
import { ApplicationStatus, PaymentProvider, PaymentStatus, Role } from "../../../generated/prisma/enums";
import { ApplicationModel } from "../../../generated/prisma/models";
import config from "../../config";
import { ApiError } from "../../errors/ApiError";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { IRequestUser } from "../auth/auth.interface";
import { ICreatePaymentPayload } from "./payments.interface";
import httpStatus from 'http-status';

const createPaymentCheckoutWithBkash = async (
	user: IRequestUser,
	payload: ICreatePaymentPayload,
) => {
	const tenantApplication = await PaymentUtils.verifyApplicationAccess(
		user,
		payload.applicationId,
	);

	if(tenantApplication.status !== ApplicationStatus.APPROVED) {
		throw new ApiError(httpStatus.FORBIDDEN, "Forbidden, Payment rejected the application is not approved by owner")
	}

	const amount = Number(tenantApplication.agreedRentAmount);

	const userFetch = await prisma.users.findFirstOrThrow({
		where: { id: tenantApplication.tenantId },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
		}
	});

	const existingPayment = await prisma.payments.findFirst({
		where: { applicationId: tenantApplication.id },
	});

	if (existingPayment?.status === PaymentStatus.COMPLETED) {
		return {
			payment: existingPayment,
			checkoutUrl: null,
			message: "Payment already completed.",
		};
	}

	const bkashPayload = {
		applicationId: tenantApplication.id,
		payAmount: amount,
		payerReference: userFetch.email,
	};
	const bkashPaymentCreate = await PaymentUtils.paymentBkashGearRent(bkashPayload);

	if (bkashPaymentCreate?.statusCode !== "0000") {
		throw new ApiError(
			httpStatus.BAD_GATEWAY,
			`bKash Error: ${bkashPaymentCreate?.statusMessage || "Failed to create payment session"}`,
		);
	}

	const payment = await prisma.payments.upsert({
		where: { applicationId: tenantApplication.id },
		update: {
			tenantId: user.userId,
			amount: new Prisma.Decimal(amount),
			status: PaymentStatus.PENDING,
			gatewayPaymentId: bkashPaymentCreate.paymentID,
			payerReference: user.email,
			paymentProvider: PaymentProvider.BKASH,
			gatewayResponse: bkashPaymentCreate,
		},
		create: {
			tenantId: user.userId,
			applicationId: tenantApplication.id,
			amount: new Prisma.Decimal(amount),
			status: PaymentStatus.PENDING,
			gatewayPaymentId: bkashPaymentCreate.paymentID,
			payerReference: user.email,
			paymentProvider: PaymentProvider.BKASH,
			gatewayResponse: bkashPaymentCreate,
		},
	});

	return {
		paymentUrl: bkashPaymentCreate.bkashURL,
		paymentCreate: payment,
		message: "bKash payment link generated successfully.",
	};
}

const paymentBkashCallback = async(query: Record<string, any>) => {
	const paymentId = query.paymentID;

	if (!paymentId) {
		throw new Error("Payment Id Missing");
	}
console.log(query, "check the query...")
	const status = query.status;

	if (!status) {
		throw new Error("Payment Status is Missing");
	}

	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new Error("No Bkash Access Token Found!");
	}

	if (status === "failure") {
		await prisma.payments.updateMany({
			where: {
				gatewayPaymentId: paymentId,
			},
			data: {
				status: PaymentStatus.FAILED,
			},
		});

		return {
			redirectUrl: `${config.frontend_url}/payment/cancel?status=failed`,
		};
	}
	if (status === "cancel") {
		await prisma.payments.updateMany({
			where: {
				gatewayPaymentId: paymentId,
			},
			data: {
				status: PaymentStatus.CANCEL,
			},
		});

		return {
			redirectUrl: `${config.frontend_url}/payment/cancel?status=cancel`,
		};
	}

	if (status === "success") {
		const executedPaymentResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/execute`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash_app_key,
				},

				body: JSON.stringify({
					paymentID: paymentId,
				}),
			},
		);

		const executedPaymentResult = await executedPaymentResponse.json();

		// Check if bKash returned an internal business logic error
		if (executedPaymentResult?.statusCode !== "0000") {
			await prisma.payments.updateMany({
				where: { gatewayPaymentId: paymentId },
				data: {
					status: PaymentStatus.FAILED,
					gatewayResponse: executedPaymentResult,
				},
			});

			return {
				executedPaymentResult,
				redirectUrl: `${config.frontend_url}/payment/cancel?status=failed&message=${encodeURIComponent(executedPaymentResult?.statusMessage || "Execution failed")}`,
			};
		}

		let bkashPaidDate = new Date();
		if (executedPaymentResult?.paymentExecuteTime) {
			const formatted = executedPaymentResult.paymentExecuteTime
				.replace(/:(\d{3})\sGMT/, ".$1")
				.replace(/\sGMT/, "");

			const parsedDate = new Date(formatted);
			if (!isNaN(parsedDate.getTime())) {
				bkashPaidDate = parsedDate;
			}
		}

		await prisma.payments.update({
			where: {
				applicationId: executedPaymentResult.merchantInvoiceNumber,
				gatewayPaymentId: paymentId,
			},
			data: {
				status: PaymentStatus.COMPLETED,
				gatewayTransactionId: executedPaymentResult.trxID,
				paidAt: bkashPaidDate,
				gatewayResponse: executedPaymentResult,
			},
		});

		return {
			executedPaymentResult,
			redirectUrl: `${config.frontend_url}/payment/success?status=success&trxID=${executedPaymentResult.trxID}`,
		};
	}

	return {
		redirectUrl: `${config.frontend_url}/payment/cancel?error=payment-failed`,
	};
}

export const PaymentService = {
	createPaymentCheckoutWithBkash,
	paymentBkashCallback,
}


export const PaymentUtils = {
	verifyApplicationAccess: async (
		user: IRequestUser,
		applicationId: ApplicationModel["id"],
	) => {
		const application = await prisma.application.findUnique({
			where: { id: applicationId },
		});

		if (!application)
			throw new ApiError(httpStatus.NOT_FOUND, "Application not found.");

		if (
			user.role === Role.ADMIN ||
			(user.role === Role.TENANT && application.tenantId === user.userId)
		) {
			return application;
		}

		if (user.role === Role.OWNER) {
			const hasOwnership = await prisma.application.findFirst({
				where: {
					id: applicationId,
					room: {
						property: {
							ownerId: user.userId
						},
					},
				},
			});
			if (hasOwnership) return application;
		}

		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Forbidden: Access denied for this order resource.",
		);
	},


	paymentBkashGearRent: async(payload: Record<string, any>) => {
		const { applicationId, payAmount, payerReference } = payload;

		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new Error("No Bkash Access Token Found!");
		}

		const bkashCreatePaymentResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					Authorization: bkashIdToken,
					"X-App-Key": config.bkash_app_key,
				},
				body: JSON.stringify({
					mode: "0011",
					payerReference: payerReference,
					callbackURL: `${config.bkash_callback_url}/payments/applications/payment/callback`,
					amount: payAmount,
					currency: "BDT",
					intent: "sale",
					merchantInvoiceNumber: applicationId,
				}),
			},
		);

		console.log(bkashCreatePaymentResponse, "bkash payment response")

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

console.log(bkashCreatePaymentResult, "bkash payment result")
		return bkashCreatePaymentResult;
	}
}