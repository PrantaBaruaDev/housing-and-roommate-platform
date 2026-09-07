import z from "zod";
import { ApplicationStatus } from "../../../generated/prisma/enums";

const ApplicationCreateZodSchema = z.object({
	roomId: z.string({ error: "Room ID must be required"}),
	moveInDate: z.coerce.date({ error: "Move in date must be required"}),
	isPrivateLease: z.boolean().default(false),
	agreedRentAmount: z.number({ error: "Room ID must be required"}),
});

const ApplicationUpdateZodSchema = z.object({
	roomId: z.string().optional(),
	moveInDate: z.coerce.date().optional(),
	isPrivateLease: z.boolean().optional(),
	agreedRentAmount: z.number().optional(),
	rentalDocumentUrl: z.string().optional(),
	ownerFeedback: z.string().optional(),
	status: z.enum(ApplicationStatus).optional(),
});

export const ApplicationValidation = {
	ApplicationCreateZodSchema,
	ApplicationUpdateZodSchema,
};
