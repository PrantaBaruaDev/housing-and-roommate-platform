import { Prisma, RoomViewingRequest } from "../../../generated/prisma/client";
import { Role, RoomViewingStatus } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import httpStatus from 'http-status';
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IQuery } from "../../interface";
import { IRequestUser } from "../auth/auth.interface";
import { parseExecuteTime } from "../../utils/dateTimePurser";

const createViewingRequest = async (
    tenantId: string,
    payload: {
        roomId: string;
        propertyId: string;
        proposedDate: string | Date;
    }
): Promise<RoomViewingRequest> => {
    // Check if room and property exist
    const roomExists = await prisma.rooms.findUnique({
        where: { id: payload.roomId },
    });

    if (!roomExists) {
        throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
    }

    // Prevent duplicate active requests for the same room by the same tenant
    const existingRequest = await prisma.roomViewingRequest.findFirst({
        where: {
            roomId: payload.roomId,
            tenantId,
            status: { in: [RoomViewingStatus.PENDING, RoomViewingStatus.OWNER_RESCHEDULED] },
        },
    });

    if (existingRequest) {
        throw new ApiError(
            httpStatus.CONFLICT,
            "You already have an active viewing request for this room"
        );
    }

    const result = await prisma.roomViewingRequest.create({
        data: {
            roomId: payload.roomId,
            propertyId: payload.propertyId,
            tenantId,
            proposedDate: new Date(payload.proposedDate),
            status: RoomViewingStatus.PENDING,
        },
        include: {
            room: true,
            property: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                    city: true,
                },
            },
            tenant: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return result;
};

const getAllViewingRequests = async (
    query: IQuery,
    user: IRequestUser,
) => {
    const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

    const andConditions: Prisma.RoomViewingRequestWhereInput[] = [];

    if (user.role === Role.TENANT) {
        andConditions.push({ tenantId: user.userId });
    } else if (user.role === Role.OWNER) {
        andConditions.push({ property: { ownerId: user.userId } });
    }

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

    const whereConditions: Prisma.RoomViewingRequestWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

    const [rawRequests, total] = await prisma.$transaction([
        prisma.roomViewingRequest.findMany({
            where: whereConditions,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
                room: {
                    select: {
                        id: true,
                        roomNumber: true,
                        rentAmount: true,
                    },
                },
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        city: true,
                        ownerId: true,
                        owner: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                tenant: {
                    select: { id: true, name: true, email: true },
                },
            },
        }),
        prisma.roomViewingRequest.count({
            where: whereConditions,
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const formattedData = rawRequests.map((item) => {
        const { owner, ...propertyData } = item.property || {};
        const { room, tenant, ...restItem } = item;

        return {
            ...restItem,
            room: room,
            property: propertyData,
            tenant,
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
        data: formattedData,
    };
};

const getSingleViewingRequest = async (id: string) => {
    const result = await prisma.roomViewingRequest.findUnique({
        where: { id },
        include: {
            room: true,
            property: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                    city: true,
                    owner: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
            tenant: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    if (!result) {
        throw new ApiError(httpStatus.NOT_FOUND, "Viewing request not found");
    }

    // Elevate property & owner to top level
    const { owner, ...propertyData } = result.property || {};
    const { room, tenant, ...restItem } = result;

    return {
        ...restItem,
        room: room,
        property: propertyData,
        tenant,
        owner: owner || null,
    };
};

const updateViewingRequestStatus = async (
    id: string,
    user: IRequestUser,
    payload: {
        status?: RoomViewingStatus;
        counterDate?: string | Date;
    }
) => {
    const existingRequest = await prisma.roomViewingRequest.findUnique({
        where: { id },
        include: {
            property: { select: { ownerId: true } },
        },
    });

    if (!existingRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Viewing request not found");
    }

    const isOwner = existingRequest.property.ownerId === user.userId;
    const isTenant = existingRequest.tenantId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwner && !isTenant && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized to update this request");
    }

    const updateData: Prisma.RoomViewingRequestUpdateInput = {};

    // Reschedule logic by Owner
    if (payload.counterDate) {
        if (!isOwner && !isAdmin) {
            throw new ApiError(httpStatus.FORBIDDEN, "Only the owner can set a counter date");
        }
        const parseCounterDate = parseExecuteTime(payload.counterDate as string)
        updateData.counterDate = new Date(parseCounterDate);
        updateData.status = RoomViewingStatus.OWNER_RESCHEDULED;
    } else if (payload.status) {
        const allowedRoles: Role[] = [Role.ADMIN, Role.OWNER];
        if(allowedRoles.includes(user.role)) updateData.status = payload.status;
    }

    const updatedResult = await prisma.roomViewingRequest.update({
        where: { id },
        data: updateData,
        include: {
            room: true,
            property: true,
            tenant: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    return updatedResult;
};

const deleteViewingRequest = async (
    id: string,
    user: IRequestUser
) => {
    const existingRequest = await prisma.roomViewingRequest.findUnique({
        where: { id },
        include: {
            property: { select: { ownerId: true } },
        },
    });

    if (!existingRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Viewing request not found");
    }

    const isOwner = existingRequest.property.ownerId === user.userId;
    const isTenant = existingRequest.tenantId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwner && !isTenant && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized to delete this request");
    }

    const deletedResult = await prisma.roomViewingRequest.delete({
        where: { id },
    });

    return deletedResult;
};

export const RoomViewingRequestService = {
    createViewingRequest,
    getAllViewingRequests,
    getSingleViewingRequest,
    updateViewingRequestStatus,
    deleteViewingRequest,
}