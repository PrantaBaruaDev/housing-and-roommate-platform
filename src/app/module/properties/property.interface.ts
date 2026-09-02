
export interface PropertyModel {
    id: string;
    title: string;
    description: string;
    address: string;
    city: string;
    ownerId: string;
    imagePublicID?: string;
    propertyImage?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;

    // owner: Users;
    // rooms: Rooms[];
    // utilitySplits: UtilitySplit[];
}

export type ICreatePropertyPayload = Omit<PropertyModel, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
export type IUpdatePropertyPayload = Omit<PropertyModel, "id" | "ownerId" | "createdAt" | "updatedAt">
export type ISoftDeletePropertyPayload = Pick<PropertyModel, "isDeleted">

