import { IQuery } from "../interface";

export type IPaginationResult = {
	page: number;
	limit: number;
	skip: number;
	take: number;
	sortBy: string;
	sortOrder: "asc" | "desc";
	searchTerm: string | undefined;
	filterData: Record<string, unknown>;
};

export const calculatePaginationAndSearch = (
	query: IQuery,
): IPaginationResult => {
	const page = Number(query.page) > 0 ? Number(query.page) : 1;
	const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
	const skip = (page - 1) * limit;
	const take = limit;

	const sortBy = (query.sortBy as string) || "createdAt";
	const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
	const searchTerm = query.searchTerm
		? (query.searchTerm as string).trim()
		: undefined;

	const paginationFields = [
		"page",
		"limit",
		"sortBy",
		"sortOrder",
		"searchTerm",
	];
	const filterData: Record<string, unknown> = {};

	Object.keys(query).forEach((key) => {
		if (!paginationFields.includes(key)) {
			filterData[key] = query[key];
		}
	});

	return {
		page,
		limit,
		skip,
		take,
		sortBy,
		sortOrder,
		searchTerm,
		filterData,
	};
};
