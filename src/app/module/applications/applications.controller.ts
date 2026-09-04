import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ApplicationService } from "./applications.service";
import { IRequestUser } from "../auth/auth.interface";

const createApplication = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user as IRequestUser;

    const result = await ApplicationService.createApplication(payload, user);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Application created successfully.",
        data: result,
    });
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
    const query = req.query;
    const user = req.user as IRequestUser;

    const result = await ApplicationService.getAllApplications(query, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Applications retrieved successfully.",
        meta: result.meta,
        data: result.data,
    });
});

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as IRequestUser;

    const result = await ApplicationService.getApplicationById(id as string, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Application retrieved successfully.",
        data: result,
    });
});

const updateApplication = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const user = req.user as IRequestUser;

    const result = await ApplicationService.updateApplication(id as string, payload, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Application updated successfully.",
        data: result,
    });
});

const deleteApplication = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ApplicationService.deleteApplication(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Application deleted successfully.",
        data: result,
    });
});

export const ApplicationController = {
    createApplication,
    getAllApplications,
    getApplicationById,
    updateApplication,
    deleteApplication,
};