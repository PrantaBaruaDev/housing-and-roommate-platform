import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PropertyService } from "./property.service";
import { IRequestUser } from "../auth/auth.interface";

const createProperty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user as IRequestUser;
	const result = await PropertyService.createProperty(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Property create successfully",
		data: result,
	});
});

// TODO this function is for public
const getAllProperty = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const options = req.query;

		const result = await PropertyService.getAllProperty(options);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Property retrieve successfully",
			data: result.data,
			meta: result.meta,
		});
    }
);

const getAllDeletedProperty = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const options = req.query;
		const user = req.user as IRequestUser;

		const result = await PropertyService.getAllDeletedProperty(options, user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Retrieve all deleted property successfully",
			data: result.data,
			meta: result.meta,
		});
    }
);

const getPropertyByID = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const propertyID = req.params.id as string;

		const result = await PropertyService.getPropertyByID(propertyID);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Property retrieve successfully",
			data: result
		});
    }
);

// TODO this function is for privet owner own property for dashboard
const getAllOwnerOwnProperty = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const query = req.query;
		const user = req.user as IRequestUser;

		const result = await PropertyService.getAllOwnerOwnProperty(query, user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Owner Property retrieve successfully",
			data: result.data,
			meta: result.meta,
		});
    }
);

const updatePropertyByID = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const propertyId = req.params.id as string;
		const user = req.user as IRequestUser;
		const payload = req.body;

		const result = await PropertyService.updatePropertyByID(propertyId, payload, user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Property updated successfully",
			data: result,
		});
    }
);

// TODO soft delete with update isDelete status
const softDeletePropertyByID = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const propertyId = req.params.id as string;
		const user = req.user as IRequestUser;

		const result = await PropertyService.softDeletePropertyByID(propertyId, user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Property soft delete successfully",
			data: result,
		});
    }
);

const deletePropertyByID = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
        const propertyId = req.params.id as string;
		const user = req.user as IRequestUser;

		const result = await PropertyService.deletePropertyByID(propertyId, user);

		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "Property permanent delete successfully",
			data: result,
		});
    }
);



const createFlatProperty = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user as IRequestUser;
	const result = await PropertyService.createProperty(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Property create successfully",
		data: result,
	});
});


export const PropertyController = {
	createProperty,
    getAllProperty,
    getPropertyByID,
    getAllOwnerOwnProperty,
    updatePropertyByID,
	getAllDeletedProperty,
    softDeletePropertyByID,
    deletePropertyByID,

	createFlatProperty,
};
