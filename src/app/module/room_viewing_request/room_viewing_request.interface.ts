import { RoomViewingStatus } from "../../../generated/prisma/enums";

export interface IRoomViewingFilterRequest {
  searchTerm?: string;
  status?: RoomViewingStatus;
  roomId?: string;
  propertyId?: string;
  tenantId?: string;
}