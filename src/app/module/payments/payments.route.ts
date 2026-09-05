import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { PaymentsController } from "./payments.controller";
import { auth } from "../../middleware/checkAuth";

const router = Router();

// /api/v1/payments

router.post(
	"/create/bkash",
	auth(Role.OWNER, Role.TENANT, Role.ADMIN),
	PaymentsController.createBkashPayments,
);

router.get(
	"/",
	auth(Role.OWNER, Role.TENANT, Role.ADMIN),
	PaymentsController.getOwnUserPaymentsHistory,
);

router.get(
	"/:id",
	auth(Role.OWNER, Role.TENANT, Role.ADMIN),
	PaymentsController.getSinglePaymentsByID,
);

router.delete(
	"/:id",
	auth(Role.ADMIN),
	PaymentsController.deletePayments,
);

router.get(
	"/applications/payment/callback",
	PaymentsController.handleBkashWebhook,
);

export const PaymentsRoute = router;
