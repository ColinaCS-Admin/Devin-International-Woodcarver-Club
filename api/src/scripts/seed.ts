import { iso31661, iso31662 } from 'iso-3166';
import { hashPassword } from '../auth/password.js';
import { pool } from '../db.js';
import { createMember } from '../members/repository.js';

const CRAFT_SKILLS: [string, string][] = [
  ['CHIPCARV', 'Chip Carving'],
  ['RELIEF', 'Relief Carving'],
  ['WHITTLE', 'Whittling'],
  ['CARICATR', 'Caricature Carving'],
  ['TREEN', 'Treen and Spoon Carving'],
  ['CHAINSAW', 'Chainsaw Carving'],
  ['INTARSIA', 'Intarsia and Marquetry'],
  ['PYROGRPH', 'Pyrography'],
  ['DECOY', 'Decoy and Bird Carving'],
  ['LETTER', 'Letter Carving'],
];

const TIERS: [string, string][] = [
  ['Basic', 'Basic membership'],
  ['Advanced', 'Advanced membership with workshop access'],
  ['Lifetime', 'Lifetime membership with full benefits'],
];

const DISCOUNTS: [string, number][] = [
  ['Standard tool supplier discount', 5],
  ['Workshop fee discount', 15],
  ['Lifetime member discount', 25],
];

async function seedReferenceData(): Promise<void> {
  for (const country of iso31661) {
    await pool.query(
      `INSERT INTO woodcarver.country (country_code, country_desc) VALUES ($1, $2)
       ON CONFLICT (country_code) DO UPDATE SET country_desc = EXCLUDED.country_desc`,
      [country.alpha2, country.name],
    );
  }

  const countryCodes = new Set(iso31661.map((country) => country.alpha2));
  for (const subdivision of iso31662) {
    // A handful of ISO 3166-2 entries exceed the code format the schema accepts
    // (e.g. four-character subdivision suffixes); those are skipped rather than
    // silently truncated.
    if (!countryCodes.has(subdivision.parent) && !countryCodes.has(subdivision.code.slice(0, 2))) {
      continue;
    }
    if (!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(subdivision.code)) continue;
    await pool.query(
      `INSERT INTO woodcarver.state_province (state_province_code, state_province_desc, country_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (state_province_code)
       DO UPDATE SET state_province_desc = EXCLUDED.state_province_desc`,
      [subdivision.code, subdivision.name, subdivision.code.slice(0, 2)],
    );
  }

  for (const [code, desc] of CRAFT_SKILLS) {
    await pool.query(
      `INSERT INTO woodcarver.craft_skill (craft_skill_code, craft_skill_desc) VALUES ($1, $2)
       ON CONFLICT (craft_skill_code) DO UPDATE SET craft_skill_desc = EXCLUDED.craft_skill_desc`,
      [code, desc],
    );
  }

  for (const [desc, pct] of DISCOUNTS) {
    await pool.query(
      `INSERT INTO woodcarver.member_discount (member_discount_desc, discount_pct, effective_from)
       SELECT $1::varchar, $2, CURRENT_DATE
        WHERE NOT EXISTS (SELECT 1 FROM woodcarver.member_discount
                           WHERE member_discount_desc = $1::varchar)`,
      [desc, pct],
    );
  }

  for (const [code, desc] of TIERS) {
    await pool.query(
      `INSERT INTO woodcarver.membership_tier (member_tier_code, member_tier_desc) VALUES ($1, $2)
       ON CONFLICT (member_tier_code) DO UPDATE SET member_tier_desc = EXCLUDED.member_tier_desc`,
      [code, desc],
    );
  }
}

interface DemoMember {
  alias: string;
  first: string;
  middle?: string;
  last: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  country: string;
  tier: 'Basic' | 'Advanced' | 'Lifetime';
  skills: string[];
  activeInd?: string;
  roles?: string[];
}

const DEMO_MEMBERS: DemoMember[] = [
  {
    alias: 'admin',
    first: 'Ada',
    last: 'Ridgeway',
    email: 'admin@woodcarvers.example',
    phone: '+1-555-0100',
    address: '1 Guild Hall',
    state: 'US-OR',
    country: 'US',
    tier: 'Lifetime',
    skills: ['RELIEF', 'LETTER'],
    roles: ['MEMBER', 'ADMIN'],
  },
  {
    alias: 'gouge_master',
    first: 'Bruno',
    middle: 'K',
    last: 'Havel',
    email: 'bruno@woodcarvers.example',
    phone: '+420-555-0111',
    address: '14 Karlova',
    state: 'CZ-10',
    country: 'CZ',
    tier: 'Advanced',
    skills: ['CHIPCARV', 'TREEN'],
  },
  {
    alias: 'spoonbird',
    first: 'Mei',
    last: 'Tanaka',
    email: 'mei@woodcarvers.example',
    phone: '+81-555-0122',
    address: '3-2-1 Sakura',
    state: 'JP-13',
    country: 'JP',
    tier: 'Basic',
    skills: ['WHITTLE', 'DECOY', 'PYROGRPH'],
  },
  {
    alias: 'oakcarver',
    first: 'Sofia',
    last: 'Marino',
    email: 'sofia@woodcarvers.example',
    phone: '+39-555-0133',
    address: 'Via Roma 8',
    state: 'IT-25',
    country: 'IT',
    tier: 'Advanced',
    skills: ['INTARSIA', 'CARICATR'],
    activeInd: 'S',
  },
];

async function seedMembers(): Promise<void> {
  const passwordHash = await hashPassword('Woodcarver!2026');
  for (const demo of DEMO_MEMBERS) {
    const existing = await pool.query('SELECT 1 FROM woodcarver.member WHERE member_alias = $1', [
      demo.alias,
    ]);
    if ((existing.rowCount ?? 0) > 0) continue;
    await createMember({
      memberAlias: demo.alias,
      memberFirstName: demo.first,
      memberMiddleName: demo.middle ?? null,
      memberLastName: demo.last,
      emailAddress: demo.email,
      telephoneNumber1: demo.phone,
      telephoneType1: 'Mobile',
      addressLine1: demo.address,
      stateProvinceCode: demo.state,
      countryCode: demo.country,
      memberTierCode: demo.tier,
      activeInd: demo.activeInd ?? 'Y',
      craftSkillCodes: demo.skills,
      passwordHash,
      roles: demo.roles ?? ['MEMBER'],
    });
  }
}

async function main(): Promise<void> {
  await seedReferenceData();
  await seedMembers();
  console.info('Seed complete. Demo password for all seeded members: Woodcarver!2026');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
