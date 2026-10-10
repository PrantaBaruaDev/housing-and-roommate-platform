import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { IRequestUser } from "../auth/auth.interface";
import httpStatus from 'http-status';
import { RoomOccupantService } from "./room_occupant.service";


const getAllOwnRoomOccupantDetails = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const query = req.query;
        const user = req.user as IRequestUser;

        const result = await RoomOccupantService.getAllOwnRoomOccupantDetails(query, user);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Owner room occupant details retrieve successfully",
            data: result.data,
            meta: result.meta,
        });
    },
);

const moveOutRoomOccupant = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const user = req.user as IRequestUser;

        const result = await RoomOccupantService.moveOutRoomOccupant(id as string, user);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Tenant marked as moved out successfully.",
            data: result,
        });
    },
);

const undoMoveOut = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const user = req.user as IRequestUser;

        const result = await RoomOccupantService.undoMoveOut(id as string, user);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Tenant cancel moved out successfully.",
            data: result,
        });
    },
);

export const RoomOccupantController = {
    getAllOwnRoomOccupantDetails,
    moveOutRoomOccupant,
    undoMoveOut,
}