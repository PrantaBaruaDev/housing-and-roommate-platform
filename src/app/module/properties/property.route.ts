import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyController } from "./property.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { PropertyValidation } from "./property.validation";

const router = Router();

// public route
router.get("/", 
    PropertyController.getAllProperty
);

// Owners route
router.post(
    "/",
    validateRequest(PropertyValidation.PropertyCreateZodSchema),
    auth(Role.ADMIN, Role.OWNER),
    PropertyController.createProperty
);

router.get("/owner", 
    auth(Role.ADMIN, Role.OWNER),
    PropertyController.getAllOwnerOwnProperty
);

router.get(
    "/:id",
    PropertyController.getPropertyByID,
);

router.patch(
    "/:id",
    validateRequest(PropertyValidation.PropertyUpdateZodSchema),
    auth(Role.ADMIN, Role.OWNER),
    PropertyController.updatePropertyByID,
);

export const PropertyRoutes = router;
