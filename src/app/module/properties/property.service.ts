import { Prisma, Role } from "../../../generated/prisma/client";
import { PropertyModel } from "../../../generated/prisma/models";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IRequestUser } from "../auth/auth.interface";
import { ICreatePropertyPayload, IUpdatePropertyPayload } from "./property.interface";
import httpStatus from 'http-status';

export const PropertyUtils = {
    async getSingleOwnerOwnProperty({
        propertyID,
        user,
    }: {
        propertyID: string;
        user: IRequestUser;
    }) {
        if (!propertyID || !user.userId) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "Property ID and Owner ID are strictly required."
            );
        }

        const whereConditions: Prisma.PropertyWhereInput = {
            id: propertyID,
            isDeleted: false,
        };

        const userRole = user.role?.toUpperCase();
        if (userRole !== Role.ADMIN) {
            whereConditions.ownerId = user.userId;
        }

        const rawProperty = await prisma.property.findFirst({
            where: whereConditions,
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true,
                        profiles: {
                            select: {
                                imagePublicId: true,
                                profilePhoto: true,
                                phone: true,
                                address: true,
                            },
                        },
                    },
                },
            },
        });

        if (!rawProperty) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                "You are not authorized to view this property or it does not exist."
            );
        }

        const { profiles, ...ownerData } = rawProperty.owner || {};

        return {
            ...rawProperty,
            owner: {
                ...ownerData,
                ...profiles,
            },
        };
    }
}

const createProperty = async (payload: ICreatePropertyPayload, user: IRequestUser) => {
    const {title, description, address, city} = payload;
    const result = await prisma.property.create({
        data: {
            title,
            description,
            address,
            city,
            ownerId: user.userId,
        }
    });

    return result;
};

// TODO this function is for public
const getAllProperty = async (query: IQuery, user: IRequestUser) => {
    const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

	const andConditions: Prisma.PropertyWhereInput[] = [];

    const searchableFields = ["title", "description", "address", "city"];

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

    // const whereConditions: Prisma.PropertyWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};
    const whereConditions: Prisma.PropertyWhereInput = {
        isDeleted: false, 
        ...(andConditions.length > 0 && { AND: andConditions }),
    };

	const [rawProperties, total] = await prisma.$transaction([
		prisma.property.findMany({
			where: whereConditions,
			skip,
			take,
			orderBy: {
				[sortBy]: sortOrder,
			},
            include: {
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
                    },
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
}

const getPropertyByID = async (propertyID: PropertyModel["id"],) => {
    const rawProperties = await prisma.property.findFirstOrThrow({
        where: { id: propertyID, isDeleted: false },
        include: {
            owner: {
                select: {
                    name: true,
                    email: true,
                    profiles: {
                        select: {
                            imagePublicId: true,
                            profilePhoto: true,
                            phone: true,
                            address: true,
                        }
                    }
                },
            }
        }
    });

    const { profiles, ...ownerData } = rawProperties.owner;
    const result = {
        ...rawProperties,
        owner: {
            ...ownerData,
            ...profiles
        }
    }
    return result;
}

// TODO this function is for privet owner own property for dashboard
const getAllOwnerOwnProperty = async (query: IQuery, user: IRequestUser) => {
    const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

	const andConditions: Prisma.PropertyWhereInput[] = [];

    const searchableFields = ["title", "description", "address", "city"];

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

    // const whereConditions: Prisma.PropertyWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const whereConditions: Prisma.PropertyWhereInput = {
        ownerId: user.userId,
        isDeleted: false, 
        ...(andConditions.length > 0 && { AND: andConditions }),
    };

	const [rawProperties, total] = await prisma.$transaction([
		prisma.property.findMany({
			where: whereConditions,
			skip,
			take,
			orderBy: {
				[sortBy]: sortOrder,
			},
            include: {
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
                    },
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
                    ...profiles,
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
}

// const updatePropertyByID = async (propertyId: PropertyModel["id"], payload: IUpdatePropertyPayload, user: IRequestUser) => {
//     const existingProperty = await PropertyUtils.getSingleOwnerOwnProperty({
//         user: user,
//         propertyID: propertyId
//     });

//     console.log(existingProperty, "Look the Existing property");

// 	const updatedData: Prisma.PropertyUpdateInput = {};

// 	// 2. Dynamic loop for all provided properties
// 	for (const [key, value] of Object.entries(payload)) {
// 		if (value === undefined) continue;

//         if (typeof value === "string") {
// 			// Plain strings (trim white spaces)
// 			(updatedData as any)[key] = value.trim();
// 		} else {
// 			// Numbers, Booleans, Enums, etc.
// 			(updatedData as any)[key] = value;
// 		}
// 	}

// 	const result = await prisma.property.update({
// 		where: { id: propertyId },
// 		data: updatedData,
// 	});

// 	return result;
// }

// TODO soft delete with update isDelete status

const updatePropertyByID = async (
    propertyId: string, 
    payload: IUpdatePropertyPayload, 
    user: IRequestUser
) => {
    // 1. Authorization check (throws AppError if unauthorized or non-existent)
    await PropertyUtils.getSingleOwnerOwnProperty({
        user,
        propertyID: propertyId,
    });

    // 2. Extract allowed update fields cleanly
    const { title, description, address, city, ...otherAllowedFields } = payload;

    const updateData: Prisma.PropertyUpdateInput = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();

    // 3. Perform update securely
    const result = await prisma.property.update({
        where: { id: propertyId },
        data: updateData,
    });

    return result;
};


const softDeletePropertyByID = async () => {
    
}


const deletePropertyByID = async () => {
    
}


export const PropertyService = {
	createProperty,
    getAllProperty,
    getPropertyByID,
    getAllOwnerOwnProperty,
    updatePropertyByID,
    softDeletePropertyByID,
    deletePropertyByID,
};
