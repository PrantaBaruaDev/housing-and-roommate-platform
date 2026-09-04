import { BookingMode, Prisma } from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IRequestUser } from "../auth/auth.interface";
import {
	IAddRoomsToFlatPayload,
	IRegisterPropertyInventoryPayload,
	IUpdateFlatPayload,
	IUpdateRoomPayload,
} from "./flats.interface";
import httpStatus from "http-status";

const registerPropertyFlatInventory = async (
	payload: IRegisterPropertyInventoryPayload,
	user: IRequestUser,
) => {
	const { propertyId, flatName, floorNumber, rooms = [] } = payload;

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
		// Prevent duplicate flat names on the same property
		const duplicateFlat = await tx.flats.findFirst({
			where: {
				propertyId,
				flatName: { equals: resolvedFlatName, mode: "insensitive" },
			},
		});

		if (duplicateFlat) {
			throw new ApiError(
				httpStatus.CONFLICT,
				`Flat '${resolvedFlatName}' already exists for this property. Use the add-rooms endpoint instead.`,
			);
		}

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

const addRoomsToExistingFlat = async (
	payload: IAddRoomsToFlatPayload,
	user: IRequestUser,
) => {
	const { flatId, rooms } = payload;

	if (!rooms || rooms.length === 0) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"At least one room must be provided.",
		);
	}

	// Check flat existence
	const existingFlat = await prisma.flats.findUnique({
		where: { id: flatId },
	});

	if (!existingFlat) {
		throw new ApiError(httpStatus.NOT_FOUND, "Flat not found.");
	}

	return await prisma.$transaction(async (tx) => {
		// Prevent duplicate room numbers within the same flat
		const existingRooms = await tx.rooms.findMany({
			where: { flatId },
			select: { roomNumber: true },
		});

		const existingRoomNumbers = new Set(
			existingRooms.map((r) => r.roomNumber.toLowerCase()),
		);

		for (const room of rooms) {
			if (existingRoomNumbers.has(room.roomNumber.trim().toLowerCase())) {
				throw new ApiError(
					httpStatus.CONFLICT,
					`Room '${room.roomNumber}' already exists in this flat.`,
				);
			}
		}

		// Insert new rooms
		const roomDataToInsert = rooms.map((room) => ({
			propertyId: existingFlat.propertyId,
			flatId: existingFlat.id,
			roomNumber: room.roomNumber.trim(),
			rentAmount: new Prisma.Decimal(room.rentAmount),
			bookingMode: room.bookingMode || BookingMode.BOOK_BY_ROOM,
			maxCapacity: room.maxCapacity || 1,
			isAvailable: true,
		}));

		await tx.rooms.createMany({
			data: roomDataToInsert,
		});

		// Update totalRooms counter on the flat record
		const updatedFlat = await tx.flats.update({
			where: { id: flatId },
			data: {
				totalRooms: {
					increment: rooms.length,
				},
			},
			include: {
				rooms: true,
			},
		});

		return updatedFlat;
	});
};

const getPropertyFlatInventory = async (query: IQuery) => {
	const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } =
		calculatePaginationAndSearch(query);

	const andConditions: Prisma.PropertyWhereInput[] = [];

	// Fields checked on the flats model side
	if (searchTerm) {
		andConditions.push({
			flats: {
				some: {
					OR: [{ flatName: { contains: searchTerm, mode: "insensitive" } }],
				},
			},
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
							},
						},
					},
				},
			},
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

const updateFlatDetails = async (
	flatId: string,
	payload: IUpdateFlatPayload,
	user: IRequestUser,
) => {
	const { flatName, floorNumber } = payload;

	const existingFlat = await prisma.flats.findUnique({
		where: { id: flatId },
	});

	if (!existingFlat) {
		throw new ApiError(httpStatus.NOT_FOUND, "Flat not found.");
	}

	// Check duplicate flat name if renaming within the same property
	if (
		flatName &&
		flatName.trim().toLowerCase() !== existingFlat.flatName.toLowerCase()
	) {
		const duplicateFlat = await prisma.flats.findFirst({
			where: {
				propertyId: existingFlat.propertyId,
				flatName: { equals: flatName.trim(), mode: "insensitive" },
				NOT: { id: flatId },
			},
		});

		if (duplicateFlat) {
			throw new ApiError(
				httpStatus.CONFLICT,
				`Flat name '${flatName.trim()}' already exists in this property.`,
			);
		}
	}

	const updatedFlat = await prisma.flats.update({
		where: { id: flatId },
		data: {
			...(flatName && { flatName: flatName.trim() }),
			...(floorNumber !== undefined && { floorNumber: Number(floorNumber) }),
		},
		include: {
			rooms: true,
		},
	});

	return updatedFlat;
};

const updateRoomDetails = async (
	roomId: string,
	payload: IUpdateRoomPayload,
	user: IRequestUser,
) => {
	const { roomNumber, rentAmount, bookingMode, maxCapacity, isAvailable } =
		payload;

	const existingRoom = await prisma.rooms.findUnique({
		where: { id: roomId },
	});

	if (!existingRoom) {
		throw new ApiError(httpStatus.NOT_FOUND, "Room not found.");
	}

	// Prevent duplicate room numbers inside the same flat
	if (
		roomNumber &&
		roomNumber.trim().toLowerCase() !== existingRoom.roomNumber.toLowerCase()
	) {
		const duplicateRoom = await prisma.rooms.findFirst({
			where: {
				flatId: existingRoom.flatId,
				roomNumber: { equals: roomNumber.trim(), mode: "insensitive" },
				NOT: { id: roomId },
			},
		});

		if (duplicateRoom) {
			throw new ApiError(
				httpStatus.CONFLICT,
				`Room number '${roomNumber.trim()}' already exists in this flat.`,
			);
		}
	}

	const updatedRoom = await prisma.rooms.update({
		where: { id: roomId },
		data: {
			...(roomNumber && { roomNumber: roomNumber.trim() }),
			...(rentAmount !== undefined && {
				rentAmount: new Prisma.Decimal(rentAmount),
			}),
			...(bookingMode && { bookingMode }),
			...(maxCapacity !== undefined && { maxCapacity: Number(maxCapacity) }),
			...(isAvailable !== undefined && { isAvailable }),
		},
	});

	return updatedRoom;
};

const deleteRoom = async (roomId: string, user: IRequestUser) => {
	const existingRoom = await prisma.rooms.findUnique({
		where: { id: roomId },
	});

	if (!existingRoom) {
		throw new ApiError(httpStatus.NOT_FOUND, "Room not found.");
	}

	return await prisma.$transaction(async (tx) => {
		// Delete target room
		await tx.rooms.delete({
			where: { id: roomId },
		});

		// Decrement totalRooms counter on flat record
		const updatedFlat = await tx.flats.update({
			where: { id: existingRoom.flatId },
			data: {
				totalRooms: {
					decrement: 1,
				},
			},
			include: {
				rooms: true,
			},
		});

		return updatedFlat;
	});
};

export const PropertyFlatService = {
	registerPropertyFlatInventory,
	addRoomsToExistingFlat,
	getPropertyFlatInventory,
	updateFlatDetails,
	updateRoomDetails,
	deleteRoom,
};
