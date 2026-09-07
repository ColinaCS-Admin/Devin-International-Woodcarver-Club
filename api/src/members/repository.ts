import type { PoolClient } from 'pg';
import { pool, query, withTransaction } from '../db.js';

export interface MemberRow {
  member_id: string;
  member_alias: string;
  member_first_name: string;
  member_middle_name: string | null;
  member_last_name: string;
  gender: string;
  preferred_language_code: string | null;
  preferred_language_desc: string | null;
  email_address: string;
  telephone_number_1: string;
  telephone_type_1: string;
  telephone_number_2: string | null;
  telephone_type_2: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postal_code: string | null;
  state_province_code: string;
  state_province_desc: string;
  country_code: string;
  country_desc: string;
  member_tier_code: string;
  member_tier_desc: string;
  active_ind: string;
  craft_skills: { craftSkillCode: string; craftSkillDesc: string }[];
}

const MEMBER_SELECT = `
  SELECT m.member_id,
         m.member_alias,
         m.member_first_name,
         m.member_middle_name,
         m.member_last_name,
         m.gender::text AS gender,
         m.preferred_language_code,
         l.language_desc AS preferred_language_desc,
         m.email_address,
         m.telephone_number_1,
         m.telephone_type_1::text AS telephone_type_1,
         m.telephone_number_2,
         m.telephone_type_2::text AS telephone_type_2,
         m.address_line_1,
         m.address_line_2,
         m.city,
         m.postal_code,
         m.state_province_code,
         sp.state_province_desc,
         m.country_code,
         c.country_desc,
         m.member_tier_code,
         mt.member_tier_desc,
         m.active_ind,
         COALESCE(
           (SELECT json_agg(json_build_object('craftSkillCode', cs.craft_skill_code,
                                              'craftSkillDesc', cs.craft_skill_desc)
                            ORDER BY cs.craft_skill_desc)
              FROM woodcarver.member_craft_skill mcs
              JOIN woodcarver.craft_skill cs ON cs.craft_skill_code = mcs.craft_skill_code
             WHERE mcs.member_id = m.member_id),
           '[]'::json
         ) AS craft_skills
    FROM woodcarver.member m
    JOIN woodcarver.state_province sp ON sp.state_province_code = m.state_province_code
    JOIN woodcarver.country c ON c.country_code = m.country_code
    JOIN woodcarver.membership_tier mt ON mt.member_tier_code = m.member_tier_code
    LEFT JOIN woodcarver.language l ON l.language_code = m.preferred_language_code
`;

export function toMemberDto(row: MemberRow) {
  return {
    memberId: Number(row.member_id),
    memberAlias: row.member_alias,
    memberFirstName: row.member_first_name,
    memberMiddleName: row.member_middle_name,
    memberLastName: row.member_last_name,
    gender: row.gender,
    preferredLanguageCode: row.preferred_language_code,
    preferredLanguageDesc: row.preferred_language_desc,
    emailAddress: row.email_address,
    telephoneNumber1: row.telephone_number_1,
    telephoneType1: row.telephone_type_1,
    telephoneNumber2: row.telephone_number_2,
    telephoneType2: row.telephone_type_2,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    postalCode: row.postal_code,
    stateProvinceCode: row.state_province_code,
    stateProvinceDesc: row.state_province_desc,
    countryCode: row.country_code,
    countryDesc: row.country_desc,
    memberTierCode: row.member_tier_code,
    memberTierDesc: row.member_tier_desc,
    activeInd: row.active_ind,
    craftSkills: row.craft_skills,
  };
}

export async function findMemberById(memberId: number): Promise<MemberRow | undefined> {
  const result = await query<MemberRow>(`${MEMBER_SELECT} WHERE m.member_id = $1`, [memberId]);
  return result.rows[0];
}

