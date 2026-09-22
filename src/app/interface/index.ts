import { PrismaClient } from "@prisma/client/extension";
import { Prisma } from "../../generated/prisma/client";

export interface IQuery {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortOrder?: string;
	sortBy?: string;

	//any other filter fields can be added here
	[key: string]: any;
}

export type TransactionParam = Prisma.TransactionClient | PrismaClient;

