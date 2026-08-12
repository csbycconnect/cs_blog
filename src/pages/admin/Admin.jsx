import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import AnimateOnScroll from '../../components/shared/AnimateOnScroll';
import { useAuth } from '../../context/AuthContext';

import EditorialReview from './blogs/EditorialReview';
import RejectedArticles from './blogs/RejectedArticles';
import ManageBlogs from './blogs/ManageBlogs';
import EventsDashboard from './events/EventsDashboard';
import UserManagement from './users/UserManagement';
import InterviewMail from './interviews/Interviewmail';
import SubmissionCallMail from './mail/SubmissionCallMail'

const TABS = [
    { id: 'review',       label: 'Editorial Review' },
    { id: 'rejected',     label: 'Rejected' },
    { id: 'manage_blogs', label: 'Manage Blogs' },
    { id: 'events',       label: 'Record / Event Entry' },
    { id: 'users',        label: 'User Directory' },
    { id: 'interview_mail', label: 'Interview Mail' },
];

export default function Admin() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('review');

    const groups = user?.groups || [];
    const isAL0 = groups.includes('AL0');
    const isAL1 = groups.includes('AL1');
    const canReviewBlogs = isAL0 || isAL1;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '4rem 2.5rem', width: '100%' }}>
                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>

                    {/* Header */}
                    <div style={{ marginBottom: '2.5rem', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                                Admin Authority<span style={{ color: 'var(--c-yellow)' }}>.</span>
                            </h1>
                            <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                                Secured Dashboard Panel.
                            </p>
                            {groups.length > 0 && (
                                <div style={{ marginTop: '0.5rem', display: 'inline-block', background: 'var(--c-yellow)', color: 'var(--c-black)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, borderRadius: '4px' }}>
                                    {groups.join(', ')} Security Clearance
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'transparent', border: '2px solid var(--c-yellow)', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.6rem 1.2rem', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-yellow)'; e.currentTarget.style.color = 'var(--c-black)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-yellow)'; }}
                        >
                            Logout
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ marginBottom: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    color: activeTab === tab.id ? 'var(--c-yellow)' : 'var(--c-white)',
                                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem',
                                    padding: '0 0.5rem 0.8rem 0.5rem', cursor: 'pointer',
                                    borderBottom: activeTab === tab.id ? '4px solid var(--c-yellow)' : '4px solid transparent',
                                    transition: 'all 0.2s', marginBottom: '-2px'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {activeTab === 'review'       && <EditorialReview canReview={canReviewBlogs} />}
                        {activeTab === 'rejected'     && <RejectedArticles />}
                        {activeTab === 'manage_blogs' && <ManageBlogs isAL0={isAL0} />}
                        {activeTab === 'events'       && <EventsDashboard />}
                        {activeTab === 'users'        && <UserManagement isAL0={isAL0} />}
                        {activeTab === 'interview_mail' && <InterviewMail />}
                        {activeTab == 'SubmissionCallMail' && <SubmissionCallMail isAL0={isAL0} />}
                    </div>

                </AnimateOnScroll>
            </main>
            <Footer />
        </div>
    );
}