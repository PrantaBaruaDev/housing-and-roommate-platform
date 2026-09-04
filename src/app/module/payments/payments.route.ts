import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { PaymentsController } from "./payments.controller";
import { auth } from "../../middleware/checkAuth";

const router = Router();

// /api/payments
// router.post(
// 	"/create",
// 	auth(Role.OWNER, Role.TENANT),
// 	PaymentsController.createPayments,
// );

router.post(
	"/create/bkash",
	auth(Role.OWNER, Role.TENANT),
	PaymentsController.createBkashPayments,
);

// router.get(
// 	"/",
// 	auth(Role.OWNER, Role.TENANT, Role.ADMIN),
// 	PaymentsController.getOwnUserPaymentsHistory,
// );
// router.get(
// 	"/:id",
// 	auth(Role.OWNER, Role.TENANT, Role.ADMIN),
// 	PaymentsController.getSinglePaymentsByID,
// );

// router.post("/webhook", PaymentsController.handleStripeWebhook);

// router.post("/bkash", PaymentsController.paymentBkashGearRent);
router.get(
	"/applications/payment/callback",
	PaymentsController.handleBkashWebhook,
);

export const PaymentsRoute = router;
