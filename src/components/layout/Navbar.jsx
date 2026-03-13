import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on navigation
    useEffect(() => { 
        setDropdownOpen(false); 
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="top-nav-container" style={{ position: 'relative', zIndex: 9999, flexShrink: 0, width: '100%' }}>
            <div className="nav-shadow"></div>
            <nav className="brutal-navbar">
                <div className="logo-container">
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                        <img src="https://raw.githubusercontent.com/csbycconnect/blog_assests_cs_byc_connect_anjk/8cf58d9c3054eaf6df116959b0b8ce4411fe1fa7/logo/christ-logo-black.png" alt="CHRIST University Logo" style={{ height: '55px', objectFit: 'contain' }} fetchpriority="high" decoding="async" />
                    </Link>
                </div>

                <div className="nav-links">
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
                    <Link to="/blogs" className={location.pathname.startsWith('/blogs') ? 'active' : ''}>Blog</Link>
                    <Link to="/events" className={location.pathname.startsWith('/events') ? 'active' : ''}>Events</Link>
                    <Link to="/cs-connect" className={location.pathname.startsWith('/cs-connect') ? 'active' : ''}>CS-Connect</Link>
                </div>

                {/* ── Profile / Login area ─────────────────────────────── */}
                <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {user ? (
                        <>
                            {/* Avatar button */}
                            <button
                                onClick={() => setDropdownOpen(v => !v)}
                                title={user.name}
                                style={{
                                    width: 38, height: 38,
                                    borderRadius: '50%',
                                    border: `2px solid ${dropdownOpen ? 'var(--c-yellow)' : 'rgba(255,255,255,0.35)'}`,
                                    padding: 0, cursor: 'pointer', overflow: 'hidden',
                                    background: '#0A192F',
                                    boxShadow: dropdownOpen ? '0 0 0 3px rgba(247,208,0,0.3)' : 'none',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                    flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                aria-expanded={dropdownOpen}
                                aria-haspopup="true"
                            >
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </button>

                            {/* Dropdown */}
                            {dropdownOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                    width: 230,
                                    background: '#fff',
                                    border: '2px solid #000',
                                    boxShadow: '6px 6px 0 #f7d000',
                                    zIndex: 9999,
                                    animation: 'fadeSlideDown 0.15s ease',
                                }}>
                                    {/* User info header */}
                                    <div style={{
                                        background: '#0A192F', padding: '0.85rem 1rem',
                                        borderBottom: '2px solid #000',
                                        display: 'flex', alignItems: 'center', gap: '0.65rem',
                                    }}>
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid #f7d000', flexShrink: 0 }}
                                        />
                                        <div>
                                            <div style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, fontSize: '0.82rem', color: '#f7d000', lineHeight: 1.2 }}>
                                                {user.name}
                                            </div>
                                            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, marginTop: 2 }}>
                                                {user.email}
                                            </div>
                                            {user.role && user.role !== 'student' && (
                                                <div style={{
                                                    display: 'inline-block',
                                                    marginTop: '4px',
                                                    padding: '2px 6px',
                                                    background: 'var(--c-yellow)',
                                                    color: 'var(--c-black)',
                                                    fontFamily: 'Space Mono, monospace',
                                                    fontSize: '0.55rem',
                                                    fontWeight: 700,
                                                    borderRadius: '3px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {user.role} Admin
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    {[
                                        { label: 'Your Blogs', icon: '📝', action: () => navigate('/your-blogs') },
                                        { label: 'Account Details', icon: '👤', action: () => navigate('/account') },
                                        ...(user.role && user.role !== 'student'
                                            ? [{ label: 'Admin Dashboard', icon: '🛡️', action: () => navigate('/admin') }]
                                            : []),
                                        { label: 'Settings', icon: '⚙️', action: () => navigate('/settings') },
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            onClick={() => { item.action(); setDropdownOpen(false); }}
                                            style={{
                                                width: '100%', textAlign: 'left',
                                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                fontFamily: 'Space Mono, monospace', fontSize: '0.78rem', fontWeight: 700,
                                                color: '#0A192F', background: 'none',
                                                border: 'none', borderBottom: '1.5px solid #f0f0f0',
                                                padding: '0.75rem 1rem', cursor: 'pointer',
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <span>{item.icon}</span>
                                            {item.label}
                                        </button>
                                    ))}

                                    {/* Logout — red */}
                                    <button
                                        onClick={() => { logout(); setDropdownOpen(false); }}
                                        style={{
                                            width: '100%', textAlign: 'left',
                                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            fontFamily: 'Space Mono, monospace', fontSize: '0.78rem', fontWeight: 700,
                                            color: '#c53030', background: 'none',
                                            border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        <span>🚪</span>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Not logged in — show Login and Register links */
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <Link
                                to="/login"
                                style={{
                                    fontFamily: 'Space Mono, monospace', fontWeight: 700,
                                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                                    color: 'var(--c-white)', textDecoration: 'none',
                                    background: 'transparent',
                                    padding: '0.35rem 0',
                                    transition: 'all 0.1s',
                                    borderBottom: '2px solid transparent'
                                }}
                                onMouseEnter={e => e.target.style.borderBottom = '2px solid var(--c-yellow)'}
                                onMouseLeave={e => e.target.style.borderBottom = '2px solid transparent'}
                            >
                                Login
                            </Link>
                            <Link
                                to="/login?register=true"
                                style={{
                                    fontFamily: 'Space Mono, monospace', fontWeight: 700,
                                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                                    color: 'var(--c-black)', textDecoration: 'none',
                                    background: 'var(--c-yellow)', border: '2px solid var(--c-black)',
                                    padding: '0.35rem 0.85rem',
                                    boxShadow: '3px 3px 0 #000',
                                    transition: 'all 0.1s',
                                }}
                                onMouseEnter={e => {
                                    e.target.style.transform = 'translate(-2px, -2px)';
                                    e.target.style.boxShadow = '5px 5px 0 #000';
                                }}
                                onMouseLeave={e => {
                                    e.target.style.transform = 'translate(0, 0)';
                                    e.target.style.boxShadow = '3px 3px 0 #000';
                                }}
                            >
                                Register
                            </Link>
                        </div>
                    )}

                    {/* Mobile Hamburger Toggle */}
                    <button 
                        className="mobile-menu-btn"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                            background: 'var(--c-yellow)',
                            border: '2px solid var(--c-black)',
                            boxShadow: '2px 2px 0 var(--c-black)',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            marginLeft: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-black)" strokeWidth="2" strokeLinecap="square">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </nav>

            {/* Mobile Dropdown Menu rendered absolutely */}
            {mobileMenuOpen && (
                <div className="mobile-nav-dropdown" style={{
                    position: 'absolute', top: '100%', left: 0, width: '100%',
                    background: 'var(--c-white)', borderBottom: '2px solid var(--c-black)',
                    borderLeft: '2px solid var(--c-black)', borderRight: '2px solid var(--c-black)',
                    display: 'flex', flexDirection: 'column', 
                    zIndex: 9998,
                    animation: 'fadeSlideDown 0.15s ease'
                }}>
                    <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--c-black)', textDecoration: 'none', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>Home</Link>
                    <Link to="/blogs" onClick={() => setMobileMenuOpen(false)} style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--c-black)', textDecoration: 'none', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>Blog</Link>
                    <Link to="/events" onClick={() => setMobileMenuOpen(false)} style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--c-black)', textDecoration: 'none', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>Events</Link>
                    <Link to="/cs-connect" onClick={() => setMobileMenuOpen(false)} style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--c-black)', textDecoration: 'none' }}>CS-Connect</Link>
                </div>
            )}

            {/* Keyframe for dropdown animation */}
            <style>{`
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
