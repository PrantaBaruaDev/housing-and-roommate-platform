import z from "zod";
import { RoomViewingStatus } from "../../../generated/prisma/enums";

const RoomViewingRequestCreateZodSchema = z.object({
    roomId: z.string(),
    propertyId: z.string(),
    proposedDate: z.date(),
});

const RoomViewingRequestUpdateZodSchema = RoomViewingRequestCreateZodSchema.extend({
    proposedDate: z.date(),
    counterDate: z.date(),
    status: z.enum(RoomViewingStatus),
}).partial();

export const RoomViewingRequestValidation = {
    RoomViewingRequestCreateZodSchema,
    RoomViewingRequestUpdateZodSchema,
};
