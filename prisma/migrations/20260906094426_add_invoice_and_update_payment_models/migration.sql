/*
  Warnings:

  - You are about to drop the `utility_splits` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[invoiceId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('COMBINED_RENT_UTILITY', 'MAINTENANCE_FEE');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'OVERDUE');

-- DropForeignKey
ALTER TABLE "utility_splits" DROP CONSTRAINT "utility_splits_propertyId_fkey";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoiceId" TEXT,
ALTER COLUMN "applicationId" DROP NOT NULL;

-- DropTable
DROP TABLE "utility_splits";

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "roomOccupantId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "billMonth" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL DEFAULT 'COMBINED_RENT_UTILITY',
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "utilityAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "utilityDetails" JSONB,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_roomOccupantId_billMonth_key" ON "invoices"("roomOccupantId", "billMonth");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceId_key" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_roomOccupantId_fkey" FOREIGN KEY ("roomOccupantId") REFERENCES "room_occupant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
