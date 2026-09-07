import { z } from 'zod';
import { unprocessable } from './errors.js';

export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      (errors[key] ??= []).push(issue.message);
    }
    throw unprocessable(errors);
  }
  return result.data;
}

export const telephoneType = z.enum(['Mobile', 'Landline']);
export const activeInd = z.enum(['Y', 'N', 'S']);

export const memberProfileSchema = z.object({
  memberFirstName: z.string().min(1).max(50),
  memberMiddleName: z.string().max(50).nullish(),
  memberLastName: z.string().min(1).max(50),
  emailAddress: z.string().email().max(254),
  telephoneNumber1: z.string().min(3).max(20),
  telephoneType1: telephoneType,
  telephoneNumber2: z.string().min(3).max(20).nullish(),
  telephoneType2: telephoneType.nullish(),
  addressLine1: z.string().min(1).max(100),
  addressLine2: z.string().max(100).nullish(),
  stateProvinceCode: z.string().regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  craftSkillCodes: z.array(z.string().min(1)).min(1),
});

export const createMemberSchema = memberProfileSchema.extend({
  memberAlias: z.string().min(3).max(50),
  memberTierCode: z.enum(['Basic', 'Advanced', 'Lifetime']),
  activeInd: activeInd.optional(),
  password: z.string().min(12).max(128),
  roles: z.array(z.enum(['MEMBER', 'ADMIN'])).optional(),
});

export const adminUpdateMemberSchema = memberProfileSchema
  .extend({
    memberAlias: z.string().min(3).max(50),
    memberTierCode: z.enum(['Basic', 'Advanced', 'Lifetime']),
    activeInd,
  })
  .partial();

export const selfUpdateMemberSchema = memberProfileSchema.partial();
