import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyController } from "./property.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { PropertyValidation } from "./property.validation";
import { PropertyFlatRoutes } from "../flats/flats.route";

const router = Router();

router.use("/flat", PropertyFlatRoutes);

router.get(
	"/is-deleted",
	auth(Role.ADMIN),
	PropertyController.getAllDeletedProperty,
);

router.get(
	"/owner",
	auth(Role.ADMIN, Role.OWNER),
	PropertyController.getAllOwnerOwnProperty,
);

// public route
router.get("/", PropertyController.getAllProperty);

// Owners route
router.post(
	"/",
	validateRequest(PropertyValidation.PropertyCreateZodSchema),
	auth(Role.ADMIN, Role.OWNER),
	PropertyController.createProperty,
);

router.get("/:id", PropertyController.getPropertyByID);

router.patch(
	"/:id",
	validateRequest(PropertyValidation.PropertyUpdateZodSchema),
	auth(Role.ADMIN, Role.OWNER),
	PropertyController.updatePropertyByID,
);

router.patch(
	"/:id/delete",
	// validateRequest(PropertyValidation.PropertySoftDeleteZodSchema),
	auth(Role.ADMIN, Role.OWNER),
	PropertyController.softDeletePropertyByID,
);

router.delete(
	"/:id",
	validateRequest(PropertyValidation.PropertyUpdateZodSchema),
	auth(Role.ADMIN),
	PropertyController.deletePropertyByID,
);

export const PropertyRoutes = router;
