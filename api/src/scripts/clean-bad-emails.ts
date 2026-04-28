import { prisma } from "../utils/db";

// Identifies and deletes prospects with clearly malformed emails from the NEW pool.
// These were never contacted, so hard delete is safe.
// Run with: railway run npx tsx src/scripts/clean-bad-emails.ts

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const bad = await prisma.$queryRaw<{ id: string; email: string }[]>`
    SELECT id, email FROM prospects
    WHERE status = 'NEW'
    AND (
      LENGTH(SPLIT_PART(email, '@', 1)) > 64
      OR email LIKE '%..%'
      OR email LIKE '% %'
      OR LENGTH(email) - LENGTH(REPLACE(email, '@', '')) != 1
      OR SPLIT_PART(email, '@', 2) NOT LIKE '%.%'
      OR SPLIT_PART(email, '@', 1) ~ '[0-9]{4}-[0-9]{4}'
    )
  `;

  if (bad.length === 0) {
    console.log("No malformed emails found.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${bad.length} malformed emails${DRY_RUN ? " (dry run — no changes)" : ""}:`);
  for (const { email } of bad) {
    console.log(`  - ${email}`);
  }

  if (!DRY_RUN) {
    const ids = bad.map((e) => e.id);
    await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
    console.log(`\nDeleted ${ids.length} prospects.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
