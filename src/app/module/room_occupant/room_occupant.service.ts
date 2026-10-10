import { Prisma, Role } from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { IQuery, TransactionParam } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { tenantSelect } from "../../utils/userSelectionUtils";
import { IRequestUser } from "../auth/auth.interface";
import httpStatus from 'http-status';

const getAllOwnRoomOccupantDetails = async (query: IQuery, user: IRequestUser) => {
    const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

    const andConditions: Prisma.RoomOccupantWhereInput[] = [];

    const searchableFields = ["roomId", "applicationId", "paymentId"];

    // Search Filter
    if (searchTerm) {
        andConditions.push({
            OR: searchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            })),
        });
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: filterData[key],
            })),
        });
    }

    // Role-Based Filtering
    let roleCondition: Prisma.RoomOccupantWhereInput = {};

    if (user.role === Role.TENANT) {
        roleCondition = { tenantId: user.userId };
    } else if (user.role === Role.OWNER) {
        roleCondition = {
            room: {
                property: {
                    ownerId: user.userId,
                },
            },
        };
    } else if (user.role === Role.ADMIN) {
        roleCondition = {};
    }

    const whereConditions: Prisma.RoomOccupantWhereInput = {
        ...roleCondition,
        ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const [rawProperties, total] = await prisma.$transaction([
        prisma.roomOccupant.findMany({
            where: whereConditions,
            skip,
            take,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: {
                room: {
                    select: {
                        id: true,
                        propertyId: true,
                        flatId: true,
                        roomNumber: true,
                        rentAmount: true,
                        bookingMode: true,
                        property: {
                            select: {
                                id: true,
                                title: true,
                                address: true,
                                city: true,
                                ownerId: true,
                                propertyImage: true,
                                owner: {
                                    select: tenantSelect
                                }
                            }
                        },

                    }
                },
                application: {
                    select: {
                        id: true,
                        status: true,
                        agreedRentAmount: true,
                        moveInDate: true,
                    },
                },
                payment: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        paidAt: true,
                        gatewayTransactionId: true,
                        paymentProvider: true,
                    },
                },
                tenant: {
                    select: tenantSelect
                },
            },
        }),
        prisma.roomOccupant.count({
            where: whereConditions,
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = rawProperties.map((roomOccupant) => {
        const { owner, ...propertyData } = roomOccupant.room?.property || {};
        const { room, tenant, ...restOccupant } = roomOccupant;
        const { property, ...roomData } = roomOccupant.room;

        return {
            ...restOccupant,
            room: roomData,
            property: propertyData,
            tenant: tenant,
            owner: owner || null,
        };
    });

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
        data,
    };
};

export const upsertRoomOccupant = async (
    data: {
        applicationId: string;
        roomId: string;
        paymentId: string;
        tenantId: string;
        moveInDate: Date;
    },
    tx: TransactionParam
) => {
    return await tx.roomOccupant.upsert({
        where: { applicationId: data.applicationId },
        create: {
            roomId: data.roomId,
            applicationId: data.applicationId,
            paymentId: data.paymentId,
            tenantId: data.tenantId,
            movedInAt: data.moveInDate,
        },
        update: {
            paymentId: data.paymentId,
            movedInAt: data.moveInDate,
        },
    });
};

const moveOutRoomOccupant = async (
    occupantId: string,
    user: IRequestUser,
) => {
    const occupant = await prisma.roomOccupant.findUnique({
        where: { id: occupantId },
        include: {
            room: {
                include: {
                    property: { select: { ownerId: true } },
                },
            },
        },
    });

    if (!occupant) {
        throw new ApiError(httpStatus.NOT_FOUND, "Room occupant not found.");
    }

    if (occupant.movedOutAt) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "This tenant has already moved out of the room.",
        );
    }

    const isOwner = occupant.room?.property?.ownerId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "You can only update occupancy for your own properties.",
        );
    }

    return await prisma.$transaction(async (tx) => {
        const updated = await tx.roomOccupant.update({
            where: { id: occupantId },
            data: { movedOutAt: new Date() },
            include: {
                tenant: { select: { id: true, name: true, email: true } },
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                        maxCapacity: true,
                        availableCapacity: true,
                        property: { select: { id: true, title: true } },
                    },
                },
                application: {
                    select: {
                        id: true,
                        status: true,
                        agreedRentAmount: true,
                    },
                },
            },
        });

        const room = occupant.room;
        if (room) {
            const nextCapacity = Math.min(
                room.maxCapacity,
                room.availableCapacity + 1,
            );
            await tx.rooms.update({
                where: { id: room.id },
                data: {
                    availableCapacity: nextCapacity,
                    isAvailable: nextCapacity > 0,
                },
            });
        }

        return updated;
    });
};

const undoMoveOut = async (occupantId: string, user: IRequestUser) => {
    const occupant = await prisma.roomOccupant.findUnique({
        where: { id: occupantId },
        include: {
            room: {
                include: {
                    property: { select: { ownerId: true } },
                },
            },
        },
    });

    if (!occupant) {
        throw new ApiError(httpStatus.NOT_FOUND, "Room occupant not found.");
    }

    if (!occupant.movedOutAt) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "This tenant has not been marked as moved out.",
        );
    }

    const isOwner = occupant.room?.property?.ownerId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "You can only update occupancy for your own properties.",
        );
    }
    
    return prisma.$transaction(async (tx) => {
        const updated = await tx.roomOccupant.update({
            where: { id: occupantId },
            data: { movedOutAt: null },
            include: {
                tenant: { select: { id: true, name: true, email: true } },
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                        maxCapacity: true,
                        availableCapacity: true,
                        property: { select: { id: true, title: true } },
                    },
                },
                application: {
                    select: {
                        id: true,
                        status: true,
                        agreedRentAmount: true,
                    },
                },
            },
        });

        await tx.rooms.update({
            where: { id: occupant.roomId },
            data: {
                availableCapacity: { decrement: 1 },
            },
        });
        return updated;
    });
};

export const RoomOccupantService = {
    getAllOwnRoomOccupantDetails,
    upsertRoomOccupant,
    moveOutRoomOccupant,
    undoMoveOut,
}