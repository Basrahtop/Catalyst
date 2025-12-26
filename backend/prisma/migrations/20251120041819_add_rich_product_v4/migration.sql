-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "galleryImages" TEXT[],
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 1;
