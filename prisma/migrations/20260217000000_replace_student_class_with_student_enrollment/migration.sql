-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'TRANSFERRED');

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_idx" ON "StudentEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_classId_idx" ON "StudentEnrollment"("classId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_sectionId_idx" ON "StudentEnrollment"("sectionId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicYearId_idx" ON "StudentEnrollment"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_institutionId_idx" ON "StudentEnrollment"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_student_year_unique" ON "StudentEnrollment"("studentId", "academicYearId");

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate data from StudentClass to StudentEnrollment
-- Picks first section of each class and institution from tenant
INSERT INTO "StudentEnrollment" ("id", "studentId", "classId", "sectionId", "academicYearId", "institutionId", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    sc."studentId",
    sc."classId",
    (SELECT s."id" FROM "Section" s WHERE s."classId" = sc."classId" ORDER BY s."name" LIMIT 1),
    sc."academicYearId",
    (SELECT i."id" FROM "Institution" i JOIN "Class" c ON c."id" = sc."classId" AND c."tenantId" = i."tenantId" LIMIT 1),
    'ACTIVE'::"EnrollmentStatus",
    COALESCE(sc."createdAt", CURRENT_TIMESTAMP),
    COALESCE(sc."updatedAt", CURRENT_TIMESTAMP)
FROM "StudentClass" sc
WHERE (SELECT s."id" FROM "Section" s WHERE s."classId" = sc."classId" LIMIT 1) IS NOT NULL
  AND (SELECT i."id" FROM "Institution" i JOIN "Class" c ON c."id" = sc."classId" AND c."tenantId" = i."tenantId" LIMIT 1) IS NOT NULL;

-- DropTable
DROP TABLE "StudentClass";
