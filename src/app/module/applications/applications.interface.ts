
import { Decimal } from "@prisma/client/runtime/client";
import { ApplicationStatus } from "../../../generated/prisma/enums";


export interface ApplicationModel {
    id: string;
    roomId: string;
    tenantId: string;
    status: ApplicationStatus;
    moveInDate: Date;
    isPrivateLease: boolean
    agreedRentAmount: Decimal;
    rentalDocumentUrl?: string;
    ownerFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}


export type ICreateApplicationPayload = Omit<ApplicationModel, "id" | "tenantId" | "status" | "createdAt" | "updatedAt" | "deletedAt">
export type IUpdateApplicationPayload = Omit<ApplicationModel, "id" | "tenantId" | "createdAt" | "updatedAt">


