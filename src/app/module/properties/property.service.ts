import { Prisma, Role } from "../../../generated/prisma/client";
import { PropertyModel } from "../../../generated/prisma/models";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IRequestUser } from "../auth/auth.interface";
import { ICreatePropertyPayload, ISoftDeletePropertyPayload, IUpdatePropertyPayload } from "./property.interface";
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
        };

        const userRole = user.role?.toUpperCase();
        if (userRole !== Role.ADMIN) {
            whereConditions.ownerId = user.userId;
        }

        if(userRole === Role.OWNER) {
            whereConditions.isDeleted = false;
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

// TODO this function is for admin can see the all deleted property
const getAllDeletedProperty = async (query: IQuery, user: IRequestUser) => {
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

    const whereConditions: Prisma.PropertyWhereInput = {
        isDeleted: true, 
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

const updatePropertyByID = async (
    propertyId: string, 
    payload: IUpdatePropertyPayload, 
    user: IRequestUser
) => {
    await PropertyUtils.getSingleOwnerOwnProperty({
        user,
        propertyID: propertyId,
    });

    const { title, description, address, city, isDeleted, propertyImage } = payload;
console.log(isDeleted, "is Deleted");
    const updateData: Prisma.PropertyUpdateInput = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (isDeleted !== undefined && user.role === Role.ADMIN) updateData.isDeleted = isDeleted;
    if (isDeleted === false && user.role === Role.ADMIN) updateData.deletedAt = null;

    if  (isDeleted !== undefined && user.role !== Role.ADMIN) 
        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden. You don't have permission to access this resource.")

    const result = await prisma.property.update({
        where: { id: propertyId },
        data: updateData,
    });

    return result;
};

const softDeletePropertyByID = async (
    propertyID: string, 
    user: IRequestUser
) => {
    await PropertyUtils.getSingleOwnerOwnProperty({
        user,
        propertyID,
    });

    const updateData: Prisma.PropertyUpdateInput = {};

    updateData.isDeleted = true;
    updateData.deletedAt = new Date(); 

    const result = await prisma.property.update({
        where: { id: propertyID },
        data: updateData,
    });

    return result;
}

const deletePropertyByID = async (
    propertyID: string, 
    user: IRequestUser
) => {
    await PropertyUtils.getSingleOwnerOwnProperty({
        user,
        propertyID,
    });

    const result = await prisma.property.delete({
        where: { id: propertyID },
    });

    return result;
}


export const PropertyService = {
	createProperty,
    getAllProperty,
    getPropertyByID,
    getAllOwnerOwnProperty,
    updatePropertyByID,
    getAllDeletedProperty,
    softDeletePropertyByID,
    deletePropertyByID,
};
