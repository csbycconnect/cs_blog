import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import { User, LogOut, ShieldAlert, Edit2, Check, X } from 'lucide-react';

export default function Account() {
    const { user, logout, updateBio } = useAuth();
    const [showGate, setShowGate] = useState(false);

    // Bio editing state
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioText, setBioText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) {
            setShowGate(true);
        } else {
            setBioText(user.bio || '');
        }
    }, [user]);

    const handleSaveBio = async () => {
        setIsSaving(true);
        try {
            await updateBio(bioText);
            setIsEditingBio(false);
        } catch (err) {
            alert('Failed to update biography. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!user && !showGate) return null;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {showGate && <AuthGateModal action="access your account" onClose={() => { setShowGate(false); window.location.href = '/'; }} />}
            <Navbar />

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2.5rem 5rem', flex: 1, width: '100%' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: '#f7d000', padding: '0.5rem', border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-black)' }}>
                            <User size={32} color="var(--c-black)" />
                        </div>
                        <div>
                            <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
                                Identity Profile<span style={{ color: 'var(--c-yellow)' }}>.</span>
                            </h1>
                            <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                                Manage your public persona and account information.
                            </p>
                        </div>
                    </div>
                </AnimateOnScroll>

                {user && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '2rem', alignItems: 'start' }}>

                        {/* Left Column: Identity details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <AnimateOnScroll animationClass="animate-pop" delay={0.2}>
                                <div style={{
                                    backgroundColor: 'var(--c-white)',
                                    border: '2px solid var(--c-black)',
                                    boxShadow: '6px 6px 0 var(--c-yellow)',
                                    padding: '2.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2rem'
                                }}>
                                    {/* Header with Avatar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '2px dashed #ccc', paddingBottom: '2rem' }}>
                                        <div style={{
                                            width: '96px', height: '96px',
                                            borderRadius: '50%',
                                            border: '3px solid var(--c-black)',
                                            boxShadow: '4px 4px 0 var(--c-black)',
                                            overflow: 'hidden',
                                            background: '#0A192F',
                                            flexShrink: 0
                                        }}>
                                            <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div>
                                            <h2 className="serif-heading" style={{ fontSize: '2rem', color: 'var(--c-black)', lineHeight: 1.1 }}>{user.name}</h2>
                                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: '#555', marginTop: '0.25rem' }}>{user.email}</p>

                                            {/* Role Badge */}
                                            <div style={{
                                                display: 'inline-block',
                                                marginTop: '0.75rem',
                                                padding: '0.25rem 0.6rem',
                                                background: user.role && user.role !== 'student' ? 'var(--c-black)' : '#e0e0e0',
                                                color: user.role && user.role !== 'student' ? 'var(--c-yellow)' : '#333',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                border: '1px solid var(--c-black)'
                                            }}>
                                                {user.role} Privilege
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable Biography Section */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-black)' }}>Public Biography</h3>
                                            {!isEditingBio && (
                                                <button
                                                    onClick={() => setIsEditingBio(true)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', background: 'none', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    <Edit2 size={14} /> EDIT
                                                </button>
                                            )}
                                        </div>

                                        {isEditingBio ? (
                                            <div style={{ position: 'relative' }}>
                                                <textarea
                                                    value={bioText}
                                                    onChange={(e) => setBioText(e.target.value)}
                                                    disabled={isSaving}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '120px',
                                                        padding: '1rem',
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: '0.9rem',
                                                        lineHeight: 1.5,
                                                        border: '2px solid var(--c-black)',
                                                        backgroundColor: '#f9f9f9',
                                                        resize: 'vertical',
                                                        outline: 'none',
                                                        color: 'var(--c-black)'
                                                    }}
                                                    placeholder="Tell the community about your interests and background..."
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                                    <button
                                                        onClick={() => { setIsEditingBio(false); setBioText(user.bio || ''); }}
                                                        disabled={isSaving}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '2px solid #ccc', background: 'var(--c-white)', color: '#666', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                                    >
                                                        <X size={14} /> CANCEL
                                                    </button>
                                                    <button
                                                        onClick={handleSaveBio}
                                                        disabled={isSaving}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', border: '2px solid var(--c-black)', background: 'var(--c-black)', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', cursor: isSaving ? 'wait' : 'pointer' }}
                                                    >
                                                        <Check size={14} /> {isSaving ? 'SAVING...' : 'SAVE RECORD'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                backgroundColor: '#f4f4f4',
                                                border: '1px dashed #aaa',
                                                padding: '1.25rem',
                                                minHeight: '80px'
                                            }}>
                                                {user.bio ? (
                                                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{user.bio}</p>
                                                ) : (
                                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#888', fontStyle: 'italic', margin: 0 }}>
                                                        No biography found. Edit to add one.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AnimateOnScroll>
                        </div>

                        {/* Right Column: Actions sidepanel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <AnimateOnScroll animationClass="animate-pop" delay={0.3}>
                                <div style={{
                                    backgroundColor: 'var(--c-white)',
                                    border: '2px solid var(--c-black)',
                                    boxShadow: '4px 4px 0 var(--c-black)',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--c-black)', borderBottom: '2px solid #eee', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>Active Session</h3>

                                    <button
                                        onClick={() => { logout(); window.location.href = '/'; }}
                                        style={{
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                            width: '100%',
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--c-black)',
                                            color: 'var(--c-white)',
                                            border: '2px solid var(--c-black)',
                                            fontFamily: 'var(--font-mono)',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s, box-shadow 0.1s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translate(-2px, -2px)';
                                            e.currentTarget.style.boxShadow = '3px 3px 0 var(--c-yellow)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <LogOut size={16} /> Disconnect
                                    </button>
                                </div>
                            </AnimateOnScroll>

                            <AnimateOnScroll animationClass="animate-pop" delay={0.4}>
                                <div style={{
                                    backgroundColor: '#fff0f0',
                                    border: '2px dashed #ff4d4d',
                                    padding: '1.5rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <ShieldAlert color="#ff4d4d" size={20} />
                                        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#c53030' }}>Danger Zone</h3>
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#888', marginBottom: '1rem', lineHeight: 1.4 }}>
                                        Account deletion is currently managed centrally via the university administration portal.
                                    </p>
                                    <button disabled style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: 'transparent',
                                        color: '#ff4d4d',
                                        border: '1.5px solid #ff4d4d',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        cursor: 'not-allowed',
                                        opacity: 0.6
                                    }}>
                                        Request Deletion
                                    </button>
                                </div>
                            </AnimateOnScroll>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
