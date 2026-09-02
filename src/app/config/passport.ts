import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import {
	Strategy as GoogleStrategy,
	Profile,
	VerifyCallback,
} from "passport-google-oauth20";
import { prisma } from "../lib/prisma";
import bcryptjs from "bcryptjs";
import config from ".";
import { AuthProvider, Role } from "../../generated/prisma/enums";

passport.use(
	new LocalStrategy(
		{
			usernameField: "email",
			passwordField: "password",
		},
		async (email, password, done) => {
			try {
				const user = await prisma.users.findUnique({
					where: { email },
				});

				if (!user) {
					return done(null, false, {
						message: "User does not exists!",
					});
				}

				if (!user.password) {
					return done(null, false, {
						message:
							"This account does not have password, Please login with google",
					});
				}

				const isPasswordMatch = await bcryptjs.compare(password, user.password);

				if (!isPasswordMatch) {
					return done(null, false, {
						message: "Password does not matched",
					});
				}

				return done(null, user);
			} catch (error) {
				return done(error);
			}
		},
	),
);

passport.use(
	new GoogleStrategy(
		{
			clientID: config.google_client_id,
			clientSecret: config.google_client_secret,
			callbackURL: config.google_client_callback_url,
		},
		async (
			accessToken: string,
			refreshToken: string,
			profile: Profile,
			done: VerifyCallback,
		) => {
			try {
				const email = profile.emails?.[0]?.value;

				if (!email) {
					return done(null, false, {
						message: "No email found from Google!",
					});
				}

				// Search for existing user by email or googleId
				let user = await prisma.users.findFirst({
					where: {
						OR: [{ googleId: profile.id }, { email }],
					},
				});

				// Handle soft-deleted or inactive users
				if (user && (user.isDeleted || user.status !== "ACTIVE")) {
					return done(null, false, {
						message: "User account is suspended or deleted.",
					});
				}

				// Update existing user if googleId wasn't linked yet
				if (user) {
					if (!user.googleId) {
						user = await prisma.users.update({
							where: { id: user.id },
							data: {
								googleId: profile.id,
								emailVerified: true, // Google accounts have verified emails
							},
						});
					}
					return done(null, user);
				}

				const photoUrl =
					profile.photos && profile.photos.length > 0
						? profile.photos[0]?.value
						: null;

				// 4. Create new user if no match found
				user = await prisma.users.create({
					data: {
						name:
							profile.displayName ||
							`${profile.name?.givenName ?? ""} ${profile.name?.familyName ?? ""}`.trim(),
						email,
						googleId: profile.id,
						password: "",
						authProvider: AuthProvider.GOOGLE,
						emailVerified: true,
						profiles: {
							create: {
								profilePhoto: photoUrl,
								address: "",
								phone: "",
								nid: "",
							},
						},
					},
				});

				return done(null, user);
			} catch (error) {
				return done(error as Error);
			}
		},
	),
);
