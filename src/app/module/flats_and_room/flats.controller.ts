import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PropertyFlatService } from "./flats.service";
import { IRequestUser } from "../auth/auth.interface";

const createFlatProperty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user as IRequestUser;
	const result = await PropertyFlatService.registerPropertyFlatInventory(
		payload,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Property create successfully",
		data: result,
	});
});

const addRoomsToExistingFlat = catchAsync(
	async (req: Request, res: Response) => {
		const payload = req.body;
		const user = req.user as IRequestUser;

		const result = await PropertyFlatService.addRoomsToExistingFlat(
			payload,
			user,
		);

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Rooms added to flat successfully.",
			data: result,
		});
	},
);

const getFlatProperty = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await PropertyFlatService.getPropertyFlatInventory(query);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Property retrieve successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleFlatDetails = catchAsync(async (req: Request, res: Response) => {
	const {id} = req.params;
	const result = await PropertyFlatService.getSingleFlatDetails(id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Property, Flat & Room details retrieve successfully",
		data: result,
	});
});

const updateFlatDetails = catchAsync(async (req: Request, res: Response) => {
	const { flatId } = req.params;
	const payload = req.body;
	const user = req.user as IRequestUser;

	const result = await PropertyFlatService.updateFlatDetails(
		flatId as string,
		payload,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Flat details updated successfully.",
		data: result,
	});
});

const updateRoomDetails = catchAsync(async (req: Request, res: Response) => {
	const { roomId } = req.params;
	const payload = req.body;
	const user = req.user as IRequestUser;

	const result = await PropertyFlatService.updateRoomDetails(
		roomId as string,
		payload,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Room details updated successfully.",
		data: result,
	});
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
	const { roomId } = req.params;
	const user = req.user as IRequestUser;

	const result = await PropertyFlatService.deleteRoom(roomId as string, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Room deleted successfully and flat total count updated.",
		data: result,
	});
});

export const PropertyFlatController = {
	createFlatProperty,
	addRoomsToExistingFlat,
	getFlatProperty,
	updateFlatDetails,
	updateRoomDetails,
	deleteRoom,
	getSingleFlatDetails,
};
