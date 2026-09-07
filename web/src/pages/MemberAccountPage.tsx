import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, request } from '../api/client';
import { useMember } from '../hooks/useMember';
import {
  ACTIVE_IND_LABELS,
  GENDERS,
  type CraftSkill,
  type Gender,
  type Language,
  type Member,
} from '../types';

interface Country {
  countryCode: string;
  countryDesc: string;
}

interface StateProvince {
  stateProvinceCode: string;
  stateProvinceDesc: string;
}

type EditableMember = Pick<
  Member,
  | 'memberFirstName'
  | 'memberMiddleName'
  | 'memberLastName'
  | 'gender'
  | 'preferredLanguageCode'
  | 'emailAddress'
  | 'telephoneNumber1'
  | 'telephoneType1'
  | 'telephoneNumber2'
  | 'telephoneType2'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'postalCode'
  | 'stateProvinceCode'
  | 'countryCode'
> & { craftSkillCodes: string[] };

function toEditable(member: Member): EditableMember {
  return {
    memberFirstName: member.memberFirstName,
    memberMiddleName: member.memberMiddleName,
    memberLastName: member.memberLastName,
    gender: member.gender,
    preferredLanguageCode: member.preferredLanguageCode,
    emailAddress: member.emailAddress,
    telephoneNumber1: member.telephoneNumber1,
    telephoneType1: member.telephoneType1,
    telephoneNumber2: member.telephoneNumber2,
    telephoneType2: member.telephoneType2,
    addressLine1: member.addressLine1,
    addressLine2: member.addressLine2,
    city: member.city,
    postalCode: member.postalCode,
    stateProvinceCode: member.stateProvinceCode,
    countryCode: member.countryCode,
    craftSkillCodes: member.craftSkills.map((skill) => skill.craftSkillCode),
  };
}

