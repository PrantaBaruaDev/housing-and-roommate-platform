import { Prisma } from "../../../generated/prisma/client";
import {
	ApplicationStatus,
	BillStatus,
	PaymentProvider,
	PaymentStatus,
	Role,
} from "../../../generated/prisma/enums";
import { ApplicationModel } from "../../../generated/prisma/models";
import config from "../../config";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { parseExecuteTime } from "../../utils/dateTimePurser";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { tenantSelect } from "../../utils/userSelectionUtils";
import { IRequestUser } from "../auth/auth.interface";
import { ICreatePaymentPayload } from "./payments.interface";
import httpStatus from "http-status";

const getOwnUserPaymentsHistory = async (query: IQuery, user: IRequestUser) => {
	const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);
	
	const andConditions: Prisma.PaymentsWhereInput[] = [];
	const searchableFields = ["applicationId", "invoiceId", "gatewayPaymentId", "gatewayTransactionId"];

	if (user.role === Role.OWNER) {
        andConditions.push({
            OR: [
                {
                    application: {
                        room: {
                            property: {
                                ownerId: user.userId,
                            },
                        },
                    },
                },
                {
                    invoice: {
                        property: {
                            ownerId: user.userId,
                        },
                    },
                },
            ],
        });
    } else if (user.role === Role.TENANT) {
        andConditions.push({
            tenantId: user.userId,
        });
    }


	if (searchTerm) {
		andConditions.push({
			OR: searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: "insensitive",
				},
			})),
		});
	}

	if (filterData && Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: filterData[key],
            })),
        });
    }

	const whereConditions: Prisma.PaymentsWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

	const [rawPayments, total] = await prisma.$transaction([
		prisma.payments.findMany({
            where: whereConditions,
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                application: {
                    select: {
                        id: true,
                        room: {
                            select: {
                                id: true,
                                roomNumber: true,
                                property: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
                invoice: {
                    select: {
                        id: true,
                        billMonth: true,
                        totalAmount: true,
                    },
                },
            },
        }),
        prisma.payments.count({
            where: whereConditions,
        }),
	]);

	const sanitizedPayments = rawPayments.map((payment) => {
        if (user.role !== Role.ADMIN) {
            const { gatewayResponse, ...rest } = payment as any;
            return rest;
        }
        return payment;
    });

	const totalPage = Math.ceil(total / limit);

	return {
		data: sanitizedPayments,
        meta: {
            page,
            limit,
            total,
            totalPage,
        },
    };
}

const getSinglePaymentsByID = async (
	userId: string,
	paymentId?: string,
) => {
	if (!paymentId) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Either paymentId must be provided."
		);
	}

	const whereCondition: Prisma.PaymentsWhereInput = { id: paymentId }

	const payment = await prisma.payments.findFirst({
		where: whereCondition,
		include: {
			application: {
				include: {
					room: {
						include: {
							property: {
								omit: {
									description: true,
									isDeleted: true,
									deletedAt: true,
								}
							}
						},
						omit: {
							isDeleted: true,
							deletedAt: true,
						}
					},
				},
			},
		},
		omit: {
			gatewayResponse: true,
		}
	});

	if (!payment) {
		throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found.");
	}

	const isTenant = payment.tenantId === userId;
	const isOwner = payment.application?.room?.property?.ownerId === userId;

	if (!isTenant && !isOwner) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Forbidden: You do not have permission to access this payment record."
		);
	}

	return payment;
};


const createPaymentCheckoutWithBkash = async (
	user: IRequestUser,
	payload: ICreatePaymentPayload,
) => {
	let amount = 0;
    let applicationId: string | undefined = payload.applicationId;
    let invoiceId: string | undefined = payload.invoiceId;

	if (!invoiceId && !applicationId) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Either applicationId or invoiceId must be provided.",
        );
    }

	if (invoiceId) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) {
            throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found.");
        }

        if (invoice.status === BillStatus.PAID) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invoice is already paid.");
        }

        if (user.role === Role.TENANT && invoice.tenantId !== user.userId) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own this invoice.");
        }

		const existingCompleted = await prisma.payments.findFirst({
            where: { invoiceId, status: PaymentStatus.COMPLETED },
        });

        if (existingCompleted) {
            return {
                payment: existingCompleted,
                checkoutUrl: null,
                message: "Invoice payment is already completed.",
            };
        }

        amount = Number(invoice.totalAmount);
        applicationId = undefined;
    }

	else if (applicationId) {
		const tenantApplication = await PaymentUtils.verifyApplicationAccess(
			user,
			applicationId,
		);

		if (tenantApplication.status !== ApplicationStatus.APPROVED) {
			throw new ApiError(
				httpStatus.FORBIDDEN,
				"Forbidden, Payment rejected the application is not approved by owner",
			);
		}

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

		amount = Number(tenantApplication.agreedRentAmount);
	}

	const merchantInvoiceNo = invoiceId ? invoiceId : applicationId;

	const bkashPayload = {
		applicationId: merchantInvoiceNo,
		payAmount: amount,
		payerReference: user.email,
	};

	const bkashPaymentCreate = await PaymentUtils.paymentBkashHomeRent(bkashPayload);

	if (bkashPaymentCreate?.statusCode !== "0000") {
		throw new ApiError(
			httpStatus.BAD_GATEWAY,
			`bKash Error: ${bkashPaymentCreate?.statusMessage || "Failed to create payment session"}`,
		);
	}

	const existingPayment = await prisma.payments.findFirst({
        where: invoiceId ? { invoiceId } : { applicationId },
    });

	const payment = await prisma.payments.upsert({
		where: { id: existingPayment?.id || ""},
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
			applicationId: applicationId || null,
			invoiceId: invoiceId || null,
			amount: new Prisma.Decimal(amount),
			status: PaymentStatus.PENDING,
			gatewayPaymentId: bkashPaymentCreate.paymentID,
			payerReference: user.email,
			paymentProvider: PaymentProvider.BKASH,
			gatewayResponse: bkashPaymentCreate,
		}
	});

	if (user.role !== Role.ADMIN && payment.gatewayResponse) {
        delete (payment as Record<string, any>).gatewayResponse;
    }

	return {
		paymentUrl: bkashPaymentCreate.bkashURL,
		payment,
		message: "bKash payment link generated successfully.",
	};
};

