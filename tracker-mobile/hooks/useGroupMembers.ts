import { useCallback, useEffect, useState } from 'react';
import { fetchGroupMembers } from '../services/api';

export interface GroupMember {
  deviceId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}

export function useGroupMembers(groupId: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetchGroupMembers(groupId)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { members, loading, refresh };
}
