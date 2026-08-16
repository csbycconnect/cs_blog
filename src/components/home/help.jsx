import React, { useState, useRef } from 'react';

const GUIDE_VIDEO_URL = 'https://blog-assests.s3.eu-north-1.amazonaws.com/Blog-User-Guid-Account-Creation.mp4';

function VideoGuideModal({ isOpen, onClose }) {
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const videoRef = useRef(null);

    if (!isOpen) return null;

    const retry = () => {
        setStatus('loading');
        if (videoRef.current) videoRef.current.load();
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fdf6e3', border: '2px solid var(--c-black)', borderRadius: 8,
                    width: 'min(90vw, 640px)', padding: 16, fontFamily: 'var(--font-mono)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>HOW TO REGISTER — VIDEO GUIDE</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700 }}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ position: 'relative', background: '#000', borderRadius: 4, minHeight: 200 }}>
                    {status === 'loading' && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem'
                        }}>
                            Loading video…
                        </div>
                    )}

                    {status === 'error' ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: '0.8rem' }}>
                            Video failed to load.
                            <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button onClick={retry} style={{ cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
                                <a href={GUIDE_VIDEO_URL} target="_blank" rel="noopener noreferrer">
                                    Open in new tab
                                </a>
                            </div>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            src={GUIDE_VIDEO_URL}
                            controls
                            autoPlay
                            onCanPlay={() => setStatus('ready')}
                            onError={() => setStatus('error')}
                            style={{ width: '100%', display: status === 'ready' ? 'block' : 'none', borderRadius: 4 }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VideoGuideLink({ label = 'Watch guide', style }) {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setShowGuide(true)}
                style={{ background: 'none', border: 'none', padding: 0, color: '#555', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', ...style }}
            >
                {label}
            </button>
            <VideoGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </>
    );
}