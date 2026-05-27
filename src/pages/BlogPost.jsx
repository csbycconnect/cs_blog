import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticlesService } from '../services/articles';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Heart, Bookmark } from 'lucide-react';

export default function BlogPost() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    const viewCounted = useRef(false);

    useEffect(() => {
        const loadArticle = async () => {
            try {
                setLoading(true);
                if (!id) return;

                // 1. Strip down parameter prefixes if present
                let cleanId = id.replace('id=', '');

                // 2. ✅ FIXED: Encode the ID to safely pass characters like '#' over the API route
                const encodedId = encodeURIComponent(cleanId);

                const data = await ArticlesService.getById(encodedId);
                if (!data) {
                    alert('Article transmission not found.');
                    navigate('/blogs');
                    return;
                }
                setArticle(data);

                // Track view on every load, protected by ref
                if (!viewCounted.current) {
                    viewCounted.current = true;
                    await ArticlesService.incrementViews(cleanId).catch(console.error);
                }
            } catch (error) {
                console.error("Error loading article:", error);
                alert('Failed to load article.');
                navigate('/blogs');
            } finally {
                setLoading(false);
            }
        };
        loadArticle();
    }, [id, navigate]);

    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    useEffect(() => {
        if (article) {
            const cleanId = article.id;
            const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            setIsFavorite(favs.some(f => f.id === cleanId));

            // Simple boolean check for demo purposes, extending localStorage:
            const localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
            setHasLiked(localLikes.includes(cleanId));

            setLikesCount(article.likes || 0);
        }
    }, [article]);

    const handleLikeClick = async () => {
        if (!user) {
            alert('Please log in to like articles.');
            return;
        }

        const cleanId = article.id;
        const newLiked = !hasLiked;
        setHasLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            await ArticlesService.toggleLike(cleanId, newLiked);

            // Update local likes state
            let localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
            if (newLiked) {
                if (!localLikes.includes(cleanId)) localLikes.push(cleanId);
            } else {
                localLikes = localLikes.filter(lId => lId !== cleanId);
            }
            localStorage.setItem('bb_likes', JSON.stringify(localLikes));

            // Sync with favorites array if it's currently in there so counts stay fresh
            let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            const favIndex = favs.findIndex(f => f.id === cleanId);
            if (favIndex > -1) {
                favs[favIndex].likes = newLiked ? (favs[favIndex].likes || 0) + 1 : (favs[favIndex].likes || 0) - 1;
                localStorage.setItem('bb_favorites', JSON.stringify(favs));
            }

        } catch (error) {
            console.error("Failed to toggle like:", error);
            // Revert on failure cleanly
            setHasLiked(!newLiked);
            setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
        }
    };

    const handleFavoriteClick = () => {
        if (!user) {
            alert('Please log in to favorite articles.');
            return;
        }

        const cleanId = article.id;
        let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
        const newIsFavorite = !isFavorite;

        if (newIsFavorite) {
            if (!favs.some(f => f.id === cleanId)) {
                favs.push({ ...article, likes: likesCount });
            }
        } else {
            favs = favs.filter(f => f.id !== cleanId);
        }

        localStorage.setItem('bb_favorites', JSON.stringify(favs));
        setIsFavorite(newIsFavorite);
    };

    if (loading) {
        return (
            <div style={{ position: 'relative', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-white)' }}>Loading transmission...</p>
                </main>
                <Footer />
            </div>
        );
    }

    if (!article) return null;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <Navbar />
            <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5% 6rem', position: 'relative', zIndex: 10, width: '100%' }}>
                <div style={{ marginTop: '2rem' }}>
                    <BackButton />
                </div>

                {/* Article Header */}
                <header style={{ marginBottom: '3rem', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '2rem' }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--c-yellow)',
                        marginBottom: '1rem',
                        letterSpacing: '0.05em'
                    }}>
                        {article.category || 'Article'} • {article.readTime}
                    </div>
                    <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        {article.title}
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                        <img
                            src={article.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${article.name || 'A'}&backgroundColor=0d2142&textColor=f7d000`}
                            alt={article.name}
                            style={{ width: '45px', height: '45px', border: '2px solid var(--c-yellow)' }}
                        />
                        <div>
                            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-white)', fontWeight: 700, fontSize: '0.9rem' }}>
                                {article.name || 'Anonymous'}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                {article.date ? new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'UNKNOWN DATE'}
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
                    <article className="blog-post-article" style={{
                        background: 'var(--c-white)',
                        border: '2px solid var(--c-black)',
                        boxShadow: '10px 10px 0 var(--c-yellow)',
                        padding: 'min(2.5rem, 5vw) min(3rem, 6vw)',
                        color: '#1a1a1a',
                        fontFamily: 'var(--font-serif, Georgia, serif)',
                        fontSize: '1.1rem',
                        lineHeight: 1.8,
                        overflowX: 'hidden'
                    }}>
                        {(() => {
                        const rawContent = article.contentHTML || article.content || '';
                        const isHtml = /<[^>]+>/.test(rawContent);

                        if (isHtml) {
                            return (
                                <div
                                    style={{ lineHeight: 1.8, fontFamily: 'var(--font-serif, Georgia, serif)', color: '#1a1a1a' }}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(rawContent) }}
                                />
                            );
                        }

                        return (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="serif-heading" style={{ fontSize: '2.2rem', marginTop: '2.5rem', marginBottom: '1rem', lineHeight: 1.2, color: 'var(--c-black)' }} {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="serif-heading" style={{ fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem', lineHeight: 1.3, color: 'var(--c-black)' }} {...props} />,
                                    h3: ({ node, ...props }) => <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', marginTop: '1.5rem', marginBottom: '0.75rem', fontWeight: 700 }} {...props} />,
                                    p: ({ node, ...props }) => <p style={{ marginBottom: '1.5rem', wordWrap: 'break-word', wordBreak: 'break-word' }} {...props} />,
                                    a: ({ node, ...props }) => <a style={{ color: '#0d2142', textDecoration: 'underline', textDecorationColor: 'var(--c-yellow)', textDecorationThickness: '2px', fontWeight: 700 }} {...props} />,
                                    ul: ({ node, ...props }) => <ul style={{ marginBottom: '1.5rem', paddingLeft: '2rem' }} {...props} />,
                                    ol: ({ node, ...props }) => <ol style={{ marginBottom: '1.5rem', paddingLeft: '2rem' }} {...props} />,
                                    li: ({ node, ...props }) => <li style={{ marginBottom: '0.5rem' }} {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote style={{ borderLeft: '4px solid var(--c-black)', margin: '1.5rem 0', padding: '1rem 1.5rem', background: '#f5f0e8', fontStyle: 'italic' }} {...props} />,
                                    code: ({ node, inline, ...props }) =>
                                        inline ?
                                            <code style={{ fontFamily: 'var(--font-mono)', background: '#f0f0f0', padding: '0.2rem 0.4rem', fontSize: '0.9em', border: '1px solid #ccc' }} {...props} /> :
                                            <pre style={{ background: '#0A192F', color: '#fff', padding: '1.5rem', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', border: '2px solid var(--c-black)', marginBottom: '1.5rem' }}>
                                                <code {...props} />
                                            </pre>,
                                    img: ({ node, ...props }) => <img style={{ maxWidth: '100%', height: 'auto', border: '2px solid var(--c-black)', display: 'block', margin: '2rem auto' }} {...props} />,
                                    hr: ({ node, ...props }) => <hr style={{ border: 'none', borderTop: '2px dashed #ccc', margin: '2.5rem 0' }} {...props} />
                                }}
                            >
                                {rawContent}
                            </ReactMarkdown>
                        );
                    })()}

                        {/* Author Bio Section */}
                        {article.bio && (
                            <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '2px solid var(--c-black)' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                                    About the Author
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    <img
                                        src={article.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${article.name || 'A'}&backgroundColor=0d2142&textColor=f7d000`}
                                        alt={article.name}
                                        style={{ width: '60px', height: '60px', border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-yellow)' }}
                                    />
                                    <div>
                                        <h4 className="serif-heading" style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0' }}>{article.name}</h4>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555', margin: 0, lineHeight: 1.6 }}>{article.bio}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Article Footer Actions */}
                        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--c-black)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-black)' }}>
                                    👁 {article.views || 0} views
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleLikeClick}
                                    style={{
                                        background: hasLiked ? '#ff4d4d' : 'transparent',
                                        border: hasLiked ? '2px solid #000' : '2px solid transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        boxShadow: hasLiked ? '4px 4px 0 #000' : 'none'
                                    }}
                                >
                                    <Heart size={20} color={hasLiked ? "#000" : "#ff4d4d"} fill={hasLiked ? "#000" : "none"} />
                                    <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                                </button>

                                <button
                                    onClick={handleFavoriteClick}
                                    style={{
                                        background: isFavorite ? '#f7d000' : 'transparent',
                                        border: isFavorite ? '2px solid #000' : '2px solid transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        boxShadow: isFavorite ? '4px 4px 0 #000' : 'none',
                                        color: '#000'
                                    }}
                                >
                                    <Bookmark size={20} color="#000" fill={isFavorite ? "#000" : "none"} />
                                    <span>{isFavorite ? 'Saved' : 'Save'}</span>
                                </button>
                            </div>
                        </div>
                    </article>
                </div>
            </main>
            <Footer />
        </div>
    );
}