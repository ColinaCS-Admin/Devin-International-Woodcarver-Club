export interface CraftSkill {
  craftSkillCode: string;
  craftSkillDesc: string;
}

export interface Member {
  memberId: number;
  memberAlias: string;
  memberFirstName: string;
  memberMiddleName: string | null;
  memberLastName: string;
  emailAddress: string;
  telephoneNumber1: string;
  telephoneType1: string;
  telephoneNumber2: string | null;
  telephoneType2: string | null;
  addressLine1: string;
  addressLine2: string | null;
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
