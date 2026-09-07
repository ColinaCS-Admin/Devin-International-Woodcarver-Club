import { useEffect, useState } from 'react';
import { request } from '../api/client';
import { useMember } from '../hooks/useMember';
import type { CraftSkill } from '../types';

export function MemberHomePage() {
  const { member, loading, error } = useMember();
  const [allSkills, setAllSkills] = useState<CraftSkill[]>([]);

  useEffect(() => {
    request<CraftSkill[]>('/craft-skills')
      .then(setAllSkills)
      .catch(() => undefined);
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!member) return null;

  const memberSkillCodes = new Set(member.craftSkills.map((skill) => skill.craftSkillCode));

  return (
    <section>
      <h1>Welcome, {member.memberFirstName}</h1>

      <h2>Your crafts and skills</h2>
      {member.craftSkills.length === 0 ? (
        <p className="muted">No craft skills recorded yet.</p>
      ) : (
        <ul className="skill-list">
          {member.craftSkills.map((skill) => (
            <li key={skill.craftSkillCode} className="skill-chip">
              {skill.craftSkillDesc}
            </li>
          ))}
        </ul>
      )}

      <h2>Other crafts practised in the club</h2>
      <ul className="skill-list">
        {allSkills
          .filter((skill) => !memberSkillCodes.has(skill.craftSkillCode))
          .map((skill) => (
            <li key={skill.craftSkillCode} className="skill-chip muted-chip">
              {skill.craftSkillDesc}
            </li>
          ))}
      </ul>
    </section>
  );
}
