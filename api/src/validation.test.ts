import { describe, expect, it } from 'vitest';
import { HttpError } from './errors.js';
import { createMemberSchema, parse, selfUpdateMemberSchema } from './validation.js';

const validMember = {
  memberAlias: 'chisel_jane',
  memberFirstName: 'Jane',
  memberLastName: 'Oakes',
  emailAddress: 'jane@woodcarvers.example',
  telephoneNumber1: '+1-555-0101',
  telephoneType1: 'Mobile',
  addressLine1: '2 Workshop Lane',
  city: 'Portland',
  postalCode: '97205',
  stateProvinceCode: 'US-OR',
  countryCode: 'US',
  memberTierCode: 'Advanced',
  craftSkillCodes: ['RELIEF'],
  password: 'Woodcarver!2026',
};

describe('createMemberSchema', () => {
  it('accepts a complete member', () => {
    expect(parse(createMemberSchema, validMember).memberAlias).toBe('chisel_jane');
  });

  it('rejects an ISO 3166-1 code in the state/province field', () => {
    expect(() => parse(createMemberSchema, { ...validMember, stateProvinceCode: 'US' })).toThrow(
      HttpError,
    );
  });

  it('requires a city', () => {
    expect(() => parse(createMemberSchema, { ...validMember, city: '' })).toThrow(HttpError);
  });

  it('requires at least one craft skill', () => {
    expect(() => parse(createMemberSchema, { ...validMember, craftSkillCodes: [] })).toThrow(
      HttpError,
    );
  });

  it('reports validation failures per field', () => {
    try {
      parse(createMemberSchema, { ...validMember, emailAddress: 'nope', countryCode: 'usa' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(Object.keys((error as HttpError).errors ?? {})).toEqual([
        'emailAddress',
        'countryCode',
      ]);
    }
  });
});

describe('selfUpdateMemberSchema', () => {
  it('allows a partial update', () => {
    expect(parse(selfUpdateMemberSchema, { addressLine2: 'Unit 4' })).toEqual({
      addressLine2: 'Unit 4',
    });
  });

  it('does not accept administrative fields', () => {
    expect(parse(selfUpdateMemberSchema, { activeInd: 'N' })).toEqual({});
  });
});
