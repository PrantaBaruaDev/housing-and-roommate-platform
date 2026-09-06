import express from "express";
import { Role } from "../../../generated/prisma/enums";
import { InvoiceController } from "./invoice.controller";
import { InvoiceValidation } from "./invoice.validation";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";

const router = express.Router();

router.post(
    "/",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(InvoiceValidation.createInvoiceZodSchema),
    InvoiceController.createInvoice
);

router.get(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    InvoiceController.getAllInvoices
);

router.get(
    "/:id",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    InvoiceController.getSingleInvoiceById
);

router.patch(
    "/:id",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(InvoiceValidation.updateInvoiceZodSchema),
    InvoiceController.updateInvoice
);

router.delete(
    "/:id",
    auth(Role.ADMIN, Role.OWNER),
    InvoiceController.deleteInvoice
);

export const InvoiceRoutes = router;