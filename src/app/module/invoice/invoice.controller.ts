import { Request, Response } from "express";
import httpStatus from "http-status";
import { InvoiceService } from "./invoice.service";
import { IRequestUser } from "../auth/auth.interface";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const createInvoice = catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.createInvoice(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Invoice generated successfully",
        data: result,
    });
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IRequestUser;
    const result = await InvoiceService.getAllInvoices(user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invoices retrieved successfully",
        data: result,
    });
});

const getSingleInvoiceById = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IRequestUser;
    const { id } = req.params;
    const result = await InvoiceService.getSingleInvoiceById(user, id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invoice retrieved successfully",
        data: result,
    });
});

const updateInvoice = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IRequestUser;
    const { id } = req.params;
    const payload = req.body;
    const result = await InvoiceService.updateInvoice(user, id as string, payload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invoice updated successfully",
        data: result,
    });
});

const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IRequestUser;
    const { id } = req.params;
    const result = await InvoiceService.deleteInvoice(user, id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invoice deleted successfully",
        data: result,
    });
});

export const InvoiceController = {
    createInvoice,
    getAllInvoices,
    getSingleInvoiceById,
    updateInvoice,
    deleteInvoice,
};