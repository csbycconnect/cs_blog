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

    const groups = user.groups || [];
    const isAdmin = groups.includes('AL0') || groups.includes('AL1') || groups.includes('AL2');

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}