export async function findMemberByIdentifier(
  identifier: string,
): Promise<{ member_id: string; member_alias: string; password_hash: string | null; active_ind: string; failed_attempts: number; locked_until: Date | null; roles: string[] } | undefined> {
  const result = await query<{
    member_id: string;
    member_alias: string;
    password_hash: string | null;
    active_ind: string;
    failed_attempts: number;
    locked_until: Date | null;
    roles: string[];
  }>(
    `SELECT m.member_id,
            m.member_alias,
            mc.password_hash,
            m.active_ind,
            COALESCE(mc.failed_attempts, 0) AS failed_attempts,
            mc.locked_until,
            COALESCE(ARRAY(SELECT role_code FROM woodcarver.member_role mr
                            WHERE mr.member_id = m.member_id), '{}') AS roles
       FROM woodcarver.member m
       LEFT JOIN woodcarver.member_credential mc ON mc.member_id = m.member_id
      WHERE lower(m.email_address) = lower($1) OR lower(m.member_alias) = lower($1)`,
    [identifier],
  );
  return result.rows[0];
}

export interface ListMembersParams {
  page: number;
  pageSize: number;
  search?: string;
  activeInd?: string;
  tierCode?: string;
  countryCode?: string;
}

export async function listMembers(params: ListMembersParams) {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    values.push(`%${params.search}%`);
    filters.push(
      `(m.member_first_name ILIKE $${values.length} OR m.member_last_name ILIKE $${values.length}
        OR m.member_alias ILIKE $${values.length} OR m.email_address ILIKE $${values.length})`,
    );
  }
  if (params.activeInd) {
    values.push(params.activeInd);
    filters.push(`m.active_ind = $${values.length}`);
  }
  if (params.tierCode) {
    values.push(params.tierCode);
    filters.push(`m.member_tier_code = $${values.length}`);
  }
  if (params.countryCode) {
    values.push(params.countryCode);
    filters.push(`m.country_code = $${values.length}`);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const totalResult = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM woodcarver.member m ${where}`,
    values,
  );

  values.push(params.pageSize, (params.page - 1) * params.pageSize);
  const rows = await query<MemberRow>(
    `${MEMBER_SELECT} ${where} ORDER BY m.member_last_name, m.member_first_name
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return {
    items: rows.rows.map(toMemberDto),
    total: Number(totalResult.rows[0]?.count ?? 0),
    page: params.page,
    pageSize: params.pageSize,
  };
}

export interface MemberWriteFields {
  memberAlias?: string;
  memberFirstName?: string;
  memberMiddleName?: string | null;
  memberLastName?: string;
  gender?: string;
  preferredLanguageCode?: string | null;
  emailAddress?: string;
  telephoneNumber1?: string;
  telephoneType1?: string;
  telephoneNumber2?: string | null;
  telephoneType2?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  postalCode?: string | null;
  stateProvinceCode?: string;
  countryCode?: string;
  memberTierCode?: string;
  activeInd?: string;
}

const COLUMN_BY_FIELD: Record<keyof MemberWriteFields, string> = {
  memberAlias: 'member_alias',
  memberFirstName: 'member_first_name',
  memberMiddleName: 'member_middle_name',
  memberLastName: 'member_last_name',
  gender: 'gender',
  preferredLanguageCode: 'preferred_language_code',
  emailAddress: 'email_address',
  telephoneNumber1: 'telephone_number_1',
  telephoneType1: 'telephone_type_1',
  telephoneNumber2: 'telephone_number_2',
  telephoneType2: 'telephone_type_2',
  addressLine1: 'address_line_1',
  addressLine2: 'address_line_2',
  city: 'city',
  postalCode: 'postal_code',
  stateProvinceCode: 'state_province_code',
  countryCode: 'country_code',
  memberTierCode: 'member_tier_code',
  activeInd: 'active_ind',
};

// Enum-typed columns need an explicit cast because parameters arrive as text.
const ENUM_TYPE_BY_COLUMN: Record<string, string> = {
  telephone_type_1: 'woodcarver.telephone_type',
  telephone_type_2: 'woodcarver.telephone_type',
  gender: 'woodcarver.gender',
};

