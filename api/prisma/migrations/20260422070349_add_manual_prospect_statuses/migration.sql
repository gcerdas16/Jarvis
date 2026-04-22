-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProspectStatus" ADD VALUE 'REUNION_AGENDADA';
ALTER TYPE "ProspectStatus" ADD VALUE 'REUNION_REALIZADA';
ALTER TYPE "ProspectStatus" ADD VALUE 'PROPUESTA_ENVIADA';
ALTER TYPE "ProspectStatus" ADD VALUE 'CLIENTE';
ALTER TYPE "ProspectStatus" ADD VALUE 'NO_INTERESADO';
ALTER TYPE "ProspectStatus" ADD VALUE 'REVISITAR';
