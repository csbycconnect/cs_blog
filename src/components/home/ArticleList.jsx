import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, ThumbsUp } from 'lucide-react';
// Point directly to your correct established system service
import { ArticlesService } from '../../services/articles';
import '../../styles/components.css';

// Global memory cache reference to avoid hitting AWS multiple times on home nav
let globalDispatchesCache = null;

export default function ArticleList() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDispatches() {
            try {
                // 1. Cache Hit Check
                if (globalDispatchesCache) {
                    setArticles(globalDispatchesCache);
                    setLoading(false);
                    return;
                }

                let data = [];

                // 2. Dynamic Service Check: Try getAccepted first, then status string
                if (typeof ArticlesService.getAccepted === 'function') {
                    data = await ArticlesService.getAccepted();
                } else if (typeof ArticlesService.getArticlesByStatus === 'function') {
                    data = await ArticlesService.getArticlesByStatus('accepted');
                } else {
                    // 3. Absolute Fallback: Hit the raw endpoint directly if services mismatch
                    const res = await fetch('/api/articles');
                    if (res.ok) data = await res.json();
                }

                // Filter down to accepted articles if the raw fallback pulled everything
                const acceptedOnly = (data || []).filter(blog =>
                    blog.status === 'accepted' || !blog.status
                );

                // Slice the top 3 items for the home view grid stack
                const latestThree = acceptedOnly.slice(0, 3);

                setArticles(latestThree);
                globalDispatchesCache = latestThree; // Commit to memory cache
            } catch (err) {
                console.error('Failed to fetch latest dispatches:', err);
            } finally {
                setLoading(false);
            }
        }
        loadDispatches();
    }, []);

    if (loading) {
        return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--c-yellow)' }}>RECEIVING TRANSMISSIONS...</div>;
    }

    if (articles.length === 0) {
        return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', opacity: 0.5 }}>NO TRANSMISSIONS FOUND IN THE FEED MATRIX.</div>;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'UNKNOWN DATE';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    return (
        <div className="right-column-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {articles.map((article) => (
                <ArticleListItem key={article.id} article={article} formatDate={formatDate} />
            ))}
        </div>
    );
}

function ArticleListItem({ article, formatDate }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isFavorite, setIsFavorite] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(article.likes || 0);

    useEffect(() => {
        const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
        setIsFavorite(favs.some(f => f.id === article.id));

        const localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
        setHasLiked(localLikes.includes(article.id));
        setLikesCount(article.likes || 0);
    }, [article]);

    const handleLikeClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newLiked = !hasLiked;
        setHasLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            // Safe execution loop to isolate AWS credential signature validation crashes
            if (typeof ArticlesService.toggleLike === 'function') {
                await ArticlesService.toggleLike(article.id, newLiked).catch(err => {
                    console.warn("Server update delayed, caching update locally...", err);
                });
            }

            // Save state immediately to localStorage to keep UI responsive
            let localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
            if (newLiked) {
                if (!localLikes.includes(article.id)) localLikes.push(article.id);
            } else {
                localLikes = localLikes.filter(id => id !== article.id);
            }
            localStorage.setItem('bb_likes', JSON.stringify(localLikes));
        } catch (error) {
            console.error("Local storage allocation error:", error);
        }
    };

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert('Please log in to archive articles to favorites.');
            return;
        }

        let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
        const newIsFavorite = !isFavorite;

        if (newIsFavorite) {
            if (!favs.some(f => f.id === article.id)) {
                favs.push({ ...article, likes: likesCount });
            }
        } else {
            favs = favs.filter(f => f.id !== article.id);
        }

        localStorage.setItem('bb_favorites', JSON.stringify(favs));
        setIsFavorite(newIsFavorite);
    };

    return (
        <div className="article-wrapper">
            <div className="article-shadow"></div>
            <article className="article-card horizontal" style={{ background: '#0A192F', border: '2px solid var(--c-white)', padding: '1.5rem', color: '#fff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--c-yellow)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        // {article.category || 'GENERAL'}
                    </div>
                    <h2 className="article-title" style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.4rem' }}>{article.title}</h2>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#8892b0', lineHeight: '1.4' }}>{article.subtitle}</p>

                    <div className="article-meta" style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#a8b2d1', marginBottom: '1.5rem' }}>
                        <span>{formatDate(article.date || article.createdAt)}</span>
                        <span>By <strong style={{ color: 'var(--c-yellow)' }}>{article.name || article.authorName || 'Contributor'}</strong></span>
                        <span>{article.readTime || '5 MIN READ'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Link to={`/blog/${article.id}`} className="explore-btn" style={{ textDecoration: 'none', margin: 0, padding: '0.5rem 1rem', background: 'transparent', border: '2px solid var(--c-yellow)', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            EXPLORE NOW →
                        </Link>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={handleLikeClick}
                                title="Like this dispatch"
                                style={{
                                    background: hasLiked ? 'var(--c-yellow)' : 'transparent',
                                    border: hasLiked ? '2px solid #000' : '2px solid rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.4rem 0.75rem', cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem',
                                    color: hasLiked ? '#000' : '#fff',
                                    transition: 'all 0.2s',
                                    boxShadow: hasLiked ? '3px 3px 0 #000' : 'none'
                                }}
                            >
                                <ThumbsUp size={14} color={hasLiked ? "#000" : "var(--c-yellow)"} fill={hasLiked ? "#000" : "none"} />
                                <span>{likesCount}</span>
                            </button>

                            <button
                                onClick={handleFavoriteClick}
                                title="Save to local database archive"
                                style={{
                                    background: isFavorite ? 'var(--c-yellow)' : 'transparent',
                                    border: isFavorite ? '2px solid #000' : '2px solid rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0.4rem', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isFavorite ? '3px 3px 0 #000' : 'none'
                                }}
                            >
                                <Heart size={15} color={isFavorite ? "#000" : "var(--c-yellow)"} fill={isFavorite ? "#000" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
}