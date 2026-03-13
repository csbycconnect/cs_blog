import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, ThumbsUp } from 'lucide-react';
import { ArticleAPI } from '../../lib/api';
import '../../styles/components.css';

export default function ArticleList() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDispatches() {
            try {
                // Fetch only approved articles
                const data = await ArticleAPI.fetchByStatus('accepted');
                // Only take the latest 3 for the homepage feed
                setArticles(data.slice(0, 3));
            } catch (err) {
                console.error('Failed to fetch latest dispatches:', err);
            } finally {
                setLoading(false);
            }
        }
        loadDispatches();
    }, []);

    if (loading) {
        return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#888' }}>RECEIVING TRANSMISSIONS...</div>;
    }

    if (articles.length === 0) {
        return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#888' }}>NO TRANSMISSIONS FOUND.</div>;
    }

    // Helper to format ISO strings to 'OCTOBER 28, 2024'
    const formatDate = (dateStr) => {
        if (!dateStr) return 'UNKNOWN DATE';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    return (
        <div className="right-column-stack">
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

        if (!user) {
            alert('Please log in to like articles.');
            return;
        }

        const newLiked = !hasLiked;
        setHasLiked(newLiked);
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

        try {
            await ArticleAPI.toggleLike(article.id, newLiked);

            let localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
            if (newLiked) {
                if (!localLikes.includes(article.id)) localLikes.push(article.id);
            } else {
                localLikes = localLikes.filter(id => id !== article.id);
            }
            localStorage.setItem('bb_likes', JSON.stringify(localLikes));

            let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            const favIndex = favs.findIndex(f => f.id === article.id);
            if (favIndex > -1) {
                favs[favIndex].likes = newLiked ? (favs[favIndex].likes || 0) + 1 : (favs[favIndex].likes || 0) - 1;
                localStorage.setItem('bb_favorites', JSON.stringify(favs));
            }
        } catch (error) {
            console.error("Failed to toggle like:", error);
            setHasLiked(!newLiked);
            setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
        }
    };

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert('Please log in to favorite articles.');
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
            <article className="article-card horizontal">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    <h2 className="article-title">{article.title}</h2>
                    <div className="article-meta">
                        <span>{formatDate(article.date)}</span>
                        <span>{article.name || article.author || 'ANONYMOUS'}</span>
                        <span>{article.readTime || '5 MIN READ'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
                        <Link to={`/blog/${article.id}`} className="explore-btn" style={{ textDecoration: 'none', margin: 0 }}>EXPLORE NOW</Link>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={handleLikeClick}
                                title="Like this article"
                                style={{
                                    background: hasLiked ? '#ff4d4d' : 'transparent',
                                    border: hasLiked ? '2px solid #000' : '2px solid rgba(0,0,0,0.2)',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.4rem 0.75rem', cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    boxShadow: hasLiked ? '2px 2px 0 #000' : 'none'
                                }}
                            >
                                <ThumbsUp size={16} color={hasLiked ? "#000" : "#ff4d4d"} fill={hasLiked ? "#000" : "none"} />
                                <span>{likesCount}</span>
                            </button>

                            <button
                                onClick={handleFavoriteClick}
                                title="Save to favorites"
                                style={{
                                    background: isFavorite ? '#ff4d4d' : 'transparent',
                                    border: isFavorite ? '2px solid #000' : '2px solid rgba(0,0,0,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0.4rem', cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isFavorite ? '2px 2px 0 #000' : 'none'
                                }}
                            >
                                <Heart size={18} color={isFavorite ? "#000" : "#ff4d4d"} fill={isFavorite ? "#ff4d4d" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
}
