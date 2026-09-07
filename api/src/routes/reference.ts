import { Router } from 'express';
import { asyncHandler } from '../asyncHandler.js';
import { query } from '../db.js';
import { authenticate } from '../middleware.js';

export const referenceRouter = Router();

referenceRouter.use(authenticate);

referenceRouter.get(
  '/countries',
  asyncHandler(async (_req, res) => {
    const result = await query<{ country_code: string; country_desc: string }>(
      'SELECT country_code, country_desc FROM woodcarver.country ORDER BY country_desc',
    );
    res.json(
      result.rows.map((row) => ({
        countryCode: row.country_code,
        countryDesc: row.country_desc,
      })),
    );
  }),
);

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
  '/craft-skills',
  asyncHandler(async (_req, res) => {
    const result = await query<{ craft_skill_code: string; craft_skill_desc: string }>(
      'SELECT craft_skill_code, craft_skill_desc FROM woodcarver.craft_skill ORDER BY craft_skill_desc',
    );
    res.json(
      result.rows.map((row) => ({
        craftSkillCode: row.craft_skill_code,
        craftSkillDesc: row.craft_skill_desc,
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
