import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PropertyFlatService } from "./flats.service";
import { IRequestUser } from "../auth/auth.interface";

const createFlatProperty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user as IRequestUser;
	const result = await PropertyFlatService.registerPropertyFlatInventory(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Property create successfully",
		data: result,
	});
});

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


export const PropertyFlatController = {
	createFlatProperty,
	getFlatProperty,
};
