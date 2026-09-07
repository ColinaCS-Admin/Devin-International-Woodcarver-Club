import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../asyncHandler.js';
import { hashPassword, passwordPolicyErrors } from '../auth/password.js';
import { notFound, unprocessable } from '../errors.js';
import { authenticate, requireRole } from '../middleware.js';
import {
  createMember,
  findMemberById,
  listMembers,
  toMemberDto,
  updateMember,
} from '../members/repository.js';
import {
  activeInd,
  adminUpdateMemberSchema,
  createMemberSchema,
  parse,
  selfUpdateMemberSchema,
} from '../validation.js';

export const membersRouter = Router();

membersRouter.use(authenticate);

membersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const member = await findMemberById(Number(req.user?.sub));
    if (!member) throw notFound('Member not found');
    res.json(toMemberDto(member));
  }),
);

membersRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const body = parse(selfUpdateMemberSchema, req.body);
    const { craftSkillCodes, ...fields } = body;
    const member = await updateMember(Number(req.user?.sub), fields, craftSkillCodes);
    if (!member) throw notFound('Member not found');
    res.json(toMemberDto(member));
  }),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().min(1).optional(),
  activeInd: activeInd.optional(),
  tierCode: z.enum(['Basic', 'Advanced', 'Lifetime']).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
});

membersRouter.get(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    res.json(await listMembers(parse(listQuerySchema, req.query)));
  }),
);

membersRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = parse(createMemberSchema, req.body);
    const policyErrors = passwordPolicyErrors(body.password);
    if (policyErrors.length > 0) throw unprocessable({ password: policyErrors });

    const { password, ...rest } = body;
    const member = await createMember({
      ...rest,
      passwordHash: await hashPassword(password),
    });
    res.status(201).json(toMemberDto(member));
  }),
);

membersRouter.get(
  '/:memberId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const member = await findMemberById(Number(req.params.memberId));
    if (!member) throw notFound('Member not found');
    res.json(toMemberDto(member));
  }),
);

membersRouter.patch(
  '/:memberId',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = parse(adminUpdateMemberSchema, req.body);
    const { craftSkillCodes, ...fields } = body;
    const member = await updateMember(Number(req.params.memberId), fields, craftSkillCodes);
    if (!member) throw notFound('Member not found');
    res.json(toMemberDto(member));
  }),
);
