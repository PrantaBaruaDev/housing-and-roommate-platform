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

export const RoomOccupantController = {
    getAllOwnRoomOccupantDetails
}