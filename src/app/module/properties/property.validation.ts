import z from "zod";

const PropertyCreateZodSchema = z.object({
    title: z.string(),
    description: z.string(),
    address: z.string(),
    city: z.string(),
    isDeleted: z.boolean().optional(),
});

const PropertyUpdateZodSchema = PropertyCreateZodSchema.partial()

const PropertySoftDeleteZodSchema = PropertyCreateZodSchema
    .pick({
        isDeleted: true
    })

export const PropertyValidation = {
    PropertyCreateZodSchema,
    PropertyUpdateZodSchema,
    PropertySoftDeleteZodSchema
};
