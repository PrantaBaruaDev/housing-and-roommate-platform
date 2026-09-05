/*
  Warnings:

  - A unique constraint covering the columns `[applicationId]` on the table `room_occupant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `room_occupant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `applicationId` to the `room_occupant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentId` to the `room_occupant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "room_occupant" ADD COLUMN     "applicationId" TEXT NOT NULL,
ADD COLUMN     "paymentId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "room_occupant_applicationId_key" ON "room_occupant"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "room_occupant_paymentId_key" ON "room_occupant"("paymentId");

-- AddForeignKey
ALTER TABLE "room_occupant" ADD CONSTRAINT "room_occupant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupant" ADD CONSTRAINT "room_occupant_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
