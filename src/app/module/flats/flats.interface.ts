import { BookingMode } from "../../../generated/prisma/enums";

export interface IRoomInput {
    roomNumber: string;
    rentAmount: number;
    bookingMode?: BookingMode;
    maxCapacity?: number;
}

export interface IRegisterPropertyInventoryPayload {
    propertyId: string;
    flatName?: string;
    floorNumber?: number;
    rooms: IRoomInput[];
}