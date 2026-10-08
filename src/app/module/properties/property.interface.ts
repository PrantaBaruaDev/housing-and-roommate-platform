import type { BookingMode, PropertyType } from "../../../generated/prisma/enums";

export interface ICreatePropertyPayload {
  title: string;
  description: string;
  address: string;
  city: string;
  propertyType?: PropertyType;
  amenities?: string[];
}

export interface IUpdatePropertyPayload {
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  propertyType?: PropertyType;
  amenities?: string[];
  propertyImage?: string;
  isDeleted?: boolean;
}

export interface ISoftDeletePropertyPayload {
  isDeleted: boolean;
}

export interface IRoomInputPayload {
  roomNumber: string;
  rentAmount: number;
  bookingMode?: BookingMode;
  maxCapacity?: number;
}

export interface IRegisterPropertyInventoryPayload {
  propertyId: string;
  flatName?: string;
  floorNumber?: number;
  rooms: IRoomInputPayload[];
}