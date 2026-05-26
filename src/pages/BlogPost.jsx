import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticlesService } from '../services/articles'; // ✅ Fixed Import
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Heart, Bookmark } from 'lucide-react';

export default function BlogPost() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    const viewCounted = useRef(false);

    useEffect(() => {
        const loadArticle = async () => {
            try {
                // ✅ Updated to use ArticlesService fetch
                const data = await ArticlesService.getById(id);
                if (!data) {
                    alert('Article not found.');
                    navigate('/blogs');
                    return;
                }
                setArticle(data);

                // Track view on every load, protected by ref
                if (!viewCounted.current) {
                    viewCounted.current = true;
                    // ✅ Updated to use ArticlesService view incrementer
                    await ArticlesService.incrementViews(id).catch(console.error);
                }
            } catch (error) {
                console.error("Error loading article:", error);
                alert('Failed to load article.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadArticle();
        }
    }, [id, navigate]);

    // Engagement states
    const [isLiked, setIsLiked] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

    const handleLikeClick = async () => {
        if (!article) return;
        try {
            const nextLikedState = !isLiked;
            setIsLiked(nextLikedState);
            
            // Optimistic UI update for the counts
            setArticle(prev => ({
                ...prev,
                likes: (prev.likes || 0) + (nextLikedState ? 1 : -1)
            }));

            // ✅ Updated to use ArticlesService toggleLike fetch route
            await ArticlesService.toggleLike(id, nextLikedState);
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert state if backend request fails
            setIsLiked(prev => !prev);
            setArticle(prev => ({
                ...prev,
                likes: (prev.likes || 0) + (isLiked ? 1 : -1)
            }));
        }
    };

    const handleFavoriteClick = () => {
        setIsFavorite(!isFavorite);
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#f4f4f4',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)'
            }}>
                <div>Loading byteboard dispatch...</div>
            </div>
        );
    }

    if (!article) return null;

    // Sanitize HTML if present
    const cleanHTML = article.contentHTML ? DOMPurify.sanitize(article.contentHTML) : '';

    return (
        <div style={{ minHeight: '100vh', background: '#f4f4f4', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, padding: '2rem 1rem' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <BackButton to="/blogs" text="Back to dispatches" />

                    <article style={{
                        background: '#fff',
                        border: '2px solid #000',
                        boxShadow: '8px 8px 0 #000',
                        padding: '2.5rem',
                        marginTop: '1.5rem',
                        position: 'relative'
                    }}>
                        {/* Category Badge */}
                        <div style={{
                            position: 'absolute',
                            top: '-14px',
                            left: '2rem',
                            background: '#000',
                            color: '#fff',
                            padding: '0.2rem 0.8rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            border: '2px solid #000'
                        }}>
                            {article.category || 'GENERAL'}
                        </div>

                        {/* Title & Metadata */}
                        <h1 style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '2.5rem',
                            fontWeight: 900,
                            lineHeight: 1.1,
                            marginBottom: '1rem',
                            color: '#000'
                        }}>
                            {article.title}
                        </h1>

                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1.5rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: '#555',
                            borderBottom: '2px dashed #ccc',
                            paddingBottom: '1.5rem',
                            marginBottom: '2rem'
                        }}>
                            <div>BY: <span style={{ fontWeight: 700, color: '#000' }}>{article.name || 'ANONYMOUS'}</span></div>
                            <div>DATE: {article.date ? new Date(article.date).toLocaleDateString() : 'UNKNOWN'}</div>
                            <div>READ: {article.readTime || '1 min read'}</div>
                            <div>VIEWS: {article.views || 0}</div>
                        </div>

                        {/* Content Area */}
                        <div className="markdown-body" style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: '1.1rem',
                            lineHeight: 1.65,
                            color: '#222'
                        }}>
                            {article.contentHTML ? (
                                <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {article.content}
                                </ReactMarkdown>
                            )}
                        </div>

                        {/* Interaction Bar */}
                        <div style={{
                            marginTop: '3rem',
                            borderTop: '2px solid #000',
                            paddingTop: '1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={handleLikeClick}
                                    style={{
                                        background: isLiked ? '#ff4d4d' : 'transparent',
                                        border: isLiked ? '2px solid #000' : '2px solid transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        boxShadow: isLiked ? '4px 4px 0 #000' : 'none',
                                        color: isLiked ? '#fff' : '#000'
                                    }}
                                >
                                    <Heart size={20} color={isLiked ? "#fff" : "#000"} fill={isLiked ? "#fff" : "none"} />
                                    <span>{article.likes || 0}</span>
                                </button>
                            </div>

                            <div>
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
                                    <Bookmark size={20} color=\"#000\" fill={isFavorite ? "#000" : "none"} />
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