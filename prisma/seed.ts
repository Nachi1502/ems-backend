import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ALL_PERMISSIONS } from '../src/modules/rbac/constants/permissions';

const prisma = new PrismaClient();

const PASSWORD_SALT_ROUNDS = 12;
const DEMO_TENANT_CODE = 'DEMO';
const DEMO_ADMIN_EMAIL = 'admin@ems.com';
const DEMO_ADMIN_PASSWORD = 'Admin@123';

/** Platform-level role (tenantId = null): full system access */
const SUPER_ADMIN_PERMISSIONS: string[] = ALL_PERMISSIONS.map((p) => p.code);

/**
 * Tenant-level role template (tenantId = null).
 * SCHOOL_ADMIN gets all tenant-scoped permissions except platform-only.
 */
const SCHOOL_ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
  (p) => !['PERMISSION_MANAGE', 'TENANT_MANAGE'].includes(p.code),
).map((p) => p.code);

/** Tenant-level: teaching and attendance */
const TEACHER_PERMISSIONS = [
  'STUDENT_READ',
  'ATTENDANCE_MARK',
  'ATTENDANCE_READ',
  'REPORT_READ',
];

/** Tenant-level: fees and accounts */
const ACCOUNTANT_PERMISSIONS = [
  'STUDENT_READ',
  'FEE_HEAD_MANAGE',
  'FEE_STRUCTURE_MANAGE',
  'FEE_ASSIGN',
  'FEE_PAY',
  'FEE_READ',
  'REPORT_READ',
];

const ROLE_DEFINITIONS = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full system access (platform-level)',
    permissions: SUPER_ADMIN_PERMISSIONS,
  },
  {
    key: 'SCHOOL_ADMIN',
    name: 'School Admin',
    description: 'Administrator for the tenant',
    permissions: SCHOOL_ADMIN_PERMISSIONS,
  },
  {
    key: 'TEACHER',
    name: 'Teacher',
    description: 'Teaching and attendance',
    permissions: TEACHER_PERMISSIONS,
  },
  {
    key: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Fees and accounts',
    permissions: ACCOUNTANT_PERMISSIONS,
  },
] as const;

async function seedRbac() {
  console.log('[Seed] Starting RBAC seed...');

  const permissionMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      create: { code: perm.code, name: perm.name },
      update: { name: perm.name },
    });
    permissionMap.set(perm.code, created.id);
    console.log(`[Seed] Permission upserted: ${perm.code}`);
  }

  for (const roleDef of ROLE_DEFINITIONS) {
    let role = await prisma.role.findFirst({
      where: { key: roleDef.key, tenantId: null },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          key: roleDef.key,
          name: roleDef.name,
          description: roleDef.description,
        },
      });
      console.log(`[Seed] Role created: ${roleDef.key}`);
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: {
          name: roleDef.name,
          description: roleDef.description,
        },
      });
      console.log(`[Seed] Role updated: ${roleDef.key}`);
    }

    for (const code of roleDef.permissions) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        create: { roleId: role.id, permissionId },
        update: {},
      });
    }
    console.log(`[Seed] ${roleDef.permissions.length} permissions attached to ${roleDef.key}`);
  }

  console.log('[Seed] RBAC seed completed.');
}

