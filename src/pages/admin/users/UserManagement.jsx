import React, { useState, useEffect } from 'react';
import { UserService } from '../../../services/users';
import AnimateOnScroll from '../../../components/shared/AnimateOnScroll';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await UserService.fetchAll();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, currentGroups, action) => {
        // Logic to update user roles via UserService
        try {
            await UserService.updateRole(userId, currentGroups, action);
            // Refresh list after change
            fetchUsers();
        } catch (err) {
            console.error("Role update failed:", err);
        }
    };

    if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Users...</div>;

    return (
        <AnimateOnScroll>
            <div className="admin-section" style={{ padding: '2rem' }}>
                <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>User Management</h2>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {users.map(u => (
                        <div key={u.id} style={{ border: '1px solid #333', padding: '1rem', background: '#111' }}>
                            <div style={{ color: 'white' }}>{u.email}</div>
                            <div style={{ color: '#888', fontSize: '0.8rem' }}>Groups: {u.groups?.join(', ')}</div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                <button 
                                    onClick={() => handleRoleChange(u.id, u.groups, 'demote')} 
                                    style={{ background: '#1A0B0B', border: '1px solid #EF4444', color: '#FCA5A5', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                                >
                                    ▼ DEMOTE
                                </button>
                                <button 
                                    onClick={() => handleRoleChange(u.id, u.groups, 'promote')} 
                                    style={{ background: '#0B1A0E', border: '1px solid #22C55E', color: '#86EFAC', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                                >
                                    ▲ PROMOTE
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AnimateOnScroll>
    );
}