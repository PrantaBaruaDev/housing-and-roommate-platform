import { z } from "zod";
import { BillStatus, InvoiceType } from "../../../generated/prisma/enums";

const utilityDetailsItemSchema = z.object({
    name: z.string({ error: "Utility item name is required" }),
    amount: z.number().nonnegative("Amount must be non-negative"),
});

const createInvoiceZodSchema = z.object({
    roomOccupantId: z.string({ error: "Room Occupant ID is required" }),
    tenantId: z.string({ error: "Tenant ID is required" }),
    propertyId: z.string({ error: "Property ID is required" }),
    billMonth: z
        .string({ error: "Bill month is required" })
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "billMonth must be in YYYY-MM format"),
    type: z.enum(InvoiceType).optional(),
    rentAmount: z.number({error: "Rent amount must be require"}).min(0, "Rent amount must be non-negative"),
    utilityDetails: z.array(utilityDetailsItemSchema).optional(),
    dueDate: z.coerce.date({ error: "Due date is required" }),
});

const updateInvoiceZodSchema = z.object({
    rentAmount: z.number().min(0).optional(),
    billMonth: z
        .string({ error: "Bill month is required" })
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "billMonth must be in YYYY-MM format").optional(),
    utilityDetails: z.array(utilityDetailsItemSchema).optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(BillStatus).optional(),
    type: z.enum(InvoiceType).optional(),
});

export const InvoiceValidation = {
    createInvoiceZodSchema,
    updateInvoiceZodSchema,
};