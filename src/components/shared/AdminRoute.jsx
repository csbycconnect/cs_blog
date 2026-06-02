import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>Authenticating...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const rawGroups = user.groups;
    const groups = Array.isArray(rawGroups) ? rawGroups : rawGroups ? [rawGroups] : [];
    const isAdmin = groups.some(g => ['AL0', 'AL1', 'AL2'].includes(String(g))) ||
                    groups.some(g => /admin/i.test(String(g))) ||
                    /admin/i.test(String(user.role || '')) ||
                    (user.role && user.role !== 'student');

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}
