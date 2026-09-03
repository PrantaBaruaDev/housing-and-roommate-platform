import { BookingMode, Prisma } from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IRequestUser } from "../auth/auth.interface";
import { IRegisterPropertyInventoryPayload } from "./flats.interface";
import httpStatus from 'http-status';

const registerPropertyFlatInventory = async (
    payload: IRegisterPropertyInventoryPayload,
    user: IRequestUser
) => {
    const {
        propertyId,
        flatName,
        floorNumber,
        rooms = [],
    } = payload;

    // 1. Verify property existence prior to transaction to prevent P2025 foreign key failures
    const existingProperty = await prisma.property.findUnique({
        where: { id: propertyId, isDeleted: false },
    });

    if (!existingProperty) {
        throw new ApiError(httpStatus.NOT_FOUND, "Property not found.");
    }

    const resolvedFlatName = flatName?.trim() || "Main Unit";
    const resolvedFloorNumber = Number(floorNumber) || 0;

    return await prisma.$transaction(async (tx) => {
        const createdFlat = await tx.flats.create({
            data: {
                propertyId,
                flatName: resolvedFlatName,
                floorNumber: resolvedFloorNumber,
                totalRooms: rooms.length,
            },
        });

        if (rooms.length > 0) {
            const roomDataToInsert = rooms.map((room) => ({
                propertyId,
                flatId: createdFlat.id,
                roomNumber: room.roomNumber.trim(),
                rentAmount: new Prisma.Decimal(room.rentAmount),
                bookingMode: room.bookingMode || BookingMode.BOOK_BY_ROOM,
                maxCapacity: room.maxCapacity || 1,
                isAvailable: true,
            }));

            await tx.rooms.createMany({
                data: roomDataToInsert,
            });
        }

        return await tx.property.findUnique({
            where: { id: propertyId },
            include: {
                flats: {
                    include: {
                        rooms: true,
                    },
                },
            },
        });
    });
};

const getPropertyFlatInventory = async (query: IQuery) => {
    const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

    const andConditions: Prisma.PropertyWhereInput[] = [];

    // Fields checked on the flats model side
    if (searchTerm) {
        andConditions.push({
            flats: {
                some: {
                    OR: [
                        { flatName: { contains: searchTerm, mode: "insensitive" } },
                    ]
                }
            }
        });
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: filterData[key],
            })),
        });
    }

    const whereConditions: Prisma.PropertyWhereInput = {
        isDeleted: false,
        ...(andConditions.length > 0 && { AND: andConditions }),
    };

    // 2. Count total using property model rather than rooms model to match whereConditions shape
    const [rawProperties, total] = await prisma.$transaction([
        prisma.property.findMany({
            where: whereConditions,
            skip,
            take,
            orderBy: {
                [sortBy]: sortOrder,
            },
            include: {
                flats: true,
                rooms: true,
                owner: {
                    select: {
                        name: true,
                        email: true,
                        profiles: {
                            select: {
                                phone: true,
                                address: true,
                            }
                        }
                    }
                }
            }
        }),
        prisma.property.count({
            where: whereConditions,
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data = rawProperties.map((property) => {
        const { profiles, ...ownerData } = property.owner || {};
        return {
            ...property,
            owner: {
                ...ownerData,
                phone: profiles?.phone || "",
                address: profiles?.address || "",
            },
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

export const PropertyFlatService = {
    registerPropertyFlatInventory,
    getPropertyFlatInventory
};