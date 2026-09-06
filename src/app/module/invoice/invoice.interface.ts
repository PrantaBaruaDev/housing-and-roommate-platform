import { BillStatus, InvoiceType } from "../../../generated/prisma/enums";

export interface InvoiceUtilityAmount { name: string; amount: number };

export interface InvoiceModel {
    roomOccupantId: string;
    tenantId: string;
    propertyId: string;
    billMonth: string;
    type?: InvoiceType;
    rentAmount: number;
    utilityAmount: number;
    utilityDetails?: InvoiceUtilityAmount[];
    dueDate: string;
    status: BillStatus;
}

export interface ICreateInvoicePayload {
    roomOccupantId: string;
    tenantId: string;
    propertyId: string;
    billMonth: string;
    type?: InvoiceType;
    rentAmount: number;
    utilityAmount: number;
    utilityDetails?: InvoiceUtilityAmount[];
    dueDate: string;
}

export type IUpdateInvoice = Partial<InvoiceModel>
