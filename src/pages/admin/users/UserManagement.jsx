import React, { useState, useEffect, useMemo } from 'react';
import { UserService } from '../../../services/users';

const ROLE_ORDER = ['User', 'AL2', 'AL1', 'AL0'];

const GROUPS = [
    { type: 'AL0',  title: '👑 Super Admins (AL0)' },
    { type: 'AL1',  title: '🛡️ Editorial Admins (AL1)' },
    { type: 'AL2',  title: '🛡️ Moderator Admins (AL2)' },
    { type: 'Raw',  title: '💻 Registered Users' },
];

function getCurrentRole(groups = []) {
    if (groups.includes('AL0')) return 'AL0';
    if (groups.includes('AL1')) return 'AL1';
    if (groups.includes('AL2')) return 'AL2';
    return 'User';
}

export default function UserManagement({ isAL0 }) {
    const [users, setUsers] = useState([]);
    const [cache, setCache] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (cache.length > 0) {
            setUsers(cache);
        } else {
            fetchUsers();
        }
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const all = await UserService.fetchAll();
            setUsers(all);
            setCache(all);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter(u =>
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.id || '').toLowerCase().includes(q)
        );
    }, [users, search]);

    const handleRoleChange = async (userId, currentGroups, direction) => {
        const current = getCurrentRole(currentGroups);
        const idx = ROLE_ORDER.indexOf(current);
        const nextIdx = direction === 'promote' ? idx + 1 : idx - 1;

        if (nextIdx < 0 || nextIdx >= ROLE_ORDER.length) return;

        const targetRole = ROLE_ORDER[nextIdx];
        if (!window.confirm(`Change this user's role to ${targetRole}?`)) return;

        try {
            await UserService.updateUserRole(userId, targetRole);
            const updatedGroups = targetRole === 'User' ? [] : [targetRole];
            const update = prev => prev.map(u => u.id === userId ? { ...u, groups: updatedGroups } : u);
            setUsers(update);
            setCache(update);
        } catch (err) {
            console.error(err);
            alert('Failed to update user role.');
        }
    };

    return (
        <>
            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#040D1A', border: '2px solid var(--c-yellow)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', outline: 'none', boxShadow: '4px 4px 0 #000' }}
                />
            </div>

            {loading ? (
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading users...</div>
            ) : filteredUsers.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>No users match your search.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {GROUPS.map(group => {
                        const groupUsers = filteredUsers.filter(u => {
                            const g = u.groups || [];
                            if (group.type === 'Raw') return !g.includes('AL0') && !g.includes('AL1') && !g.includes('AL2');
                            return g.includes(group.type);
                        });

                        if (groupUsers.length === 0) return null;

                        return (
                            <div key={group.type}>
                                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--c-yellow)', marginBottom: '1rem', borderBottom: '1px dashed rgba(250,204,21,0.3)', paddingBottom: '0.25rem' }}>
                                    {group.title} — {groupUsers.length}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {groupUsers.map((u, i) => (
                                        <div key={u.id || i} style={{ background: '#0A192F', border: '2px dashed var(--c-yellow)', padding: '1.5rem', color: 'var(--c-white)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                                                    {u.name || 'Anonymous User'}
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#8892b0', marginBottom: '0.5rem' }}>
                                                    {u.email}
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', opacity: 0.4, wordBreak: 'break-all' }}>
                                                    ID: {u.id}
                                                </div>
                                                {(u.groups || []).length > 0 && (
                                                    <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--c-yellow)' }}>
                                                        ROLES: {(u.groups || []).join(', ')}
                                                    </div>
                                                )}
                                            </div>

                                            {isAL0 && (
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(250, 204, 21, 0.1)' }}>
                                                    <button onClick={() => handleRoleChange(u.id, u.groups, 'demote')} style={{ flex: 1, padding: '0.25rem 0.5rem', background: '#1A0B0B', border: '1px solid #EF4444', color: '#FCA5A5', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer' }}>
                                                        ▼ DEMOTE
                                                    </button>
                                                    <button onClick={() => handleRoleChange(u.id, u.groups, 'promote')} style={{ flex: 1, padding: '0.25rem 0.5rem', background: '#0B1A0E', border: '1px solid #22C55E', color: '#86EFAC', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer' }}>
                                                        ▲ PROMOTE
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}