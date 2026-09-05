import { omit } from "zod/mini";
import {
	ApplicationStatus,
	Prisma,
	Role,
} from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { ownerSelect, tenantSelect } from "../../utils/userSelectionUtils";
import { IRequestUser } from "../auth/auth.interface";
import {
	ICreateApplicationPayload,
	IUpdateApplicationPayload,
} from "./applications.interface";
import httpStatus from "http-status";

const createApplication = async (
	payload: ICreateApplicationPayload,
	user: IRequestUser,
) => {
	const existingRoom = await prisma.rooms.findUnique({
		where: { id: payload.roomId },
	});

	if (!existingRoom) {
		throw new ApiError(httpStatus.NOT_FOUND, "Requested room does not exist.");
	}

	if (!existingRoom.isAvailable) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"This room is currently not available for booking.",
		);
	}

	// Check for duplicate application by same tenant on same room
	const existingApplication = await prisma.application.findUnique({
		where: {
			roomId_tenantId: {
				roomId: payload.roomId,
				tenantId: user.userId,
			},
		},
	});

	const activeStatuses: ApplicationStatus[] = [
		ApplicationStatus.PENDING,
		ApplicationStatus.APPROVED,
	];

	if (
		existingApplication &&
		activeStatuses.includes(existingApplication.status)
	) {
		throw new ApiError(
			httpStatus.CONFLICT,
			`You already have an active application (${existingApplication.status}) for this room.`,
		);
	}

	const result = await prisma.application.create({
		data: {
			roomId: payload.roomId,
			tenantId: user.userId,
			moveInDate: new Date(payload.moveInDate),
			isPrivateLease: payload.isPrivateLease ?? false,
			agreedRentAmount: new Prisma.Decimal(payload.agreedRentAmount),
			rentalDocumentUrl: payload.rentalDocumentUrl || null,
		},
		include: {
			room: true,
			tenant: {
				select: tenantSelect,
			},
		},
	});

	return result;
};

const getAllApplications = async (query: IQuery, user: IRequestUser) => {
	const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } = calculatePaginationAndSearch(query);

	const andConditions: Prisma.ApplicationWhereInput[] = [];

	if (user.role !== Role.ADMIN && user.role !== Role.OWNER) {
		andConditions.push({ tenantId: user.userId });
	}

	// OWNER role can only see applications for rooms belonging to their properties
	if (user.role === Role.OWNER) {
		andConditions.push({
			room: {
				flats: {
					property: {
						ownerId: user.userId,
					},
				},
			},
		});
	}

	if (searchTerm) {
		andConditions.push({
			OR: [
				{
					room: {
						roomNumber: { contains: searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	if (Object.keys(filterData).length > 0) {
		andConditions.push({
			AND: Object.keys(filterData).map((key) => ({
				[key]: filterData[key],
			})),
		});
	}

	const whereConditions: Prisma.ApplicationWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

	const [data, total] = await prisma.$transaction([
		prisma.application.findMany({
			where: whereConditions,
			skip,
			take,
			orderBy: { [sortBy]: sortOrder },
			select: {
				id: true,
				roomId: true,
				status: true,
				moveInDate: true,
				isPrivateLease: true,
				agreedRentAmount: true,
				ownerFeedback: true,
				tenant: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				room: {
					select: {
						id: true,
						propertyId: true,
						flatId: true,
						roomNumber: true,
						rentAmount: true,
						bookingMode: true,
						maxCapacity: true,
						property: {
							select: {
								id: true,
								title: true,
								address: true,
								city: true,
								owner: {
									select: ownerSelect,
								},
							},
						},
					},
				},
				payments: true,
			},
		}),
		prisma.application.count({ where: whereConditions }),
	]);

	const totalPages = Math.ceil(total / limit);

	return {
		meta: { page, limit, total, totalPages },
		data,
	};
};

const getApplicationById = async (id: string, user: IRequestUser) => {
	const application = await prisma.application.findUnique({
		where: { id },
		include: {
			tenant: {
				select: tenantSelect,
			},
			room: {
				include: {
					property: {
						include: {
							owner: {
								select: ownerSelect,
							},
						},
						...user.role !== Role.ADMIN && { omit: { isDeleted: true, deletedAt: true } }
					},
				},
				...user.role !== Role.ADMIN && { omit: { isDeleted: true, deletedAt: true } }
			},
			payments: {
				...user.role !== Role.ADMIN && {omit:{ gatewayResponse: true, }}
			},
		},
	});

	if (!application) {
		throw new ApiError(httpStatus.NOT_FOUND, "Application not found.");
	}

	if (
		user.role !== Role.ADMIN &&
		user.role !== Role.OWNER &&
		application.tenantId !== user.userId
	) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"You are not authorized to view this application.",
		);
	}

	return application;
};

const updateApplication = async (
	id: string,
	payload: IUpdateApplicationPayload,
	user: IRequestUser,
) => {
	const {
		moveInDate,
		isPrivateLease,
		agreedRentAmount,
		rentalDocumentUrl,
		ownerFeedback,
		status,
	} = payload;
	const existingApplication = await prisma.application.findUnique({
		where: { id },
	});

	if (!existingApplication) {
		throw new ApiError(httpStatus.NOT_FOUND, "Application not found.");
	}

	const updateData: Prisma.ApplicationUpdateInput = {};

	if (moveInDate !== undefined) {updateData.moveInDate = moveInDate;}
	if (isPrivateLease !== undefined) {updateData.isPrivateLease = isPrivateLease;}
	if (agreedRentAmount !== undefined && user.role === Role.ADMIN){
		updateData.agreedRentAmount = Number(agreedRentAmount);
	}
	if (rentalDocumentUrl !== undefined){
		updateData.rentalDocumentUrl = rentalDocumentUrl;
	}
	if (status !== undefined) {updateData.status = status;}
	if (ownerFeedback !== undefined) {updateData.ownerFeedback = ownerFeedback;}

	const updatedApplication = await prisma.application.update({
		where: { id },
		data: updateData,
		include: {
			room: true,
			tenant: {
				select: tenantSelect,
			},
		},
	});

	return updatedApplication;
};

const deleteApplication = async (id: string) => {
	const existingApplication = await prisma.application.findUnique({
		where: { id },
	});

	if (!existingApplication) {
		throw new ApiError(httpStatus.NOT_FOUND, "Application not found.");
	}

	await prisma.application.delete({
		where: { id },
	});

	return { message: "Application deleted successfully." };
};

export const ApplicationService = {
	createApplication,
	getAllApplications,
	getApplicationById,
	updateApplication,
	deleteApplication,
};
