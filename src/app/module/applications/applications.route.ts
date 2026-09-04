import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ApplicationController } from "./applications.controller";
import { ApplicationValidation } from "./applications.validation";

const router = Router();

router.post(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    validateRequest(ApplicationValidation.ApplicationCreateZodSchema),
    ApplicationController.createApplication
);

router.get(
    "/",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    ApplicationController.getAllApplications
);

router.get(
    "/:id",
    auth(Role.ADMIN, Role.OWNER, Role.TENANT),
    ApplicationController.getApplicationById
);

router.patch(
    "/:id",
    auth(Role.ADMIN, Role.OWNER),
    validateRequest(ApplicationValidation.ApplicationUpdateZodSchema),
    ApplicationController.updateApplication
);

router.delete(
    "/:id",
    auth(Role.ADMIN),
    ApplicationController.deleteApplication
);

export const ApplicationRoutes = router;
