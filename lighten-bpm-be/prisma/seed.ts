import { PrismaClient, OrgUnitType } from '@prisma/client';

// instantiate the Prisma client
const prisma = new PrismaClient();

const SUPPORTED_ORG_UNIT_TRANSLATION_LANGS = ['en', 'zh-TW', 'zh-CN'] as const;
const UNASSIGNED_ORG_TRANSLATIONS: Record<
  (typeof SUPPORTED_ORG_UNIT_TRANSLATION_LANGS)[number],
  string
> = {
  en: 'Unassigned',
  'zh-TW': '未分配',
  'zh-CN': '未分配',
};

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

  for (const lang of SUPPORTED_ORG_UNIT_TRANSLATION_LANGS) {
    await (prisma as any).orgUnitTranslation.upsert({
      where: {
        org_unit_id_lang: {
          org_unit_id: unassignedOrg.id,
          lang,
        },
      },
      update: { name: UNASSIGNED_ORG_TRANSLATIONS[lang] },
      create: {
        org_unit_id: unassignedOrg.id,
        lang,
        name: UNASSIGNED_ORG_TRANSLATIONS[lang],
      },
    });
  }

  const orgUnits = await (prisma as any).orgUnit.findMany({
    select: {
      id: true,
      name: true,
      translations: { select: { lang: true } },
    },
  });

  for (const orgUnit of orgUnits) {
    const existingLanguages = new Set(
      orgUnit.translations.map(
        (translation: { lang: string }) => translation.lang,
      ),
    );

    for (const lang of SUPPORTED_ORG_UNIT_TRANSLATION_LANGS) {
      if (existingLanguages.has(lang)) continue;

      await (prisma as any).orgUnitTranslation.create({
        data: {
          org_unit_id: orgUnit.id,
          lang,
          name: orgUnit.name,
        },
      });
    }
  }

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
