import { PaymentProvider, PaymentStatus } from "../../../generated/prisma/enums";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";

/* 
model Payments {
  id            String        @id @default(uuid())
  applicationId String
  tenantId      String
  amount        Decimal       @db.Decimal(10, 2)
  paidAt        DateTime?
  status        PaymentStatus @default(PENDING)

  paymentProvider PaymentProvider @default(BKASH)
  merchantInvoiceNumber String? // application id or Invoice ID

  // Unified Gateway Identifiers
  gatewayPaymentId      String?         @unique 
  gatewayTransactionId  String?         @unique 

  // Provider-Specific Metadata
  payerReference        String?         // Customer phone number (bKash) or billing email (Stripe)
  stripeCustomerId      String?

  gatewayResponse      Json?

  refundTrxID     String?
  refundAmount    Decimal? @db.Decimal(10, 2)
  refundReason    String?
  refundedAt      DateTime?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  application   Application   @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  tenant        Users         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([applicationId])
  @@index([gatewayPaymentId])
  @@index([gatewayTransactionId])
  @@map("payments")
}

*/
export interface PaymentsModel {
	id: string;
	applicationId: string;
	tenantId: string;
	amount: Decimal;
	paidAt?: Date;
	status: PaymentStatus

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

export type ICreatePaymentPayload = Pick<PaymentsModel, "applicationId">
