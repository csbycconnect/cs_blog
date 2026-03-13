import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

const ChromaGrid = ({
    items,
    className = '',
    radius = 300,
    damping = 0.45,
    fadeOut = 0.6,
    ease = 'power3.out'
}) => {
    const rootRef = useRef(null);
    const fadeRef = useRef(null);
    const setX = useRef(null);
    const setY = useRef(null);
    const pos = useRef({ x: 0, y: 0 });
    const navigate = useNavigate();

    const demo = [
        {
            image: 'https://i.pravatar.cc/300?img=8',
            title: 'Dr. Alex Rivera',
            subtitle: 'Professor, Data Science',
            handle: '@alexrivera',
            borderColor: 'var(--c-yellow)',
            gradient: 'linear-gradient(145deg, var(--c-black), #222)',
            url: '#'
        },
        // ... (demo data fallback is ignored when items provided)
    ];

    const data = items?.length ? items : demo;

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        setX.current = gsap.quickSetter(el, '--x', 'px');
        setY.current = gsap.quickSetter(el, '--y', 'px');
        const { width, height } = el.getBoundingClientRect();
        pos.current = { x: width / 2, y: height / 2 };
        setX.current(pos.current.x);
        setY.current(pos.current.y);
    }, []);

    const moveTo = (x, y) => {
        gsap.to(pos.current, {
            x,
            y,
            duration: damping,
            ease,
            onUpdate: () => {
                if (setX.current && setY.current) {
                    setX.current(pos.current.x);
                    setY.current(pos.current.y);
                }
            },
            overwrite: true
        });
    };

    const handleMove = (e) => {
        if (!rootRef.current) return;
        const r = rootRef.current.getBoundingClientRect();
        moveTo(e.clientX - r.left, e.clientY - r.top);
        if (fadeRef.current) gsap.to(fadeRef.current, { opacity: 0, duration: 0.25, overwrite: true });
    };

    const handleLeave = () => {
        if (fadeRef.current) {
            gsap.to(fadeRef.current, {
                opacity: 1,
                duration: fadeOut,
                overwrite: true
            });
        }
    };

    const handleCardClick = (url) => {
        if (url && url !== '#') {
            if (url.startsWith('/')) {
                navigate(url);
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    };

    const handleCardMove = e => {
        const c = e.currentTarget;
        const rect = c.getBoundingClientRect();
        c.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        c.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    };

    // Staggered heights to create a genuine masonry layout effect
    const heights = ['280px', '360px', '240px', '400px', '320px'];

    return (
        <div
            ref={rootRef}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            className={`chroma-masonry ${className}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                '--r': `${radius}px`,
                '--x': '50%',
                '--y': '50%',
                fontFamily: 'var(--font-mono)'
            }}
        >
            <style>{`
                .chroma-masonry {
                    column-count: 1;
                    column-gap: 2rem;
                }
                @media (min-width: 768px) { .chroma-masonry { column-count: 2; } }
                @media (min-width: 1024px) { .chroma-masonry { column-count: 3; } }
                @media (min-width: 1440px) { .chroma-masonry { column-count: 4; } }
                
                .chroma-masonry-item {
                    break-inside: avoid;
                    margin-bottom: 2rem;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    transform: translate(0, 0);
                }
            `}</style>

            {data.map((c, i) => {
                const imgHeight = heights[i % heights.length];

                return (
                    <article
                        key={i}
                        className="chroma-masonry-item"
                        onMouseMove={handleCardMove}
                        onClick={() => handleCardClick(c.url)}
                        style={{
                            background: c.gradient || 'var(--c-black)',
                            border: `2px solid ${c.borderColor || 'var(--c-black)'}`,
                            '--box-shadow-color': 'var(--c-black)',
                            boxShadow: '4px 4px 0 var(--box-shadow-color)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translate(-4px, -4px)';
                            e.currentTarget.style.boxShadow = '8px 8px 0 var(--box-shadow-color)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translate(0, 0)';
                            e.currentTarget.style.boxShadow = '4px 4px 0 var(--box-shadow-color)';
                        }}
                    >

                        {/* Image container with varied height for masonry effect */}
                        <div style={{
                            position: 'relative',
                            zIndex: 10,
                            flex: 'none',
                            height: imgHeight,
                            borderBottom: '2px solid var(--c-black)'
                        }}>
                            <img
                                src={c.image}
                                alt={c.title}
                                loading="lazy"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'top center'
                                }}
                            />
                        </div>

                        {/* Footer text area */}
                        <footer style={{
                            position: 'relative',
                            zIndex: 10,
                            padding: '1rem',
                            backgroundColor: 'var(--c-white)',
                            color: 'var(--c-black)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            flex: 1
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {c.title}
                                </h3>
                                {c.handle && (
                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                        {c.handle}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8 }}>
                                {c.subtitle}
                            </p>
                            {c.location && (
                                <span style={{ fontSize: '0.85rem', opacity: 0.8, alignSelf: 'flex-end' }}>
                                    {c.location}
                                </span>
                            )}
                        </footer>
                    </article>
                );
            })}

        </div>
    );
};

export default ChromaGrid;
