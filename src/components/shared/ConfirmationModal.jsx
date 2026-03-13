import React, { useEffect } from 'react';
import ShuffleText from './ShuffleText';

/**
 * ConfirmationModal
 * Shows a brutalist overlay to confirm sending the transmission.
 */
export default function ConfirmationModal({ onConfirm, onCancel }) {
    // Close on Escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    return (
        <div
            onClick={onCancel}
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
                <div style={{ position: 'absolute', top: 10, left: 10, width: '100%', height: '100%', border: '2px solid #f7d000', zIndex: 0 }} />

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
                        <span style={{ fontSize: '1rem' }}>✉️</span>
                        <span style={{
                            fontFamily: 'Space Mono, monospace', fontSize: '0.68rem',
                            fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.12em', color: '#f7d000',
                        }}>Confirm Action</span>
                    </div>

                    <h2 style={{
                        fontFamily: 'var(--font-serif, Georgia, serif)',
                        fontSize: '1.6rem', color: '#0A192F', lineHeight: 1.2, marginTop: '0.5rem',
                    }}>Send Message?</h2>

                    <p style={{
                        fontFamily: 'Space Mono, monospace', fontSize: '0.84rem',
                        color: '#444', lineHeight: 1.6,
                    }}>
                        Are you sure you want to send this transmission to the editorial team?
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                            onClick={onConfirm}
                            style={{
                                flex: 1, fontFamily: 'Space Mono, monospace', fontWeight: 700,
                                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: '#f7d000', color: '#000',
                                border: '2px solid #000', padding: '0.75rem 1.5rem',
                                cursor: 'pointer', boxShadow: '4px 4px 0 #000',
                                transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 #000'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0 #000'; }}
                        >
                            <ShuffleText text="Send →" />
                        </button>
                        <button
                            onClick={onCancel}
                            style={{
                                fontFamily: 'Space Mono, monospace', fontWeight: 700,
                                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: 'transparent', color: '#555',
                                border: '2px solid #ccc', padding: '0.75rem 1.25rem',
                                cursor: 'pointer', transition: 'border-color 0.12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#000'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#ccc'}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
