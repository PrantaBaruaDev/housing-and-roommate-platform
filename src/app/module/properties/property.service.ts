import { BookingMode, Prisma, PropertyType, Role } from "../../../generated/prisma/client";
import { PropertyModel } from "../../../generated/prisma/models";
import { ApiError } from "../../errors/ApiError";
import { IQuery } from "../../interface";
import { prisma } from "../../lib/prisma";
import { calculatePaginationAndSearch } from "../../utils/paginationAndSearchHelper";
import { IRequestUser } from "../auth/auth.interface";
import {
  ICreatePropertyPayload,
  IRegisterPropertyInventoryPayload,
  IUpdatePropertyPayload,
} from "./property.interface";
import httpStatus from "http-status";

/* ────────────────────────────────────────────────────────────────
   Shared include + mapper.

   `_count.flats` gives the flat count directly.
   `rooms: { select: { isAvailable: true } }` gives us the minimal
   per-room data to count available rooms (Prisma allows only one
   `_count` per relation, and we need two counts — total and available).
   When a property realistically has thousands of rooms, swap this to
   a `prisma.room.groupBy` on propertyId. Not a concern today.
   ──────────────────────────────────────────────────────────────── */

const PROPERTY_LIST_INCLUDE = {
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
  _count: {
    select: {
      flats: { where: { isDeleted: false } },
      rooms: { where: { isDeleted: false } },
    },
  },
  rooms: {
    where: { isDeleted: false },
    select: { isAvailable: true },
  },
} satisfies Prisma.PropertyInclude;

type PropertyWithListRelations = Prisma.PropertyGetPayload<{
  include: typeof PROPERTY_LIST_INCLUDE;
}>;

function mapPropertyForList(property: PropertyWithListRelations) {
  const { profiles, ...ownerData } = property.owner ?? ({} as any);
  const { rooms, _count, owner, ...propertyData } = property;

  const roomCount = _count?.rooms ?? 0;
  const availableRoomCount = (rooms ?? []).filter((r) => r.isAvailable).length;

  return {
    ...propertyData,
    owner: {
      ...ownerData,
      phone: profiles?.phone ?? "",
      address: profiles?.address ?? "",
    },
    roomCount,
    availableRoomCount,
    occupiedRoomCount: roomCount - availableRoomCount,
    flatCount: _count?.flats ?? 0,
  };
}

/* ────────────────────────────────────────────────────────────────
   Utils
   ──────────────────────────────────────────────────────────────── */

export const PropertyUtils = {
  async getSingleOwnerOwnProperty({
    propertyID,
    user,
  }: {
    propertyID: string;
    user: IRequestUser;
  }) {
    if (!propertyID || !user.userId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Property ID and Owner ID are strictly required.",
      );
    }

    const whereConditions: Prisma.PropertyWhereInput = {
      id: propertyID,
    };

    const userRole = user.role?.toUpperCase();
    if (userRole !== Role.ADMIN) {
      whereConditions.ownerId = user.userId;
    }

    if (userRole === Role.OWNER) {
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
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You are not authorized to view this property or it does not exist.",
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
  },
};

/* ────────────────────────────────────────────────────────────────
   Create
   ──────────────────────────────────────────────────────────────── */

const createProperty = async (
  payload: ICreatePropertyPayload,
  user: IRequestUser,
) => {
  const { title, description, address, city, propertyType, amenities } = payload;

  const result = await prisma.property.create({
    data: {
      title,
      description,
      address,
      city,
      ownerId: user.userId,
      propertyType: propertyType ?? PropertyType.RESIDENTIAL,
      amenities: amenities ?? [],
    },
  });

  return result;
};

/* ────────────────────────────────────────────────────────────────
   Public list — every non-deleted property
   ──────────────────────────────────────────────────────────────── */

