import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer style={{
            position: 'relative',
            zIndex: 10,
            backgroundColor: 'var(--c-black)',
            color: 'var(--c-white)',
            padding: '4rem 2rem',
            borderTop: '2px solid var(--c-yellow)',
            fontFamily: 'var(--font-mono)'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem' }}>

                {/* Brand / Logo Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/8cf58d9c3054eaf6df116959b0b8ce4411fe1fa7/logo/christ-logo.png" alt="CHRIST University Logo" style={{ height: '60px', objectFit: 'contain', backgroundColor: '#000000ff', padding: '5px', borderRadius: '4px' }} />
                    </div>
                    <p style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Department of Computer Science<br />
                        Yeshwanthpur Campus
                    </p>
                </div>

                {/* Quick Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, color: '#f7d000', fontSize: '1.2rem', textTransform: 'uppercase' }}>Quick Links</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link to="/" style={{ color: '#fff9db', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#f7d000'} onMouseLeave={e => e.target.style.color = '#fff9db'}>Home</Link>
                        <Link to="/blogs" style={{ color: '#fff9db', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#f7d000'} onMouseLeave={e => e.target.style.color = '#fff9db'}>Blogs</Link>
                        <Link to="/gallery" style={{ color: '#fff9db', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#f7d000'} onMouseLeave={e => e.target.style.color = '#fff9db'}>Gallery</Link>
                        <Link to="/cs-connect" style={{ color: '#fff9db', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#f7d000'} onMouseLeave={e => e.target.style.color = '#fff9db'}>CS-Connect</Link>
                    </div>
                </div>

                {/* Designed By & Scroll */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--c-yellow)', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '1rem' }}>Designed By</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Vishnu S, Naveen and Joel</p>
                    </div>

                    <button
                        onClick={scrollToTop}
                        style={{
                            background: 'transparent',
                            color: 'var(--c-yellow)',
                            border: '2px solid var(--c-yellow)',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.target.style.background = 'var(--c-yellow)';
                            e.target.style.color = 'var(--c-black)';
                        }}
                        onMouseLeave={e => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'var(--c-yellow)';
                        }}
                    >
                        Scroll to Top <span>↑</span>
                    </button>
                </div>

            </div>

            <div style={{
                marginTop: '4rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'center'
            }}>
                <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.8, color: 'var(--c-yellow)' }}>
                    "Bugs are just undocumented features waiting to be discovered."
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <a href="#" style={{ color: 'var(--c-white)', textDecoration: 'none', opacity: 0.7 }}>INSTA</a>
                    <a href="#" style={{ color: 'var(--c-white)', textDecoration: 'none', opacity: 0.7 }}>MAIL</a>
                </div>
                <p style={{ margin: 0, opacity: 0.5, fontSize: '0.8rem' }}>
                    © 2026 BYTEBOARD. ALL RIGHTS RESERVED. STAY RAW.
                </p>
            </div>
        </footer>
    );
}
