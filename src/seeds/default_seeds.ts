import { prisma } from "../app/lib/prisma";
import {
	deleteSeedTesterAdmin,
	deleteSeedTesterOwner,
	deleteSeedTesterTenant,
	seedTesterAdmin,
	seedTesterOwner,
	seedTesterTenant,
} from "../app/utils/seeds";

export const defaultSeeds = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await seedTesterAdmin();
		await seedTesterOwner();
		await seedTesterTenant();

		console.table("Database seed input successful");
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

export const deleteDefaultSeeds = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		await deleteSeedTesterAdmin();
		await deleteSeedTesterOwner();
		await deleteSeedTesterTenant();

		console.log("Database seed delete successful");
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

// defaultSeeds();

// Check which flag was passed
// pnpm tsx src/seeds/default_seeds.ts --createDefaultSeeds
const args = process.argv.slice(2);

if (args.includes("--createDefaultSeeds")) {
	await defaultSeeds();
} else if (args.includes("--deleteDefaultSeeds")) {
	await deleteDefaultSeeds();
} else {
	console.log("By default --createDefaultSeeds command executed...");
	await defaultSeeds();

	console.log(
		"You can use also those function flag (--createDefaultSeeds, --deleteDefaultSeeds)",
	);
}
