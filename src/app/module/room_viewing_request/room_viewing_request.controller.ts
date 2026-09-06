

import { Request, Response } from "express";
import httpStatus from "http-status";
import { RoomViewingRequestService } from "./room_viewing_request.service";
import { IRequestUser } from "../auth/auth.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const createViewingRequest = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IRequestUser;

    const result = await RoomViewingRequestService.createViewingRequest(
        user.userId,
        req.body
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Room viewing request created successfully",
        data: result,
    });
});

const getAllViewingRequests = catchAsync(async (req: Request, res: Response) => {

    const query = req.query;
    const user = req.user as IRequestUser;

    const result = await RoomViewingRequestService.getAllViewingRequests(query, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room viewing requests fetched successfully",
        meta: result.meta,
        data: result.data,
    });
});

const getSingleViewingRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await RoomViewingRequestService.getSingleViewingRequest(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room viewing request details fetched successfully",
        data: result,
    });
});

const updateViewingRequestStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as IRequestUser;

    const result = await RoomViewingRequestService.updateViewingRequestStatus(
        id as string,
        user,
        req.body
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room viewing request updated successfully",
        data: result,
    });
});

const deleteViewingRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as IRequestUser;

    const result = await RoomViewingRequestService.deleteViewingRequest(id as string, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room viewing request deleted successfully",
        data: result,
    });
});


export const RoomViewingRequestController = {
    createViewingRequest,
    getAllViewingRequests,
    getSingleViewingRequest,
    updateViewingRequestStatus,
    deleteViewingRequest,
}