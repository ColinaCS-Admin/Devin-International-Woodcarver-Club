import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const schemaPath = fileURLToPath(new URL('../../../db/schema.sql', import.meta.url));
const migrationsDir = fileURLToPath(new URL('../../../db/migrations/', import.meta.url));

async function applyMigrations(): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS woodcarver.schema_migration (
       migration_name TEXT PRIMARY KEY,
       applied_at     TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    const applied = await pool.query(
      'SELECT 1 FROM woodcarver.schema_migration WHERE migration_name = $1',
      [file],
    );
    if ((applied.rowCount ?? 0) > 0) continue;
    await pool.query(await readFile(new URL(file, `file://${migrationsDir}`), 'utf8'));
    await pool.query('INSERT INTO woodcarver.schema_migration (migration_name) VALUES ($1)', [
      file,
    ]);
    console.info(`Applied migration ${file}.`);
  }
}

async function main(): Promise<void> {
  const exists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables
                     WHERE table_schema = 'woodcarver' AND table_name = 'member') AS exists`,
  );
  if (exists.rows[0]?.exists) {
    console.info('Schema already present, applying pending migrations.');
  } else {
    await pool.query(await readFile(schemaPath, 'utf8'));
    console.info('Schema created.');
  }
  await applyMigrations();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
