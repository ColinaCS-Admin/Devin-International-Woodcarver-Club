import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { query } from '../db.js';
import { authenticate } from '../middleware.js';

export const referenceRouter = Router();

referenceRouter.use(authenticate);

// The reference tables all follow the same <name>_code / <name>_desc shape, so a
// lookup endpoint only needs the table name and the camelCase keys to emit.
function lookup(path: string, table: string, codeKey: string, descKey: string): void {
  const codeColumn = `${table}_code`;
  const descColumn = `${table}_desc`;
  referenceRouter.get(
    path,
    asyncHandler(async (_req, res) => {
      const result = await query<Record<string, string>>(
        `SELECT ${codeColumn}, ${descColumn} FROM woodcarver.${table} ORDER BY ${descColumn}`,
      );
      res.json(
        result.rows.map((row) => ({ [codeKey]: row[codeColumn], [descKey]: row[descColumn] })),
      );
    }),
  );
}

lookup('/countries', 'country', 'countryCode', 'countryDesc');
lookup('/languages', 'language', 'languageCode', 'languageDesc');
lookup('/craft-skills', 'craft_skill', 'craftSkillCode', 'craftSkillDesc');

referenceRouter.get(
  '/countries/:countryCode/state-provinces',
  asyncHandler(async (req, res) => {
    const result = await query<{ state_province_code: string; state_province_desc: string }>(
      `SELECT state_province_code, state_province_desc
         FROM woodcarver.state_province
        WHERE country_code = $1
        ORDER BY state_province_desc`,
      [String(req.params.countryCode).toUpperCase()],
    );
    res.json(
      result.rows.map((row) => ({
        stateProvinceCode: row.state_province_code,
        stateProvinceDesc: row.state_province_desc,
      })),
    );
  }),
);

referenceRouter.get(
  '/membership-tiers',
  asyncHandler(async (_req, res) => {
    const result = await query<{ member_tier_code: string; member_tier_desc: string }>(
      'SELECT member_tier_code, member_tier_desc FROM woodcarver.membership_tier ORDER BY member_tier_code',
    );
    res.json(
      result.rows.map((row) => ({
        memberTierCode: row.member_tier_code,
        memberTierDesc: row.member_tier_desc,
      })),
    );
  }),
);
