import { PrismaClient, OrgUnitType } from '@prisma/client';

// instantiate the Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create the "Unassigned" organization if it doesn't exist.
  // This is the default organization for new users.
  const unassignedOrg = await prisma.orgUnit.upsert({
    where: { code: 'UNASSIGNED' },
    update: {},
    create: {
      code: 'UNASSIGNED',
      name: 'Unassigned',
      type: OrgUnitType.ORG_UNIT,
    },
  });

  console.log(`Created "Unassigned" organization with id: ${unassignedOrg.id}`);

  // Create the "System" user
  const systemUser = await prisma.user.upsert({
    where: { sub: 'system-workflow-enginge' }, // Corrected to use 'sub' for where clause
    update: {},
    create: {
      code: 'SYSTEM',
      sub: 'system-workflow-enginge',
      name: 'System',
      email: 'no-reply@flow-engine.system',
      job_grade: 2147483647, // MAX_INT for a 32-bit signed integer
    },
  });

  console.log(`Created "System" user with id: ${systemUser.id}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