async function seedDemoData() {
  console.log('[Seed] Starting demo data seed...');

  let tenant = await prisma.tenant.findFirst({
    where: { code: DEMO_TENANT_CODE, deletedAt: null },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Demo School',
        code: DEMO_TENANT_CODE,
        isActive: true,
      },
    });
    console.log('[Seed] Tenant created: Demo School (DEMO)');
  } else {
    console.log('[Seed] Tenant already exists: Demo School');
  }

  let institution = await prisma.institution.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        tenantId: tenant.id,
        name: 'Demo School',
        email: 'admin@demoschool.edu',
      },
    });
    console.log('[Seed] Institution created: Demo School');
  } else {
    console.log('[Seed] Institution already exists');
  }

  let schoolAdminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, key: 'SCHOOL_ADMIN', deletedAt: null },
  });

  if (!schoolAdminRole) {
    const templateRole = await prisma.role.findFirst({
      where: { key: 'SCHOOL_ADMIN', tenantId: null },
    });
    if (!templateRole) {
      throw new Error('Template role SCHOOL_ADMIN not found. Run RBAC seed first.');
    }
    const templatePerms = await prisma.rolePermission.findMany({
      where: { roleId: templateRole.id },
    });
    schoolAdminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        key: 'SCHOOL_ADMIN',
        name: 'School Admin',
        description: 'Administrator for the tenant',
      },
    });
    for (const rp of templatePerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: schoolAdminRole.id,
          permissionId: rp.permissionId,
          tenantId: tenant.id,
        },
      });
    }
    console.log('[Seed] SCHOOL_ADMIN role created for tenant');
  } else {
    console.log('[Seed] SCHOOL_ADMIN role already exists for tenant');
  }

  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);
  const adminEmail = DEMO_ADMIN_EMAIL.trim().toLowerCase();

  let adminUser = await prisma.user.findFirst({
    where: { email: adminEmail, deletedAt: null },
    include: { profiles: { where: { deletedAt: null } } },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        tenantId: tenant.id,
        profiles: {
          create: {
            tenantId: tenant.id,
            organizationId: tenant.id,
            roleId: schoolAdminRole.id,
          },
        },
      },
      include: { profiles: { where: { deletedAt: null } } },
    });
    console.log('[Seed] Admin user created: admin@ems.com');
  } else {
    const hasProfile = adminUser.profiles.some(
      (p) => p.tenantId === tenant.id && p.roleId === schoolAdminRole.id,
    );
    if (!hasProfile) {
      await prisma.profile.create({
        data: {
          userId: adminUser.id,
          tenantId: tenant.id,
          organizationId: tenant.id,
          roleId: schoolAdminRole.id,
        },
      });
      console.log('[Seed] Profile linked for admin user');
    } else {
      console.log('[Seed] Admin user already exists with profile');
    }
  }

  let academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  });

  if (!academicYear) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date(now.getFullYear(), 11, 31);
    academicYear = await prisma.academicYear.create({
      data: {
        tenantId: tenant.id,
        name: `${now.getFullYear()}-${now.getFullYear() + 1}`,
        startDate,
        endDate,
        isActive: true,
      },
    });
    console.log('[Seed] Academic year created');
  } else {
    console.log('[Seed] Academic year already exists');
  }

  let demoClass = await prisma.class.findFirst({
    where: {
      tenantId: tenant.id,
      academicYearId: academicYear.id,
      name: 'Class 1',
      deletedAt: null,
    },
  });

  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        tenantId: tenant.id,
        academicYearId: academicYear.id,
        name: 'Class 1',
      },
    });
    console.log('[Seed] Class 1 created');
  } else {
    console.log('[Seed] Class 1 already exists');
  }

  let sectionA = await prisma.section.findFirst({
    where: { classId: demoClass.id, name: 'A', deletedAt: null },
  });

  if (!sectionA) {
    sectionA = await prisma.section.create({
      data: {
        classId: demoClass.id,
        name: 'A',
      },
    });
    console.log('[Seed] Section A created');
  } else {
    console.log('[Seed] Section A already exists');
  }

  const studentData = [
    { admissionNumber: 'STU001', firstName: 'Alice', lastName: 'Smith' },
    { admissionNumber: 'STU002', firstName: 'Bob', lastName: 'Jones' },
  ];

  for (const s of studentData) {
    let student = await prisma.student.findFirst({
      where: {
        tenantId: tenant.id,
        admissionNumber: s.admissionNumber,
      },
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          tenantId: tenant.id,
          admissionNumber: s.admissionNumber,
          firstName: s.firstName,
          lastName: s.lastName,
        },
      });
      console.log(`[Seed] Student created: ${s.firstName} ${s.lastName}`);
    } else if (student.deletedAt) {
      await prisma.student.update({
        where: { id: student.id },
        data: { deletedAt: null },
      });
    }

    const existingEnrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        status: 'ACTIVE',
      },
    });
    if (!existingEnrollment) {
      await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          classId: demoClass.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
          institutionId: institution.id,
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed] Student ${s.admissionNumber} assigned to Class 1 Section A`);
    }
  }

  console.log('[Seed] Demo data seed completed successfully.');
}

async function main() {
  await seedRbac();
  await seedDemoData();
  console.log('[Seed] All seeds completed.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
