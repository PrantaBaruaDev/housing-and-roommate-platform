import bcrypt from "bcryptjs";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import {
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
} from "./auth.interface";
import { createUserTokens } from "../../helpers/authToken";
import httpStatus from "http-status";
import { ApiError } from "../../errors/ApiError";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { Prisma } from "../../../generated/prisma/client";
import { IQuery } from "../../interface";

const registerUser = async (payload: IRegisterPatientPayload) => {
	const { name, password, role, imagePublicId, profilePhoto, address, phone, nid } = payload;
	const email = payload.email.trim().toLowerCase();

	if (role === Role.ADMIN) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Forbidden: You cannot register as an ADMIN",
		);
	}

	const isUserExists = await prisma.users.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new ApiError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

	const createdUser = await prisma.users.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			profiles: {
				create: { imagePublicId, profilePhoto, address, phone, nid },
			},
		},
		omit: { password: true },
		include: { profiles: true },
	});

	const { profiles, ...user } = createdUser;
	const { accessToken, refreshToken } = createUserTokens(user);

	return {
		user,
		profiles,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.users.findUnique({
		where: { email },
	});

	if (!user) {
		throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new ApiError(httpStatus.FORBIDDEN, "User account is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new ApiError(httpStatus.FORBIDDEN, "User account is deleted");
	}

	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.users.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			profiles: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new ApiError(httpStatus.NOT_FOUND, "User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new ApiError(undefined,
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.users.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new ApiError(httpStatus.NOT_FOUND, "User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in,
	);

	return {
		accessToken,
		refreshToken,
	};
};


export const getAllUsersService = async (query: IQuery, user: IRequestUser) => {
    if (user.role !== Role.ADMIN) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "Access denied. Only administrators can view the user list.",
        );
    }

    const { page, limit, skip, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

    const andConditions: Prisma.UsersWhereInput[] = [];

    const searchableFields = ["name", "email", "phone"];

    if (searchTerm) {
        andConditions.push({
            OR: [
                ...searchableFields.map((field) => ({
                    [field]: {
                        contains: searchTerm,
                        mode: "insensitive" as Prisma.QueryMode,
                    },
                })),
                {
                    profiles: {
                        OR: [
                            {
                                phone: {
                                    contains: searchTerm,
                                    mode: "insensitive" as Prisma.QueryMode,
                                },
                            },
                            {
                                address: {
                                    contains: searchTerm,
                                    mode: "insensitive" as Prisma.QueryMode,
                                },
                            },
                            {
                                nid: {
                                    contains: searchTerm,
                                    mode: "insensitive" as Prisma.QueryMode,
                                },
                            },
                        ],
                    },
                },
            ],
        });
    }

    if (filterData && Object.keys(filterData).length > 0) {
        const { role, status, ...otherFilters } = filterData;

        if (role) {
            andConditions.push({ role: role as Role });
        }

        if (status) {
            andConditions.push({ status: status as UserStatus });
        }

        if (Object.keys(otherFilters).length > 0) {
            andConditions.push({
                AND: Object.keys(otherFilters).map((key) => ({
                    [key]: otherFilters[key],
                })),
            });
        }
    }

    const whereConditions: Prisma.UsersWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [users, total] = await prisma.$transaction([
        prisma.users.findMany({
            where: whereConditions,
            skip,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                profiles: {
                    select: {
                        id: true,
                        phone: true,
                        profilePhoto: true,
                        address: true,
                        nid: true,
                        created_at: true,
                        updated_at: true,
                    },
                },
            },
        }),
        prisma.users.count({
            where: whereConditions,
        }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
		data: users,
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
    };
};
export const AuthService = {
	registerUser,
	loginUser,
	getMe,
	refreshToken,
	getAllUsersService,
};