interface ColumnBinding {
  columns: string[];
  placeholders: string[];
  values: unknown[];
}

// Turns the set fields into parallel column/placeholder/value lists, so the
// insert and update statements stay in step with COLUMN_BY_FIELD.
function bindColumns(fields: MemberWriteFields): ColumnBinding {
  const binding: ColumnBinding = { columns: [], placeholders: [], values: [] };
  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    const value = fields[field as keyof MemberWriteFields];
    if (value === undefined) continue;
    binding.columns.push(column);
    binding.values.push(value);
    const enumType = ENUM_TYPE_BY_COLUMN[column];
    binding.placeholders.push(
      `$${binding.values.length}${enumType ? `::${enumType}` : ''}`,
    );
  }
  return binding;
}

export async function updateMember(
  memberId: number,
  fields: MemberWriteFields,
  craftSkillCodes?: string[],
): Promise<MemberRow | undefined> {
  return withTransaction(async (client) => {
    const { columns, placeholders, values } = bindColumns(fields);
    const assignments = columns.map((column, index) => `${column} = ${placeholders[index]}`);

    if (assignments.length > 0) {
      values.push(memberId);
      await client.query(
        `UPDATE woodcarver.member SET ${assignments.join(', ')}, updated_at = now()
          WHERE member_id = $${values.length}`,
        values,
      );
    }

    if (craftSkillCodes) {
      await replaceCraftSkills(client, memberId, craftSkillCodes);
    }

    const result = await client.query<MemberRow>(`${MEMBER_SELECT} WHERE m.member_id = $1`, [
      memberId,
    ]);
    return result.rows[0];
  });
}

async function replaceCraftSkills(
  client: PoolClient,
  memberId: number,
  craftSkillCodes: string[],
): Promise<void> {
  await client.query('DELETE FROM woodcarver.member_craft_skill WHERE member_id = $1', [
    memberId,
  ]);
  if (craftSkillCodes.length === 0) return;
  await client.query(
    `INSERT INTO woodcarver.member_craft_skill (member_id, craft_skill_code)
     SELECT $1, unnest($2::text[])`,
    [memberId, craftSkillCodes],
  );
}

export interface CreateMemberInput extends Required<Pick<MemberWriteFields,
  'memberAlias' | 'memberFirstName' | 'memberLastName' | 'gender' | 'emailAddress' |
  'telephoneNumber1' | 'telephoneType1' | 'addressLine1' | 'city' | 'stateProvinceCode' |
  'countryCode' | 'memberTierCode'>> {
  memberMiddleName?: string | null;
  preferredLanguageCode?: string | null;
  telephoneNumber2?: string | null;
  telephoneType2?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  activeInd?: string;
  craftSkillCodes: string[];
  passwordHash: string;
  roles?: string[];
}

export async function createMember(input: CreateMemberInput): Promise<MemberRow> {
  return withTransaction(async (client) => {
    const { craftSkillCodes, passwordHash, roles, ...fields } = input;
    const { columns, placeholders, values } = bindColumns({
      ...fields,
      activeInd: fields.activeInd ?? 'Y',
    });
    const inserted = await client.query<{ member_id: string }>(
      `INSERT INTO woodcarver.member (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING member_id`,
      values,
    );

    const memberId = Number(inserted.rows[0]?.member_id);
    await replaceCraftSkills(client, memberId, craftSkillCodes);
    await client.query(
      `INSERT INTO woodcarver.member_credential (member_id, password_hash) VALUES ($1, $2)`,
      [memberId, passwordHash],
    );
    for (const role of roles ?? ['MEMBER']) {
      await client.query(
        `INSERT INTO woodcarver.member_role (member_id, role_code) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [memberId, role],
      );
    }

    const result = await client.query<MemberRow>(`${MEMBER_SELECT} WHERE m.member_id = $1`, [
      memberId,
    ]);
    return result.rows[0] as MemberRow;
  });
}

export async function closePool(): Promise<void> {
  await pool.end();
}
