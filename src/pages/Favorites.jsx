import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import { Heart } from 'lucide-react';
import ShuffleText from '../components/shared/ShuffleText';
import BackButton from '../components/shared/BackButton';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import { useNavigate } from 'react-router-dom';
import AnimatedList from '../components/blog/AnimatedList';

export default function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showGate, setShowGate] = useState(false);
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const loadFavs = () => {
            const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            setFavorites(favs);
        };
        loadFavs();

        window.addEventListener('storage', loadFavs);
        return () => window.removeEventListener('storage', loadFavs);
    }, []);

    const handleFavorite = (e) => {
        e.preventDefault();
        if (!user) { setShowGate(true); } else { navigate('/blogs'); }
    };

    const handlePostSelect = (post) => {
        if (!user) { setShowGate(true); return; }
        navigate(`/blog/${post.id}`);
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {showGate && <AuthGateModal action="view articles" onClose={() => setShowGate(false)} />}
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2.5rem 5rem', flex: 1, width: '100%' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem' }}>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                            Favorites<span style={{ color: 'var(--c-yellow)' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                            Articles you've saved for later. Connect your account to sync everywhere.
                        </p>
                    </div>
                </AnimateOnScroll>

                {favorites.length === 0 ? (
                    <AnimateOnScroll animationClass="animate-pop" delay={0.2} threshold={0.05}>
                        <div style={{ position: 'relative', maxWidth: '540px', margin: '4rem auto' }}>
                            {/* shadow */}
                            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '100%', height: '100%', border: '2px solid var(--c-yellow)', zIndex: 0 }} />
                            <div style={{
                                position: 'relative', zIndex: 1,
                                backgroundColor: 'var(--c-white)',
                                border: '2px solid var(--c-black)',
                                padding: '3.5rem 2.5rem',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
                                textAlign: 'center',
                            }}>
                                {/* Icon */}
                                <div style={{
                                    width: '72px', height: '72px',
                                    border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-black)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: '#f9f9f9',
                                }}>
                                    <Heart size={32} color="#ff4d4d" strokeWidth={2} />
                                </div>

                                <h2 className="serif-heading" style={{ fontSize: '1.8rem', color: 'var(--c-black)' }}>
                                    No Favorites Yet
                                </h2>

                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#555', lineHeight: 1.6, maxWidth: '340px' }}>
                                    When you save an article using the heart icon, it'll show up here. Start exploring ByteBoard dispatches and save what resonates.
                                </p>

                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                                    <a
                                        href="/blogs"
                                        onClick={handleFavorite}
                                        style={{
                                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem',
                                            textTransform: 'uppercase', textDecoration: 'none',
                                            backgroundColor: 'var(--c-black)', color: 'var(--c-white)',
                                            border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-yellow)',
                                            padding: '0.65rem 1.25rem',
                                        }}
                                    >
                                        <ShuffleText text="Browse Articles →" />
                                    </a>
                                    {!user && (
                                        <a
                                            href="/login"
                                            style={{
                                                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem',
                                                textTransform: 'uppercase', textDecoration: 'none',
                                                backgroundColor: 'var(--c-white)', color: 'var(--c-black)',
                                                border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-black)',
                                                padding: '0.65rem 1.25rem',
                                            }}
                                        >
                                            <ShuffleText text="Login" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>
                ) : (
                    <AnimatedList
                        items={favorites.map(f => ({ ...f, author: f.name || f.author || 'Anonymous' }))}
                        onItemSelect={handlePostSelect}
                        showGradients={false}
                        enableArrowNavigation={true}
                        displayScrollbar={false}
                    />
                )}
            </main>
            <Footer />
        </div>
    );
}
