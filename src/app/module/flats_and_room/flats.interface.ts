import { BookingMode } from "../../../generated/prisma/enums";

export interface IRoomInput {
	roomNumber: string;
	rentAmount: number;
	bookingMode?: BookingMode;
	maxCapacity?: number;
	isAvailable?: boolean;
}

export interface IRegisterPropertyInventoryPayload {
	propertyId: string;
	flatName?: string;
	floorNumber?: number;
	rooms: IRoomInput[];
}

export interface IAddRoomsToFlatPayload {
	flatId: string;
	rooms: IRoomInput[];
}

export type IUpdateRoomPayload = Partial<IRoomInput>;
export type IUpdateFlatPayload = Pick<
	IRegisterPropertyInventoryPayload,
	"flatName" | "floorNumber"
>;
