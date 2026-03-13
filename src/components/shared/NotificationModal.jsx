import React, { useEffect } from 'react';
import ShuffleText from './ShuffleText';

/**
 * NotificationModal
 * Shows a brutalist overlay for alerts, success messages, or errors.
 * @param {string}   title    - Main heading, e.g. "Success!" or "Error"
 * @param {string}   message  - The body text of the alert
 * @param {string}   type     - 'success' | 'error' | 'info' (changes colors)
 * @param {function} onClose  - Called when user dismisses the modal
 */
export default function NotificationModal({ title, message, type = 'info', onClose }) {
    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Determine colors/icons based on type
    const isError = type === 'error';
    const isSuccess = type === 'success';

    const icon = isError ? '⚠' : isSuccess ? '✓' : 'ℹ';
    const accentColor = isError ? '#ff4d4d' : isSuccess ? '#00e676' : '#f7d000';
    const headerTitle = isError ? 'Action Failed' : isSuccess ? 'Success' : 'Notice';

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9000,
                background: 'rgba(10, 25, 47, 0.82)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(2px)',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ position: 'relative' }}
            >
                {/* Brutalist shadow */}
                <div style={{ position: 'absolute', top: 10, left: 10, width: '100%', height: '100%', border: `2px solid ${accentColor}`, zIndex: 0 }} />

                <div style={{
                    position: 'relative', zIndex: 1,
                    background: '#fff', border: '2px solid #000',
                    padding: '2.5rem', maxWidth: 420, width: '90vw',
                    display: 'flex', flexDirection: 'column', gap: '1.25rem',
                }}>
                    {/* Header bar */}
                    <div style={{
                        background: '#0A192F', padding: '0.65rem 1rem',
                        margin: '-2.5rem -2.5rem 0',
                        borderBottom: '2px solid #000',
                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                    }}>
                        <span style={{ fontSize: '1rem', color: accentColor }}>{icon}</span>
                        <span style={{
                            fontFamily: 'Space Mono, monospace', fontSize: '0.68rem',
                            fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.12em', color: accentColor,
                        }}>{headerTitle}</span>
                    </div>

                    <h2 style={{
                        fontFamily: 'var(--font-serif, Georgia, serif)',
                        fontSize: '1.6rem', color: '#0A192F', lineHeight: 1.2, marginTop: '0.5rem',
                    }}>{title}</h2>

                    <p style={{
                        fontFamily: 'Space Mono, monospace', fontSize: '0.84rem',
                        color: '#444', lineHeight: 1.6,
                    }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{
                                fontFamily: 'Space Mono, monospace', fontWeight: 700,
                                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: accentColor, color: '#000',
                                border: '2px solid #000', padding: '0.75rem 1.5rem',
                                cursor: 'pointer', boxShadow: '4px 4px 0 #000',
                                transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 #000'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0 #000'; }}
                        >
                            <ShuffleText text="Dismiss →" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
