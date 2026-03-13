import React, { useEffect, useRef } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import BackButton from '../components/shared/BackButton';
import ChromaGrid from '../components/shared/ChromaGrid';

// A simple interactive marquee component
const BrutalistMarquee = () => {
    return (
        <div className="marquee-container" style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            backgroundColor: 'var(--c-yellow)',
            borderTop: '2px solid var(--c-black)',
            borderBottom: '2px solid var(--c-black)',
            padding: '1rem 0',
            marginTop: '2rem',
            marginBottom: '3rem',
            transform: 'rotate(-1deg)',
            boxShadow: '4px 4px 0 var(--c-white)'
        }}>
            <div className="marquee-content" style={{
                display: 'inline-block',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                textTransform: 'uppercase',
                color: 'var(--c-black)',
                animation: 'marquee 20s linear infinite'
            }}>
                {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ margin: '0 2rem' }}>
                        CS-CONNECT // COLLABORATION // RESEARCH // INNOVATION //
                    </span>
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};

import facultyDataRaw from '../data/faculty.json';

export default function CSConnect() {
    const brutalistColors = ['var(--c-yellow)', 'var(--c-black)'];

    const facultyData = facultyDataRaw.map((faculty, index) => {
        // Format the name into a URL-friendly slug (e.g., lowercase alphanumeric with dashes)
        const slug = faculty.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        return {
            image: faculty.imagePath.startsWith('http') ? faculty.imagePath : new URL(`../assets/faculty/${faculty.imagePath}`, import.meta.url).href,
            title: faculty.name,
            subtitle: faculty.designation,
            handle: "@christ.cs",
            borderColor: brutalistColors[index % brutalistColors.length],
            gradient: "linear-gradient(145deg, var(--c-white), #eee)",
            url: `/cs-connect/${slug}`
        };
    });

    const ctaRef = useRef(null);
    useEffect(() => {
        const checkMouse = (e) => {
            if (!ctaRef.current) return;
            const rect = ctaRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctaRef.current.style.setProperty('--x', `${x}px`);
            ctaRef.current.style.setProperty('--y', `${y}px`);
        };
        window.addEventListener('mousemove', checkMouse);
        return () => window.removeEventListener('mousemove', checkMouse);
    }, []);

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {/* Removed the flex column property to ensure Navbar spans 100% properly like other pages */}
            <Navbar />

            <main style={{ padding: '0 2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1}>
                    {/* Added px space at the top and bottom with padding */}
                    <div style={{ margin: '40px 0', borderBottom: '2px solid var(--c-white)', paddingTop: '40px', paddingBottom: '40px' }}>
                        <h1 className="serif-heading" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1, textTransform: 'uppercase', color: 'var(--c-white)' }}>
                            CS-Connect<span style={{ color: 'var(--c-yellow)' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', marginTop: '1rem', maxWidth: '600px', color: 'var(--c-white)', opacity: 0.9 }}>
                            Connect with our esteemed faculty members. Discover their specialization, research interests, and get in touch.
                        </p>
                    </div>
                </AnimateOnScroll>

                {/* Interactive Marquee Component */}
                <AnimateOnScroll animationClass="animate-slide-left" delay={0.15}>
                    <BrutalistMarquee />
                </AnimateOnScroll>

                <AnimateOnScroll animationClass="animate-fade" delay={0.2}>
                    <div style={{
                        height: 'auto',
                        minHeight: '800px',
                        position: 'relative',
                        border: '2px solid var(--c-black)',
                        padding: '3rem',
                        backgroundColor: '#f5f5f5', /* Slightly off-white background to contrast with cards */
                        boxShadow: '8px 8px 0 var(--c-white)'
                    }}>
                        <ChromaGrid
                            items={facultyData}
                            radius={400}
                            damping={0.45}
                            fadeOut={0.6}
                            ease="power3.out"
                        />
                    </div>
                </AnimateOnScroll>

                {/* Interactive Contact Section */}
                <AnimateOnScroll animationClass="animate-pop" delay={0.3}>
                    <div
                        ref={ctaRef}
                        className="interactive-cta"
                        style={{
                            margin: '4rem 0',
                            padding: '3rem',
                            backgroundColor: 'var(--c-black)',
                            color: 'var(--c-white)',
                            border: '2px solid var(--c-yellow)',
                            fontFamily: 'var(--font-mono)',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '8px 8px 0 var(--c-white)',
                            cursor: 'crosshair',
                            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.boxShadow = '12px 12px 0 var(--c-yellow)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '8px 8px 0 var(--c-white)';
                        }}
                    >
                        {/* Interactive Spotlight background map tracking mouse */}
                        <div style={{
                            position: 'absolute',
                            top: '-50%', left: '-50%', width: '200%', height: '200%',
                            background: 'radial-gradient(circle 300px at var(--x) var(--y), rgba(247,208,0,0.15), transparent 40%)',
                            pointerEvents: 'none',
                            zIndex: 1
                        }} />

                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--c-yellow)' }}>Join the Network</h2>
                            <p style={{ maxWidth: '800px', lineHeight: 1.6, fontSize: '1.2rem', marginBottom: '2rem' }}>
                                Are you an external professor, researcher, or industry professional looking to collaborate with the CHRIST CS Department?
                                Reach out to our administrative office to explore partnership opportunities.
                            </p>

                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                <button style={{
                                    padding: '1rem 2rem',
                                    backgroundColor: 'var(--c-yellow)',
                                    color: 'var(--c-black)',
                                    border: '2px solid var(--c-white)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '4px 4px 0 var(--c-white)',
                                    transition: 'transform 0.1s, box-shadow 0.1s'
                                }}
                                    onMouseEnter={e => {
                                        e.target.style.transform = 'translate(-4px, -4px)';
                                        e.target.style.boxShadow = '8px 8px 0 var(--c-white)';
                                    }}
                                    onMouseLeave={e => {
                                        e.target.style.transform = 'translate(0, 0)';
                                        e.target.style.boxShadow = '4px 4px 0 var(--c-white)';
                                    }}>
                                    Contact Administration →
                                </button>

                                <button style={{
                                    padding: '1rem 2rem',
                                    backgroundColor: 'transparent',
                                    color: 'var(--c-white)',
                                    border: '2px dashed var(--c-white)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={e => {
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                        e.target.style.borderColor = 'var(--c-yellow)';
                                        e.target.style.color = 'var(--c-yellow)';
                                    }}
                                    onMouseLeave={e => {
                                        e.target.style.backgroundColor = 'transparent';
                                        e.target.style.borderColor = 'var(--c-white)';
                                        e.target.style.color = 'var(--c-white)';
                                    }}>
                                    ✉ Request Info Pack
                                </button>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>

            </main>
            <Footer />
        </div>
    );
}
