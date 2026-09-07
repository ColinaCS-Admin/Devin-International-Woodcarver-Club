import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const schemaPath = fileURLToPath(new URL('../../../db/schema.sql', import.meta.url));

async function main(): Promise<void> {
  const sql = await readFile(schemaPath, 'utf8');
  const exists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'woodcarver' AND table_name = 'member') AS exists`,
  );
  if (exists.rows[0]?.exists) {
    console.info('Schema already present, nothing to do.');
    return;
  }
  await pool.query(sql);
  console.info('Schema created.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
