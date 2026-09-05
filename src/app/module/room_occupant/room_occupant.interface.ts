
export interface RoomOccupant {
    id: string;
    roomId: string;
    applicationId: string;
    paymentId: string;
    tenantId: string;
    movedInAt: Date;
    movedOutAt?: Date;

//   room       Rooms     
//   tenant     Users 
//   application  Application   
//   payment  Payments 
}

export type ICreateRoomOccupant = Omit<RoomOccupant, "id" | "moveOutAt">
