export interface CraftSkill {
  craftSkillCode: string;
  craftSkillDesc: string;
}

/** ISO 639-2 language; languageCode is the bibliographic (639-2/B) code. */
export interface Language {
  languageCode: string;
  languageDesc: string;
}

export const GENDERS = ['Male', 'Female', 'Do Not Wish To Disclose'] as const;

export type Gender = (typeof GENDERS)[number];

export interface Member {
  memberId: number;
  memberAlias: string;
  memberFirstName: string;
  memberMiddleName: string | null;
  memberLastName: string;
  gender: Gender;
  preferredLanguageCode: string | null;
  preferredLanguageDesc: string | null;
  emailAddress: string;
  telephoneNumber1: string;
  telephoneType1: string;
  telephoneNumber2: string | null;
  telephoneType2: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string | null;
  stateProvinceCode: string;
  stateProvinceDesc: string;
  countryCode: string;
  countryDesc: string;
  memberTierCode: string;
  memberTierDesc: string;
  activeInd: 'Y' | 'N' | 'S';
  craftSkills: CraftSkill[];
}

export interface MemberPage {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

export const ACTIVE_IND_LABELS: Record<Member['activeInd'], string> = {
  Y: 'Active',
  N: 'Not Active',
  S: 'Suspended',
};
