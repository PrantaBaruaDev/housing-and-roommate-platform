import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { IRequestUser } from "./auth.interface";
import { AuthService } from "./auth.service";
import passport from "passport";
import { createUserTokens } from "../../helpers/authToken";
import { clearAuthCookie, setAuthCookie } from "../../helpers/authCookie";
import config from "../../config";
import { ApiError } from "../../errors/ApiError";

const registerUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await AuthService.registerUser(payload);

	const { accessToken, refreshToken, user, profiles } = result;

	setAuthCookie(res, result);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Profiles registered successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			profiles,
		},
	});
});

const credentialsLogin = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		passport.authenticate("local", async (err: any, user: any, info: any) => {
			try {
				if (err) {
					return next(err);
				}
				if (!user) {
					return next(new Error(info?.message || "Invalid credentials!"));
				}

				const userTokens = createUserTokens(user);

				setAuthCookie(res, userTokens);

				const { password, ...rest } = user;

				sendResponse(res, {
					success: true,
					statusCode: httpStatus.OK,
					message: "User login successfully",
					data: {
						accessToken: userTokens.accessToken,
						refreshToken: userTokens.refreshToken,
					},
				});
			} catch (error) {
				next(error);
			}
		})(req, res, next);
	},
);

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!user) {
		throw new Error("User information is missing in the request");
	}

	const result = await AuthService.getMe(user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies.refreshToken;

    if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token missing!");
    }

    const result = await AuthService.refreshToken(token);
	const { accessToken, refreshToken: newRefreshToken } = result;
	setAuthCookie(res, {refreshToken: newRefreshToken})

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: {
			accessToken,
			refreshToken: newRefreshToken,
		},
	});
});

const googleLogin = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		const authenticator = passport.authenticate("google", {
			scope: ["profile", "email"],
			session: false,
			accessType: "offline",
			prompt: "consent select_account",
		});

		authenticator.redirect = (url: string) => {
			res.status(200).json({
				success: true,
				message: "Google OAuth URL generated successfully",
				data: { url },
			});
		};

		authenticator(req, res, next);
	},
);

const googleCallback = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		passport.authenticate(
			"google",
			{ session: false },
			async (err: any, user: any, info: any) => {
				try {
					if (err || !user) {
						const errorMessage = info?.message || err?.message || "auth_failed";
						return res.redirect(
							`${config.frontend_url}/login?error=${encodeURIComponent(errorMessage)}`,
						);
					}

					const userTokens = createUserTokens(user);

					setAuthCookie(res, userTokens);

					return res.redirect(
						`${config.frontend_url}/auth/success?token=${userTokens.accessToken}`,
					);
				} catch (error) {
					return next(error);
				}
			},
		)(req, res, next);
	},
);

const logout = catchAsync(
	async (req: Request, res: Response, next: NextFunction) => {
		clearAuthCookie(res);
		sendResponse(res, {
			success: true,
			statusCode: httpStatus.OK,
			message: "User logout successfully",
			data: null,
		});
	},
);

export const AuthController = {
	registerUser,
	credentialsLogin,
	getMe,
	googleLogin,
	googleCallback,
	refreshToken,
	logout,
};
