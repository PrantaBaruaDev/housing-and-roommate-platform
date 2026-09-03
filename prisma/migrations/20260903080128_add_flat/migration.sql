/*
  Warnings:

  - Added the required column `flatId` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "flatId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "flats" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "flatName" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "totalRooms" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flats_propertyId_flatName_key" ON "flats"("propertyId", "flatName");

-- AddForeignKey
ALTER TABLE "flats" ADD CONSTRAINT "flats_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "flats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
