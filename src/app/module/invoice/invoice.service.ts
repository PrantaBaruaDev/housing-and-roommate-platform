import { prisma } from "../../lib/prisma";
import { ApiError } from "../../errors/ApiError";
import httpStatus from "http-status";
import { IRequestUser } from "../auth/auth.interface";
import { InvoiceType, Role } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { ICreateInvoicePayload, IUpdateInvoice } from "./invoice.interface";
import { BillStatus } from './../../../generated/prisma/enums';

const createInvoice = async (payload: ICreateInvoicePayload) => {
    const roomOccupant = await prisma.roomOccupant.findUnique({
        where: { id: payload.roomOccupantId },
        include: {
            application: {
                select: { agreedRentAmount: true },
            },
            room: {
                select: { propertyId: true },
            },
        },
    });

    if (!roomOccupant) {
        throw new ApiError(
            httpStatus.NOT_FOUND,
            "Room occupant record not found"
        );
    }

    const tenantId = roomOccupant.tenantId;
    const propertyId = roomOccupant.room?.propertyId;

    if (!propertyId) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Associated property not found for this room occupant"
        );
    }

    const existingInvoice = await prisma.invoice.findUnique({
        where: {
            roomOccupantId_billMonth: {
                roomOccupantId: payload.roomOccupantId,
                billMonth: payload.billMonth,
            },
        },
    });

    if (existingInvoice) {
        throw new ApiError(
            httpStatus.CONFLICT,
            `An invoice already exists for this room occupant for billing cycle ${payload.billMonth}`
        );
    }

    let calculatedUtilityAmount = 0;
    if (payload.utilityDetails && payload.utilityDetails.length > 0) {
        calculatedUtilityAmount = payload.utilityDetails.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
        );
    }

    const getRentAmount = payload.rentAmount
        ? payload.rentAmount
        : Number(roomOccupant.application.agreedRentAmount);

    const calculatedTotal = getRentAmount + calculatedUtilityAmount;

    const result = await prisma.invoice.create({
        data: {
            roomOccupantId: payload.roomOccupantId,
            tenantId: tenantId,
            propertyId: propertyId,
            billMonth: payload.billMonth,
            type: payload.type || InvoiceType.COMBINED_RENT_UTILITY,
            rentAmount: new Prisma.Decimal(getRentAmount),
            utilityAmount: new Prisma.Decimal(calculatedUtilityAmount),
            totalAmount: new Prisma.Decimal(calculatedTotal),
            utilityDetails: payload.utilityDetails
                ? (payload.utilityDetails as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            dueDate: new Date(payload.dueDate),
            status: BillStatus.UNPAID,
        },
        include: {
            tenant: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true } },
            roomOccupant: {
                include: {
                    room: { select: { id: true, roomNumber: true } },
                },
            },
        },
    });

    return result;
};

const getAllInvoices = async (user: IRequestUser) => {
    let whereCondition: Prisma.InvoiceWhereInput = {};

    if (user.role === Role.TENANT) {
        whereCondition = { tenantId: user.userId };
    } else if (user.role === Role.OWNER) {
        whereCondition = {
            property: { ownerId: user.userId },
        };
    }

    const invoices = await prisma.invoice.findMany({
        where: whereCondition,
        include: {
            tenant: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true } },
            roomOccupant: {
                include: {
                    room: { select: { id: true, roomNumber: true } },
                },
            },
            payment: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return invoices;
};

const getSingleInvoiceById = async (user: IRequestUser, id: string) => {
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            tenant: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true, ownerId: true } },
            roomOccupant: {
                include: {
                    room: { select: { id: true, roomNumber: true } },
                },
            },
            payment: true,
        },
    });

    if (!invoice) {
        throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found");
    }

    const isTenant = invoice.tenantId === user.userId;
    const isOwner = invoice.property?.ownerId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isTenant && !isOwner && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden access to invoice");
    }

    return invoice;
};

const updateInvoice = async (
    user: IRequestUser,
    id: string,
    payload: IUpdateInvoice
) => {
    const existingInvoice = await getSingleInvoiceById(user, id);

    const isOwner = existingInvoice.property?.ownerId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "You are not authorized to update this invoice"
        );
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (payload.billMonth) {
        const isPaid = existingInvoice.status === "PAID" || Boolean(existingInvoice.payment);

        if (isPaid) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Cannot update bill month for an invoice that has already been paid"
            );
        }

        if (existingInvoice.billMonth === payload.billMonth) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "New bill month must be different from the existing bill month"
            );
        }

        const duplicateMonthInvoice = await prisma.invoice.findUnique({
            where: {
                roomOccupantId_billMonth: {
                    roomOccupantId: existingInvoice.roomOccupantId,
                    billMonth: payload.billMonth,
                },
            },
        });

        if (duplicateMonthInvoice && duplicateMonthInvoice.id !== id) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `An invoice already exists for this room occupant for billing cycle ${payload.billMonth}`
            );
        }

        updateData.billMonth = payload.billMonth;
    }

    let currentRent = payload.rentAmount ?? Number(existingInvoice.rentAmount);
    let currentUtility = Number(existingInvoice.utilityAmount);

    if (payload.utilityDetails && payload.utilityDetails.length > 0) {
        currentUtility = payload.utilityDetails.reduce(
            (sum, item) => sum + (Number(item.amount) || 0),
            0
        );
        updateData.utilityAmount = new Prisma.Decimal(currentUtility);
        updateData.utilityDetails = payload.utilityDetails as unknown as Prisma.InputJsonValue;
    } else if (payload.utilityAmount !== undefined) {
        currentUtility = payload.utilityAmount;
        updateData.utilityAmount = new Prisma.Decimal(currentUtility);
    }

    if (payload.rentAmount !== undefined) {
        updateData.rentAmount = new Prisma.Decimal(payload.rentAmount);
    }

    updateData.totalAmount = new Prisma.Decimal(currentRent + currentUtility);

    if (payload.dueDate) updateData.dueDate = new Date(payload.dueDate);
    if (payload.status) updateData.status = payload.status;
    if (payload.type) updateData.type = payload.type;

    const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
            tenant: { select: { id: true, name: true, email: true } },
            property: { select: { id: true, title: true } },
            roomOccupant: {
                include: {
                    room: { select: { id: true, roomNumber: true } },
                },
            },
            payment: true,
        },
    });

    return updatedInvoice;
};

const deleteInvoice = async (user: IRequestUser, id: string) => {
    await getSingleInvoiceById(user, id);

    const deletedInvoice = await prisma.invoice.delete({
        where: { id },
    });

    return deletedInvoice;
};

export const InvoiceService = {
    createInvoice,
    getAllInvoices,
    getSingleInvoiceById,
    updateInvoice,
    deleteInvoice,
};