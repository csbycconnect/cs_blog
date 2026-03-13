import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, ThumbsUp } from 'lucide-react';
import { ArticleAPI } from '../../lib/api';
import '../../styles/components.css';

export default function HeroArticle() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isFavorite, setIsFavorite] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    useEffect(() => {
        const loadHero = async () => {
            try {
                const data = await ArticleAPI.fetchByStatus('accepted');
                if (data.length > 0) {
                    const heroData = data[0]; // the absolute latest
                    setArticle(heroData);

                    const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
                    setIsFavorite(favs.some(f => f.id === heroData.id));

                    const localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
                    setHasLiked(localLikes.includes(heroData.id));
                    setLikesCount(heroData.likes || 0);
                }
            } catch (err) {
                console.error('Failed to load hero dispatch:', err);
            } finally {
                setLoading(false);
            }
        };
        loadHero();
    }, []);

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

    if (loading) {
        return <div style={{ height: '400px', border: '2px solid var(--c-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)' }}>INITIALIZING HERO SENSOR...</div>;
    }

    if (!article) return null; // No articles available

    return (
        <div className="article-wrapper">
            <div className="article-shadow"></div>
            <article className="article-card">
                <img
                    src={article.image || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop"}
                    alt={article.title}
                    className="article-image"
                />
                <h1 className="article-title">{article.title}</h1>
                <div className="article-meta">
                    <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                    <span>{article.name || article.author || 'ANONYMOUS'}</span>
                    <span>{article.readTime || '5 MIN READ'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
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
            </article>
        </div>
    );
}
