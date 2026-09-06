import {
	PaymentProvider,
	PaymentStatus,
} from "../../../generated/prisma/enums";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";


export interface PaymentsModel {
	id: string;
	applicationId?: string;
	invoiceId?: string;
	tenantId: string;
	amount: Decimal;
	paidAt?: Date;
	status: PaymentStatus;

	paymentProvider: PaymentProvider;
	merchantInvoiceNumber?: string;

	gatewayPaymentId?: string;
	gatewayTransactionId?: string;

	payerReference?: string;
	stripeCustomerId?: string;

	gatewayResponse?: JSON;

	refundTrxID?: string;
	refundAmount?: Decimal;
	refundReason?: string;
	refundedAt?: Date;

	createdAt?: Date;
	updatedAt?: Date;
}

export type ICreatePaymentPayload = Pick<PaymentsModel, "applicationId" | "invoiceId">;
