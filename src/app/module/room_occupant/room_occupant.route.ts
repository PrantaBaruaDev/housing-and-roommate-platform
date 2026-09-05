import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RoomOccupantController } from "./room_occupant.controller";

const router = Router();

router.get(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    RoomOccupantController.getAllOwnRoomOccupantDetails,
);


export const RoomOccupantRoutes = router;
