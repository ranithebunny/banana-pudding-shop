-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isAddOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantGroup" TEXT,
ADD COLUMN     "variantLabel" TEXT;
