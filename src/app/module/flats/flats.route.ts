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


export const PropertyFlatRoutes = router;
