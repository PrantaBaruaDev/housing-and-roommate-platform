import { Prisma } from "../../generated/prisma/client";

export const ownerSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UsersSelect;

export const tenantSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UsersSelect;