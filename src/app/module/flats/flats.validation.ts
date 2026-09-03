import z from "zod";
import { BookingMode } from "../../../generated/prisma/enums";

const RoomInputZodSchema = z.object({
    roomNumber: z.string({
            error: "Room number/name is required.",
        }).min(1, "Room number cannot be empty."),
    rentAmount: z.number({
            error: "Rent amount is required.",
        }).positive("Rent amount must be greater than 0."),
    bookingMode: z.enum(BookingMode).optional().default(BookingMode.BOOK_BY_ROOM),
    maxCapacity: z.number().int().positive("Max capacity must be at least 1.").optional().default(1),
});

const PropertyFlatRegisterInventoryZodSchema = z.object({
    propertyId: z.string(),
    flatName: z.string().optional(),
    floorNumber: z.number().int("Floor number must be an integer.").optional(),
    rooms: z.array(RoomInputZodSchema, {
            error: "Rooms array is required.",
        }).min(1, "At least one room detail must be provided."),
});

export const PropertyFlatValidation = {
    PropertyFlatRegisterInventoryZodSchema
};