export const deletePayment = async (user: IRequestUser, id: string) => {
	const payment = await PaymentUtils.getPayment(id);
	await PaymentUtils.verifyApplicationAccess(user, payment.applicationId!);
	return prisma.payments.delete({ where: { id } });
}

export const paymentBkashCallback = async (query: Record<string, any>) => {
	const paymentId = query.paymentID;
	const status = query.status;

	if (!paymentId) throw new ApiError(httpStatus.BAD_REQUEST, "Payment Id Missing");
	if (!status) throw new ApiError(httpStatus.NOT_FOUND, "Payment Status is Missing");

	if (status === "failure" || status === "cancel") {
        const mappedStatus = status === "failure" ? PaymentStatus.FAILED : PaymentStatus.CANCEL;
        await prisma.payments.updateMany({
            where: { gatewayPaymentId: paymentId },
            data: { status: mappedStatus },
        });
        return {
            redirectUrl: `${config.frontend_url}/payment/cancel?status=${status}`,
        };
    }

	if (status !== "success") {
		return {
			redirectUrl: `${config.frontend_url}/payment/cancel?error=payment-failed`,
		};
	}

	const bkashIdToken = await getBkashIdToken();
	if (!bkashIdToken) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "No Bkash Access Token Found!");

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
			body: JSON.stringify({ paymentID: paymentId }),
		}
	);

	if (!executedPaymentResponse.ok) {
		throw new ApiError(httpStatus.BAD_GATEWAY, "Failed to execute payment with bKash API.");
	}

	const executedPaymentResult = await executedPaymentResponse.json();

	return await prisma.$transaction(async (tx) => {
		const existingPayment = await tx.payments.findFirst({
            where: { gatewayPaymentId: paymentId },
            include: {
                application: { include: { room: true } },
                invoice: true,
            },
        });

		if (!existingPayment) throw new ApiError(httpStatus.NOT_FOUND, `Payment with gateway ID ${paymentId} not found.`);

		if (existingPayment.status === PaymentStatus.COMPLETED) {
            return {
                executedPaymentResult,
                updatedPayment: existingPayment,
                redirectUrl: `${config.frontend_url}/payment/success?status=success&trxID=${existingPayment.gatewayTransactionId}`,
            };
        }

		if (executedPaymentResult?.statusCode !== "0000") {
            await tx.payments.update({
                where: { id: existingPayment.id },
                data: {
                    status: PaymentStatus.FAILED,
                    gatewayResponse: executedPaymentResult as Prisma.JsonObject,
                },
            });

            return {
                executedPaymentResult,
                redirectUrl: `${config.frontend_url}/payment/cancel?status=failed&message=${encodeURIComponent(
                    executedPaymentResult?.statusMessage || "Execution failed"
                )}`,
            };
        }

		let bkashPaidDate = parseExecuteTime(executedPaymentResult.paymentExecuteTime);

		const updatedPayment = await tx.payments.update({
			where: { id: existingPayment.id },
			data: {
				status: PaymentStatus.COMPLETED,
				gatewayTransactionId: executedPaymentResult.trxID,
				paidAt: bkashPaidDate,
				gatewayResponse: executedPaymentResult as Prisma.JsonObject,
			},
			include: {
				roomOccupant: true,
			}
		});

		if (existingPayment.invoiceId) {
			await tx.invoice.update({
				where: { id: existingPayment.invoiceId },
				data: {
					status: BillStatus.PAID,
				},
			});
		}
		else if (existingPayment.applicationId && existingPayment.application) {
			const application = existingPayment.application;
			const room = application?.room;

			if (!room) throw new ApiError(httpStatus.NOT_FOUND, "Associated room missing for this payment.");

			await tx.application.update({
				where: { id: application.id },
				data: { status: ApplicationStatus.APPROVED },
			});

			await tx.roomOccupant.upsert({
				where: { applicationId: application.id },
				create: {
					roomId: room.id,
					applicationId: application.id,
					paymentId: updatedPayment.id,
					tenantId: updatedPayment.tenantId,
					movedInAt: application.moveInDate,
				},
				update: {
					paymentId: updatedPayment.id,
					movedInAt: application.moveInDate,
				},
			});
		}

		return {
			executedPaymentResult,
			updatedPayment,
			redirectUrl: `${config.frontend_url}/payment/success?status=success&trxID=${executedPaymentResult.trxID}`,
		};
	});
};


export const PaymentService = {
	createPaymentCheckoutWithBkash,
	paymentBkashCallback,
	getOwnUserPaymentsHistory,
	getSinglePaymentsByID,
	deletePayment,
};

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
							ownerId: user.userId,
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

	paymentBkashHomeRent: async (payload: Record<string, any>) => {
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

		const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

		return bkashCreatePaymentResult;
	},

	getPayment: async (id: string) => {
		const payment = await prisma.payments.findUnique({
			where: { id },
		});
		if (!payment)
			throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found.");
		return payment;
	},
};
