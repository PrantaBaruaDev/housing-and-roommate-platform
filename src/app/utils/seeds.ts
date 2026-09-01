import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

export const seedSuperAdmin = async () => {
	try {
		// const checkAnySuperAdminRoleExist = await prisma.users.count({
		// 	where: {
		// 		role: Role.SUPER_ADMIN,
		// 	}
		// });

		// if(checkAnySuperAdminRoleExist > 0){
		// 	console.warn("You Have at list >1 Super Admin Already Exists on you database!");
		//     return;
		// }

		const isSuperAdminExist = await prisma.users.findFirst({
			where: {
				role: Role.SUPER_ADMIN,
			},
		});

		if (isSuperAdminExist) {
			console.log("Super Admin Already Exists!");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Super Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.users.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.SUPER_ADMIN,
				needPasswordChange: false,
				emailVerified: true,
			},
		});

		console.log("Super Admin Created : ", superAdmin);
	} catch (error) {
		console.log("Error Seeding Super Admin : ", error);

		await prisma.users.delete({
			where: {
				email: config.super_admin_email,
			},
		});
	}
};

//create tester admin

export const seedTesterAdmin = async () => {
	try {
		// const checkAnyCustomerRoleExist = await prisma.users.count({
		// 	where: {
		// 		role: Role.ADMIN,
		// 	}
		// });

		// if(checkAnyCustomerRoleExist > 0){
		// 	console.warn("You Have at list >1 Admin Already Exists on you database!");
		//     return;
		// }

		const isTesterAdminExist = await prisma.users.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (isTesterAdminExist) {
			console.log("Tester Admin Already Exists!");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;
		const address = "";
		const phone = "";

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Admin Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.users.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.ADMIN,
				needPasswordChange: false,
				emailVerified: true,
				profiles: {
					create: {
						address,
						phone,
					},
				},
			},
		});

		console.log("Tester Admin Created : ", testerAdmin);
	} catch (error) {
		console.log("Error Seeding Tester Admin : ", error);

		await prisma.users.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	}
};

// create tester customer

export const seedTesterCustomer = async () => {
	try {
		// const checkAnyCustomerRoleExist = await prisma.users.count({
		// 	where: {
		// 		role: Role.CUSTOMER,
		// 	}
		// });

		// if(checkAnyCustomerRoleExist > 0){
		// 	console.warn("You Have at list >1 Customer Already Exists on you database!");
		//     return;
		// }

		const isTesterCustomerExist = await prisma.users.findUnique({
			where: {
				email: config.tester_customer_email,
			},
		});

		if (isTesterCustomerExist) {
			console.log("Tester Customer Already Exists!");
			return;
		}

		const name = config.tester_customer_name;
		const email = config.tester_customer_email;
		const password = config.tester_customer_password;
		const address = "";
		const phone = "";

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Customer Name , Email, Password Missing In Env File!!!",
			);
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerCustomer = await prisma.users.create({
			data: {
				name,
				email,
				password: hashedPassword,
				role: Role.CUSTOMER,
				needPasswordChange: false,
				emailVerified: true,
				profiles: {
					create: {
						address,
						phone,
					},
				},
			},
		});

		console.log("Tester Customer Created : ", testerCustomer);
	} catch (error) {
		console.log("Error Seeding Tester Customer : ", error);

		await prisma.users.delete({
			where: {
				email: config.tester_customer_email,
			},
		});
	}
};

// delete test super admin

export const deleteSeedSuperAdmin = async () => {
	try {
		await prisma.users.delete({
			where: {
				email: config.super_admin_email,
			},
		});
	} catch (error) {
		console.log("Error Seeding Super Admin : ", error);
	}
};

// delete test admin

export const deleteSeedTesterAdmin = async () => {
	try {
		await prisma.users.delete({
			where: {
				email: config.tester_admin_email,
			},
		});
	} catch (error) {
		console.log("Error Seeding Tester Admin : ", error);
	}
};

// delete test super customer

export const deleteSeedTesterCustomer = async () => {
	try {
		await prisma.users.delete({
			where: {
				email: config.tester_customer_email,
			},
		});
	} catch (error) {
		console.log("Error Seeding Tester Customer : ", error);
	}
};
