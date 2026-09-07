import { useCallback, useEffect, useState } from 'react';
import { request } from '../api/client';
import type { Member } from '../types';

export function useMember() {
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    request<Member>('/members/me')
      .then(setMember)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Unable to load member');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  return { member, setMember, error, loading, reload };
}
