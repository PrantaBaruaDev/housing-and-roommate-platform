import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "./AppError";

// export const seedSuperAdmin = async () => {
// 	try {
// 		// const checkAnySuperAdminRoleExist = await prisma.users.count({
// 		// 	where: {
// 		// 		role: Role.SUPER_ADMIN,
// 		// 	}
// 		// });

// 		// if(checkAnySuperAdminRoleExist > 0){
// 		// 	console.warn("You Have at list >1 Super Admin Already Exists on you database!");
// 		//     return;
// 		// }

// 		const isSuperAdminExist = await prisma.users.findFirst({
// 			where: {
// 				role: Role.ADMIN,
// 			},
// 		});

// 		if (isSuperAdminExist) {
// 			console.log("Super Admin Already Exists!");
// 			return;
// 		}

// 		const name = config.super_admin_name;
// 		const email = config.super_admin_email;
// 		const password = config.super_admin_password;

// 		if (!name || !email || !password) {
// 			throw new AppError(
// 				httpStatus.INTERNAL_SERVER_ERROR,
// 				"Super Admin Name , Email, Password Missing In Env File!!!",
// 			);
// 		}

// 		const hashedPassword = await bcrypt.hash(
// 			password,
// 			Number(config.bcrypt_salt_rounds),
// 		);

// 		const superAdmin = await prisma.users.create({
// 			data: {
// 				name,
// 				email,
// 				password: hashedPassword,
// 				role: Role.ADMIN,
// 				needPasswordChange: false,
// 				emailVerified: true,
// 			},
// 		});

// 		console.log("Super Admin Created : ", superAdmin);
// 	} catch (error) {
// 		console.log("Error Seeding Super Admin : ", error);

// 		await prisma.users.delete({
// 			where: {
// 				email: config.super_admin_email,
// 			},
// 		});
// 	}
// };

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

export const seedTesterOwner = async () => {
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
				email: config.tester_owner_email,
			},
		});

		if (isTesterCustomerExist) {
			console.log("Tester Owner Already Exists!");
			return;
		}

		const name = config.tester_owner_name;
		const email = config.tester_owner_email;
		const password = config.tester_owner_password;
		const address = "";
		const phone = "";

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Owner Name , Email, Password Missing In Env File!!!",
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
				role: Role.OWNER,
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

		console.log("Tester Owner Created : ", testerCustomer);
	} catch (error) {
		console.log("Error Seeding Tester Owner : ", error);

		await prisma.users.delete({
			where: {
				email: config.tester_tenant_email,
			},
		});
	}
};
// create tester customer

export const seedTesterTenant = async () => {
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
				email: config.tester_tenant_email,
			},
		});

		if (isTesterCustomerExist) {
			console.log("Tester Tenant Already Exists!");
			return;
		}

		const name = config.tester_tenant_name;
		const email = config.tester_tenant_email;
		const password = config.tester_tenant_password;
		const address = "";
		const phone = "";

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Tenant Name , Email, Password Missing In Env File!!!",
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
				role: Role.TENANT,
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

		console.log("Tester Tenant Created : ", testerCustomer);
	} catch (error) {
		console.log("Error Seeding Tester Tenant : ", error);

		await prisma.users.delete({
			where: {
				email: config.tester_tenant_email,
			},
		});
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

// delete test super owner

export const deleteSeedTesterOwner = async () => {
	try {
		await prisma.users.delete({
			where: {
				email: config.tester_owner_email,
			},
		});
	} catch (error) {
		console.log("Error Seeding Tester Owner : ", error);
	}
};


export const deleteSeedTesterTenant = async () => {
	try {
		await prisma.users.delete({
			where: {
				email: config.tester_tenant_email,
			},
		});
	} catch (error) {
		console.log("Error Seeding Tester Tenant : ", error);
	}
};
