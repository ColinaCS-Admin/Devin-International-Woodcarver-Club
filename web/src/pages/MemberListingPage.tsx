import { useCallback, useEffect, useState } from 'react';
import { request } from '../api/client';
import { ACTIVE_IND_LABELS, type Member, type MemberPage } from '../types';

const PAGE_SIZE = 25;

export function MemberListingPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeInd, setActiveInd] = useState('');
  const [data, setData] = useState<MemberPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    request<MemberPage>('/members', {
      query: { page, pageSize: PAGE_SIZE, search: search || undefined, activeInd: activeInd || undefined },
    })
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Unable to load members');
      })
      .finally(() => setLoading(false));
  }, [page, search, activeInd]);

  useEffect(load, [load]);

  async function changeStatus(memberId: number, nextActiveInd: string) {
    await request<Member>(`/members/${memberId}`, {
      method: 'PATCH',
      body: { activeInd: nextActiveInd },
    });
    load();
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section>
      <h1>Member Listing</h1>

      <div className="filters">
        <label className="field">
          <span className="label">Search</span>
          <input
            value={search}
            placeholder="Name, alias or email"
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </label>
        <label className="field">
          <span className="label">Status</span>
          <select
            value={activeInd}
            onChange={(event) => {
              setPage(1);
              setActiveInd(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="Y">Active</option>
            <option value="N">Not Active</option>
            <option value="S">Suspended</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Alias</th>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Last Name</th>
              <th>Gender</th>
              <th>Preferred Language</th>
              <th>Email</th>
              <th>Telephone 1</th>
              <th>Telephone 2</th>
              <th>Address Line 1</th>
              <th>Address Line 2</th>
              <th>City</th>
              <th>Postal Code</th>
              <th>State / Province</th>
              <th>Country</th>
              <th>Craft Skills</th>
              <th>Tier</th>
              <th>Active Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((member) => (
              <tr key={member.memberId}>
                <td>{member.memberId}</td>
                <td>{member.memberAlias}</td>
                <td>{member.memberFirstName}</td>
                <td>{member.memberMiddleName ?? '—'}</td>
                <td>{member.memberLastName}</td>
                <td>{member.gender}</td>
                <td>{member.preferredLanguageDesc ?? '—'}</td>
                <td>{member.emailAddress}</td>
                <td>
                  {member.telephoneNumber1} ({member.telephoneType1})
                </td>
                <td>
                  {member.telephoneNumber2
                    ? `${member.telephoneNumber2} (${member.telephoneType2})`
                    : '—'}
                </td>
                <td>{member.addressLine1}</td>
                <td>{member.addressLine2 ?? '—'}</td>
                <td>{member.city}</td>
                <td>{member.postalCode ?? '—'}</td>
                <td>{member.stateProvinceDesc}</td>
                <td>{member.countryDesc}</td>
                <td>{member.craftSkills.map((skill) => skill.craftSkillDesc).join(', ')}</td>
                <td>{member.memberTierDesc}</td>
                <td>
                  <select
                    aria-label={`Active status for ${member.memberAlias}`}
                    value={member.activeInd}
                    onChange={(event) => {
                      void changeStatus(member.memberId, event.target.value);
                    }}
                  >
                    {Object.entries(ACTIVE_IND_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages} ({data?.total ?? 0} members)
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}
