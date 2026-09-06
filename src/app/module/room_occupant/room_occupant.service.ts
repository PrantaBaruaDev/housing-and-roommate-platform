import { Prisma, Role } from "../../../generated/prisma/client";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { tenantSelect } from "../../utils/userSelectionUtils";
import { IRequestUser } from "../auth/auth.interface";

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
                            select:{
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

export const RoomOccupantService = {
    getAllOwnRoomOccupantDetails,
}