export function MemberAccountPage() {
  const { member, setMember, loading, error } = useMember();
  const [form, setForm] = useState<EditableMember | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [stateProvinces, setStateProvinces] = useState<StateProvince[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [skills, setSkills] = useState<CraftSkill[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member && !form) setForm(toEditable(member));
  }, [member, form]);

  useEffect(() => {
    request<Country[]>('/countries').then(setCountries).catch(() => undefined);
    request<Language[]>('/languages').then(setLanguages).catch(() => undefined);
    request<CraftSkill[]>('/craft-skills').then(setSkills).catch(() => undefined);
  }, []);

  const countryCode = form?.countryCode;
  useEffect(() => {
    if (!countryCode) return;
    request<StateProvince[]>(`/countries/${countryCode}/state-provinces`)
      .then(setStateProvinces)
      .catch(() => undefined);
  }, [countryCode]);

  const update = useMemo(
    () =>
      <K extends keyof EditableMember>(key: K, value: EditableMember[K]) => {
        setForm((current) => (current ? { ...current, [key]: value } : current));
      },
    [],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    try {
      const updated = await request<Member>('/members/me', { method: 'PATCH', body: form });
      setMember(updated);
      setForm(toEditable(updated));
      setStatus('Account details saved.');
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors ?? {});
        setStatus(caught.message);
      } else {
        setStatus('Unable to save account details.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!member || !form) return null;

  return (
    <section>
      <h1>Member Account</h1>
      {status && <p className="notice">{status}</p>}

      <form onSubmit={handleSubmit} className="member-form">
        <div className="readonly-grid">
          <div>
            <span className="label">Member ID</span>
            <span>{member.memberId}</span>
          </div>
          <div>
            <span className="label">Member Alias</span>
            <span>{member.memberAlias}</span>
          </div>
          <div>
            <span className="label">Membership Tier</span>
            <span>{member.memberTierDesc}</span>
          </div>
          <div>
            <span className="label">Status</span>
            <span>{ACTIVE_IND_LABELS[member.activeInd]}</span>
          </div>
        </div>

        <Field label="First Name" errors={fieldErrors.memberFirstName}>
          <input
            value={form.memberFirstName}
            onChange={(event) => update('memberFirstName', event.target.value)}
            required
          />
        </Field>

        <Field label="Middle Name" errors={fieldErrors.memberMiddleName}>
          <input
            value={form.memberMiddleName ?? ''}
            onChange={(event) => update('memberMiddleName', event.target.value || null)}
          />
        </Field>

        <Field label="Last Name" errors={fieldErrors.memberLastName}>
          <input
            value={form.memberLastName}
            onChange={(event) => update('memberLastName', event.target.value)}
            required
          />
        </Field>

        <Field label="Gender" errors={fieldErrors.gender}>
          <select
            value={form.gender}
            onChange={(event) => update('gender', event.target.value as Gender)}
          >
            {GENDERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Email Address" errors={fieldErrors.emailAddress}>
          <input
            type="email"
            value={form.emailAddress}
            onChange={(event) => update('emailAddress', event.target.value)}
            required
          />
        </Field>

        <Field label="Telephone Number 1" errors={fieldErrors.telephoneNumber1}>
          <div className="inline">
            <input
              value={form.telephoneNumber1}
              onChange={(event) => update('telephoneNumber1', event.target.value)}
              required
            />
            <select
              aria-label="Telephone Number 1 type"
              value={form.telephoneType1}
              onChange={(event) => update('telephoneType1', event.target.value)}
            >
              <option value="Mobile">Mobile</option>
              <option value="Landline">Landline</option>
            </select>
          </div>
        </Field>

        <Field label="Telephone Number 2" errors={fieldErrors.telephoneNumber2}>
          <div className="inline">
            <input
              value={form.telephoneNumber2 ?? ''}
              onChange={(event) => {
                const value = event.target.value || null;
                update('telephoneNumber2', value);
                update('telephoneType2', value === null ? null : (form.telephoneType2 ?? 'Mobile'));
              }}
            />
            <select
              aria-label="Telephone Number 2 type"
              value={form.telephoneType2 ?? ''}
              disabled={!form.telephoneNumber2}
              onChange={(event) => update('telephoneType2', event.target.value || null)}
            >
              <option value="">—</option>
              <option value="Mobile">Mobile</option>
              <option value="Landline">Landline</option>
            </select>
          </div>
        </Field>

        <Field label="Address Line 1" errors={fieldErrors.addressLine1}>
          <input
            value={form.addressLine1}
            onChange={(event) => update('addressLine1', event.target.value)}
            required
          />
        </Field>

        <Field label="Address Line 2" errors={fieldErrors.addressLine2}>
          <input
            value={form.addressLine2 ?? ''}
            onChange={(event) => update('addressLine2', event.target.value || null)}
          />
        </Field>

        <Field label="City" errors={fieldErrors.city}>
          <input
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
            required
          />
        </Field>

        <Field label="Postal Code" errors={fieldErrors.postalCode}>
          <input
            value={form.postalCode ?? ''}
            onChange={(event) => update('postalCode', event.target.value || null)}
          />
        </Field>

        <Field label="Country" errors={fieldErrors.countryCode}>
          <select
            value={form.countryCode}
            onChange={(event) => {
              update('countryCode', event.target.value);
              update('stateProvinceCode', '');
            }}
          >
            {countries.map((country) => (
              <option key={country.countryCode} value={country.countryCode}>
                {country.countryDesc}
              </option>
            ))}
          </select>
        </Field>

        <Field label="State / Province" errors={fieldErrors.stateProvinceCode}>
          <select
            value={form.stateProvinceCode}
            onChange={(event) => update('stateProvinceCode', event.target.value)}
            required
          >
            <option value="">Select a state or province</option>
            {stateProvinces.map((stateProvince) => (
              <option
                key={stateProvince.stateProvinceCode}
                value={stateProvince.stateProvinceCode}
              >
                {stateProvince.stateProvinceDesc}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Preferred Language" errors={fieldErrors.preferredLanguageCode}>
          <select
            value={form.preferredLanguageCode ?? ''}
            onChange={(event) => update('preferredLanguageCode', event.target.value || null)}
          >
            <option value="">No preference</option>
            {languages.map((language) => (
              <option key={language.languageCode} value={language.languageCode}>
                {language.languageDesc}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Craft Skills" errors={fieldErrors.craftSkillCodes}>
          <div className="checkbox-grid">
            {skills.map((skill) => (
              <label key={skill.craftSkillCode} className="checkbox">
                <input
                  type="checkbox"
                  checked={form.craftSkillCodes.includes(skill.craftSkillCode)}
                  onChange={(event) =>
                    update(
                      'craftSkillCodes',
                      event.target.checked
                        ? [...form.craftSkillCodes, skill.craftSkillCode]
                        : form.craftSkillCodes.filter((code) => code !== skill.craftSkillCode),
                    )
                  }
                />
                {skill.craftSkillDesc}
              </label>
            ))}
          </div>
        </Field>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {errors?.map((message) => (
        <span key={message} className="error">
          {message}
        </span>
      ))}
    </label>
  );
}
