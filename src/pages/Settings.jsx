import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import { Settings as SettingsIcon, Bell, Mail, Monitor, Shield } from 'lucide-react';

export default function Settings() {
    const { user, updatePreferences } = useAuth();
    const [showGate, setShowGate] = useState(false);

    // Preferences state (mocked with localStorage)
    const [prefs, setPrefs] = useState({
        emailNewsletter: true,
        dispatchAlerts: false,
        darkModeOption: 'system',
        marketing: false
    });

    useEffect(() => {
        if (!user) {
            setShowGate(true);
            return;
        }
        const savedPrefs = localStorage.getItem(`bb_prefs_${user.sub}`);
        if (savedPrefs) {
            setPrefs(JSON.parse(savedPrefs));
        }
    }, [user]);

    const handleToggle = async (settingKey) => {
        // Create the updated state payload based on your current preferences object
        const currentPrefs = user?.preferences || { emailNewsletter: false, dispatchAlerts: true };

        const nextPrefs = {
            ...currentPrefs,
            [settingKey]: !currentPrefs[settingKey]
        };

        try {
            // 1. Commit the change directly to AWS Cognito attributes
            await updatePreferences(nextPrefs);

            // 2. If ByteBoard Newsletter was flipped to TRUE, fire the instant Welcome Wire!
            if (settingKey === 'emailNewsletter' && nextPrefs.emailNewsletter === true) {
                // Fire-and-forget background fetch so the UI stays snappy
                fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        templateType: 'newsletter_welcome',
                        toEmail: user.email
                    })
                }).catch(err => console.error("Background mail engine lag:", err));
            }
        } catch (error) {
            alert("Failed to sync system preferences to your profile cloud.");
        }
    };

    const handleSelect = (key, value) => {
        const newPrefs = { ...prefs, [key]: value };
        setPrefs(newPrefs);
        if (user) {
            localStorage.setItem(`bb_prefs_${user.sub}`, JSON.stringify(newPrefs));
        }
    }

    if (!user && !showGate) return null;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {showGate && <AuthGateModal action="access settings" onClose={() => { setShowGate(false); window.location.href = '/'; }} />}
            <Navbar />

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2.5rem 5rem', flex: 1, width: '100%' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'var(--c-yellow)', padding: '0.5rem', border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-black)' }}>
                            <SettingsIcon size={32} color="var(--c-black)" />
                        </div>
                        <div>
                            <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
                                Preferences<span style={{ color: 'var(--c-yellow)' }}>.</span>
                            </h1>
                            <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                                Control your ByteBoard experience and notifications.
                            </p>
                        </div>
                    </div>
                </AnimateOnScroll>

                <div style={{ display: 'grid', gap: '2rem' }}>
                    {/* Communications Section */}
                    <AnimateOnScroll animationClass="animate-pop" delay={0.2}>
                        <div style={{
                            backgroundColor: 'var(--c-white)',
                            border: '2px solid var(--c-black)',
                            boxShadow: '6px 6px 0 var(--c-yellow)',
                            padding: '2rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
                                <Mail color="var(--c-black)" />
                                <h2 className="serif-heading" style={{ fontSize: '1.5rem', color: 'var(--c-black)' }}>Communications</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <ToggleRow
                                    title="ByteBoard Newsletter"
                                    description="Receive our monthly digest of the best articles and insights."
                                    checked={prefs.emailNewsletter}
                                    onChange={() => handleToggle('emailNewsletter')}
                                />
                                <ToggleRow
                                    title="Dispatch Alerts"
                                    description="Get notified immediately when new articles are published in CS-Connect."
                                    checked={prefs.dispatchAlerts}
                                    onChange={() => handleToggle('dispatchAlerts')}
                                />
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Appearance Section */}
                    <AnimateOnScroll animationClass="animate-pop" delay={0.3}>
                        <div style={{
                            backgroundColor: 'var(--c-white)',
                            border: '2px solid var(--c-black)',
                            boxShadow: '6px 6px 0 var(--c-black)',
                            padding: '2rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
                                <Monitor color="var(--c-black)" />
                                <h2 className="serif-heading" style={{ fontSize: '1.5rem', color: 'var(--c-black)' }}>Appearance</h2>
                            </div>

                            <div>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                                    Choose your preferred theme for the ByteBoard interface.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <SelectButton
                                        active={prefs.darkModeOption === 'light'}
                                        onClick={() => handleSelect('darkModeOption', 'light')}
                                    >
                                        Light Mode
                                    </SelectButton>
                                    <SelectButton
                                        active={prefs.darkModeOption === 'dark'}
                                        onClick={() => handleSelect('darkModeOption', 'dark')}
                                    >
                                        Dark Mode
                                    </SelectButton>
                                    <SelectButton
                                        active={prefs.darkModeOption === 'system'}
                                        onClick={() => handleSelect('darkModeOption', 'system')}
                                    >
                                        System Default
                                    </SelectButton>
                                </div>
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#888', marginTop: '1rem', fontStyle: 'italic' }}>
                                    * Theme overrides are currently disabled while we enforce the Brutalist aesthetic globally.
                                </p>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Security Section Placeholder */}
                    <AnimateOnScroll animationClass="animate-pop" delay={0.4}>
                        <div style={{
                            backgroundColor: '#f9f9f9',
                            border: '2px dashed #ccc',
                            padding: '2rem',
                            textAlign: 'center'
                        }}>
                            <Shield color="#aaa" size={32} style={{ margin: '0 auto 1rem' }} />
                            <h2 className="serif-heading" style={{ fontSize: '1.25rem', color: '#666' }}>Security & Privacy</h2>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                                Password changes and active sessions are managed via your central Amazon Cognito identity provider.
                            </p>
                        </div>
                    </AnimateOnScroll>
                </div>
            </main>
            <Footer />
        </div>
    );
}

// Reusable toggle switch row
function ToggleRow({ title, description, checked, onChange }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
            <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--c-black)', marginBottom: '0.25rem' }}>{title}</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#666', lineHeight: 1.4 }}>{description}</p>
            </div>

            {/* Custom Brutalist Toggle */}
            <button
                onClick={onChange}
                style={{
                    width: '60px', height: '32px',
                    backgroundColor: checked ? 'var(--c-black)' : '#e0e0e0',
                    border: '2px solid var(--c-black)',
                    borderRadius: '32px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                }}
                aria-pressed={checked}
            >
                <div style={{
                    width: '24px', height: '24px',
                    backgroundColor: checked ? 'var(--c-yellow)' : 'var(--c-white)',
                    border: '2px solid var(--c-black)',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: checked ? '30px' : '2px',
                    transition: 'left 0.2s, background-color 0.2s',
                    boxShadow: '1px 1px 0 rgba(0,0,0,0.5)'
                }} />
            </button>
        </div>
    );
}

// Reusable select button
function SelectButton({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem',
                textTransform: 'uppercase',
                padding: '0.75rem 1.25rem',
                backgroundColor: active ? 'var(--c-black)' : 'var(--c-white)',
                color: active ? 'var(--c-yellow)' : 'var(--c-black)',
                border: '2px solid var(--c-black)',
                boxShadow: active ? 'none' : '4px 4px 0 var(--c-black)',
                transform: active ? 'translate(4px, 4px)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.1s'
            }}
        >
            {children}
        </button>
    );
}
