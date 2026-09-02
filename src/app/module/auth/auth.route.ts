import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post("/register", AuthController.registerUser);
router.post(
	"/login",
	validateRequest(UserValidation.LoginZodSchema),
	AuthController.credentialsLogin,
);

// Initiate Google Login
router.get("/google", AuthController.googleLogin);

// Handle Google Callback
router.get("/google/callback", AuthController.googleCallback);

router.get(
	"/me",
	auth(Role.ADMIN, Role.OWNER, Role.TENANT),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