const getAllProperty = async (query: IQuery) => {
  const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } =
    calculatePaginationAndSearch(query);

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
      include: PROPERTY_LIST_INCLUDE,
    }),
    prisma.property.count({
      where: whereConditions,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const data = rawProperties.map(mapPropertyForList);

  return {
    meta: { page, limit, total, totalPages },
    data,
  };
};

/* ────────────────────────────────────────────────────────────────
   Admin — deleted properties
   ──────────────────────────────────────────────────────────────── */

const getAllDeletedProperty = async (query: IQuery, user: IRequestUser) => {
  const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } =
    calculatePaginationAndSearch(query);

  if (user.role !== Role.ADMIN) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Unauthorized access only admin can access this resource.",
    );
  }

  const andConditions: Prisma.PropertyWhereInput[] = [];
  const searchableFields = ["title", "description", "address", "city"];

  if (searchTerm) {
    andConditions.push({
      OR: searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
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
      orderBy: { [sortBy]: sortOrder },
      include: PROPERTY_LIST_INCLUDE,
    }),
    prisma.property.count({ where: whereConditions }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const data = rawProperties.map(mapPropertyForList);

  return {
    meta: { page, limit, total, totalPages },
    data,
  };
};

/* ────────────────────────────────────────────────────────────────
   Single property by ID
   ──────────────────────────────────────────────────────────────── */

const getPropertyByID = async (propertyID: PropertyModel["id"]) => {
  const rawProperty = await prisma.property.findFirstOrThrow({
    where: { id: propertyID, isDeleted: false },
    include: PROPERTY_LIST_INCLUDE,
  });

  return mapPropertyForList(rawProperty);
};

/* ────────────────────────────────────────────────────────────────
   Owner dashboard — own properties only
   ──────────────────────────────────────────────────────────────── */

const getAllOwnerOwnProperty = async (query: IQuery, user: IRequestUser) => {
  const { page, limit, skip, take, sortBy, sortOrder, searchTerm, filterData } =
    calculatePaginationAndSearch(query);

  const andConditions: Prisma.PropertyWhereInput[] = [];
  const searchableFields = ["title", "description", "address", "city"];

  if (searchTerm) {
    andConditions.push({
      OR: searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: "insensitive" },
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
      orderBy: { [sortBy]: sortOrder },
      include: PROPERTY_LIST_INCLUDE,
    }),
    prisma.property.count({ where: whereConditions }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const data = rawProperties.map(mapPropertyForList);

  return {
    meta: { page, limit, total, totalPages },
    data,
  };
};

/* ────────────────────────────────────────────────────────────────
   Update
   ──────────────────────────────────────────────────────────────── */

const updatePropertyByID = async (
  propertyId: string,
  payload: IUpdatePropertyPayload,
  user: IRequestUser,
) => {
  await PropertyUtils.getSingleOwnerOwnProperty({
    user,
    propertyID: propertyId,
  });

  const {
    title,
    description,
    address,
    city,
    propertyType,
    amenities,
    isDeleted,
    propertyImage,
  } = payload;

  const updateData: Prisma.PropertyUpdateInput = {};

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (propertyType !== undefined) updateData.propertyType = propertyType;
  if (amenities !== undefined) updateData.amenities = amenities;
  if (propertyImage !== undefined) updateData.propertyImage = propertyImage;

  if (isDeleted !== undefined && user.role === Role.ADMIN) {
    updateData.isDeleted = isDeleted;
    if (isDeleted === false) updateData.deletedAt = null;
  }

  if (isDeleted !== undefined && user.role !== Role.ADMIN) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Forbidden. You don't have permission to access this resource.",
    );
  }

  const result = await prisma.property.update({
    where: { id: propertyId },
    data: updateData,
  });

  return result;
};

/* ────────────────────────────────────────────────────────────────
   Verify (admin only)
   ──────────────────────────────────────────────────────────────── */

const verifyProperty = async (propertyId: string, user: IRequestUser) => {
  if (user.role !== Role.ADMIN) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can verify properties.",
    );
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, isDeleted: false },
  });

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found.");
  }

  const result = await prisma.property.update({
    where: { id: propertyId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: user.userId,
    },
  });

  return result;
};

/* ────────────────────────────────────────────────────────────────
   Soft delete / hard delete
   ──────────────────────────────────────────────────────────────── */

const softDeletePropertyByID = async (
  propertyID: string,
  user: IRequestUser,
) => {
  await PropertyUtils.getSingleOwnerOwnProperty({
    user,
    propertyID,
  });

  const result = await prisma.property.update({
    where: { id: propertyID },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return result;
};

const deletePropertyByID = async (propertyID: string, user: IRequestUser) => {
  await PropertyUtils.getSingleOwnerOwnProperty({
    user,
    propertyID,
  });

  const result = await prisma.property.delete({
    where: { id: propertyID },
  });

  return result;
};

/* ────────────────────────────────────────────────────────────────
   Flat + rooms inventory
   ──────────────────────────────────────────────────────────────── */

const registerPropertyFlatInventory = async (
  payload: IRegisterPropertyInventoryPayload,
  user: IRequestUser,
) => {
  const { propertyId, flatName, floorNumber, rooms = [] } = payload;

  await PropertyUtils.getSingleOwnerOwnProperty({
    user,
    propertyID: propertyId,
  });

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

    const roomDataToInsert = rooms.map((room) => ({
      propertyId,
      flatId: createdFlat.id,
      roomNumber: room.roomNumber.trim(),
      rentAmount: new Prisma.Decimal(room.rentAmount),
      bookingMode: room.bookingMode || BookingMode.BOOK_BY_ROOM,
      maxCapacity: room.maxCapacity ?? 1,
      availableCapacity: room.maxCapacity ?? 1,
      isAvailable: true,
    }));

    await tx.rooms.createMany({
      data: roomDataToInsert,
    });

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

/* ────────────────────────────────────────────────────────────────
   Exports
   ──────────────────────────────────────────────────────────────── */

export const PropertyService = {
  createProperty,
  getAllProperty,
  getPropertyByID,
  getAllOwnerOwnProperty,
  updatePropertyByID,
  verifyProperty,
  getAllDeletedProperty,
  softDeletePropertyByID,
  deletePropertyByID,
  registerPropertyFlatInventory,
};