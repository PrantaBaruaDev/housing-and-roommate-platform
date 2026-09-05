import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import passport from "passport";
import "./app/config/passport";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { PropertyRoutes } from "./app/module/properties/property.route";
import { ApplicationRoutes } from "./app/module/applications/applications.route";
import { PaymentsRoute } from "./app/module/payments/payments.route";
import { authRateLimiter, globalRateLimiter } from "./app/middleware/rateLimiter";
import helmet from "helmet";
import { RoomOccupantRoutes } from "./app/module/room_occupant/room_occupant.route";

const app: Application = express();

app.use(helmet());
app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use(passport.initialize());

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Housing & Roommate platform System Backend",
	});
});

app.use("/api/v1", globalRateLimiter);

app.use("/api/v1/auth", authRateLimiter, AuthRoutes);
app.use("/api/v1/properties", PropertyRoutes);
app.use("/api/v1/applications", ApplicationRoutes);
app.use("/api/v1/payments", PaymentsRoute);
app.use("/api/v1/room_occupant", RoomOccupantRoutes);

app.use(globalErrorHandler);
app.use(notFound);

export default app;
