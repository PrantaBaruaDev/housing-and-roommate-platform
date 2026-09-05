/*
  Warnings:

  - Added the required column `propertyId` to the `room_viewing_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "room_viewing_requests" ADD COLUMN     "propertyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "room_viewing_requests" ADD CONSTRAINT "room_viewing_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
