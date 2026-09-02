import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	bak_url: process.env.APP_URL,
	frontend_url: process.env.FRONTEND_URL,
	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,

	// Google Credential
	google_client_id: process.env.GOOGLE_CLIENT_ID!,
	google_client_secret: process.env.GOOGLE_CLIENT_SECRET!,
	google_client_callback_url: process.env.GOOGLE_CLIENT_CALLBACK_URL!,

	// Default user Seed credential

	tester_admin_name: process.env.TESTER_ADMIN_NAME!,
	tester_admin_email: process.env.TESTER_ADMIN_EMAIL!,
	tester_admin_password: process.env.TESTER_ADMIN_PASSWORD!,

	tester_owner_name: process.env.TESTER_OWNER_NAME,
	tester_owner_email: process.env.TESTER_OWNER_EMAIL,
	tester_owner_password: process.env.TESTER_OWNER_PASSWORD,

	tester_tenant_name: process.env.TESTER_TENANT_NAME,
	tester_tenant_email: process.env.TESTER_TENANT_EMAIL,
	tester_tenant_password: process.env.TESTER_TENANT_PASSWORD,
};
