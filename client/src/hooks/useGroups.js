import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const { data } = await api.get('/groups');
            return data;
        },
    });
}
export function useGroup(groupId) {
    return useQuery({
        queryKey: ['groups', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}`);
            return data;
        },
        enabled: !!groupId,
    });
}
export function useGroupBalances(groupId) {
    return useQuery({
        queryKey: ['groups', groupId, 'balances'],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}/balances`);
            return data;
        },
        enabled: !!groupId,
    });
}
export function useCreateGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.post('/groups', body);
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    });
}
export function useUpdateGroup(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.put(`/groups/${groupId}`, body);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['groups'] });
            qc.invalidateQueries({ queryKey: ['groups', groupId] });
        },
    });
}
export function useDeleteGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (groupId) => {
            await api.delete(`/groups/${groupId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    });
}
export function useDuplicateGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ groupId, name }) => {
            const { data } = await api.post(`/groups/${groupId}/duplicate`, { name });
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
    });
}
export function useInviteCandidates(groupId, query) {
    return useQuery({
        queryKey: ['groups', groupId, 'invite-candidates', query],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}/invite-candidates`, { params: { q: query } });
            return data;
        },
        enabled: !!groupId,
        staleTime: 30000,
    });
}
export function useInviteMember(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.post(`/groups/${groupId}/invite`, body);
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
    });
}
export function useGroupActivity(groupId) {
    return useQuery({
        queryKey: ['groups', groupId, 'activity'],
        queryFn: async () => {
            const { data } = await api.get(`/groups/${groupId}/activity`);
            return data;
        },
        enabled: !!groupId,
    });
}
export function useSettleMembers(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (body) => {
            const { data } = await api.post(`/groups/${groupId}/settle-members`, body);
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
            qc.invalidateQueries({ queryKey: ['expenses', groupId] });
            qc.invalidateQueries({ queryKey: ['groups', groupId, 'activity'] });
        },
    });
}
export function useRemoveMember(groupId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (memberId) => {
            await api.delete(`/groups/${groupId}/members/${memberId}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
    });
}
