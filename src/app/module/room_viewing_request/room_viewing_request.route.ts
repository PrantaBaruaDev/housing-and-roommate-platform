import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { RoomViewingRequestController } from "./room_viewing_request.controller";

const router = Router();

router.get(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    RoomViewingRequestController.getAllViewingRequests,
);

router.get(
    "/:id",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    RoomViewingRequestController.getSingleViewingRequest,
);

router.post(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    RoomViewingRequestController.createViewingRequest,
);

router.patch(
    "/:id",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    RoomViewingRequestController.updateViewingRequestStatus,
);

router.delete(
    "/:id",
    auth(Role.ADMIN),
    RoomViewingRequestController.deleteViewingRequest,
);


export const RoomViewingRequestRoutes = router;
