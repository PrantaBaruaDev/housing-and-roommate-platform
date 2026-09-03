import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyFlatController } from "./flats.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { PropertyFlatValidation } from "./flats.validation";

const router = Router();

// public route
router.get("/",
    PropertyFlatController.getFlatProperty
);

router.post(
    "/",
    validateRequest(PropertyFlatValidation.PropertyFlatRegisterInventoryZodSchema),
    auth(Role.ADMIN, Role.OWNER),
    PropertyFlatController.createFlatProperty
);

router.post(
    "/add-rooms",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(PropertyFlatValidation.AddRoomsToFlatSchema),
    PropertyFlatController.addRoomsToExistingFlat
);

router.patch(
    "/edit/:flatId",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(PropertyFlatValidation.UpdateFlatSchema),
    PropertyFlatController.updateFlatDetails
);

router.patch(
    "/room/edit/:roomId",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(PropertyFlatValidation.UpdateRoomSchema),
    PropertyFlatController.updateRoomDetails
);

router.delete(
    "/room/delete/:roomId",
    auth(Role.ADMIN, Role.OWNER),
    PropertyFlatController.deleteRoom
);

export const PropertyFlatRoutes = router;
