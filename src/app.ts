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
import { PropertyFlatRoutes } from "./app/module/flats/flats.route";
import { ApplicationRoutes } from "./app/module/applications/applications.route";


const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
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

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/properties", PropertyRoutes);
app.use("/api/v1/applications", ApplicationRoutes);


app.use(globalErrorHandler);
app.use(notFound);

export default app;
