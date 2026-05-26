import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticlesService } from '../services/articles'; // ✅ Updated to use the secure service layer
import { 
    Calendar, 
    User, 
    Clock, 
    ArrowLeft, 
    Heart, 
    MessageSquare, 
    Share2, 
    Bookmark,
    AlertCircle
} from 'lucide-react';
import './BlogPost.css';

export default function BlogPost() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    useEffect(() => {
        async function loadArticle() {
            if (!id) return;
            
            try {
                setLoading(true);
                setError(null);
                
                // ✅ Fetch the article details securely through the Vercel API
                const data = await ArticlesService.getById(id);
                
                if (!data) {
                    setError("Article not found");
                    return;
                }
                
                setArticle(data);
                setLikesCount(data.likes || 0);
                
                // ✅ Securely increment views on the backend while loading the post
                await ArticlesService.incrementViews(id);
                
            } catch (err) {
                console.error("Error loading article:", err);
                setError(err.message || "Failed to load the article. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        loadArticle();
    }, [id]);

    const handleLike = async () => {
        if (!user) return;
        
        try {
            const newLikedState = !isLiked;
            setIsLiked(newLikedState);
            setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
            
            // ✅ Use the new service layer to toggle the like in DynamoDB
            await ArticlesService.toggleLike(id, newLikedState);
        } catch (err) {
            console.error("Error toggling like:", err);
            // Revert UI state if backend operation fails
            setIsLiked(!isLiked);
            setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="blog-post-loading">
                <div className="spinner"></div>
                <p>Loading article...</p>
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="blog-post-error-container">
                <div className="error-card">
                    <AlertCircle className="error-icon" size={48} />
                    <h2>Oops! Something went wrong</h2>
                    <p>{error || "We couldn't find the article you're looking for."}</p>
                    <button onClick={() => navigate('/blogs')} className="back-home-btn">
                        <ArrowLeft size={18} /> Back to Blogs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="blog-post-wrapper">
            <div className="blog-post-container">
                {/* Back Navigation */}
                <button onClick={() => navigate('/blogs')} className="blog-post-back-btn">
                    <ArrowLeft size={16} /> Back to Articles
                </button>

                {/* Article Header */}
                <header className="blog-post-header">
                    <span className="blog-post-category-badge">
                        {article.category || 'General'}
                    </span>
                    <h1 className="blog-post-title">{article.title}</h1>
                    
                    <div className="blog-post-meta">
                        <div className="meta-item">
                            <User size={16} />
                            <span>{article.name || 'Anonymous'}</span>
                        </div>
                        <div className="meta-item">
                            <Calendar size={16} />
                            <span>{article.date ? new Date(article.date).toLocaleDateString() : 'Unknown Date'}</span>
                        </div>
                        <div className="meta-item">
                            <Clock size={16} />
                            <span>{article.readTime || '3 min read'}</span>
                        </div>
                    </div>
                </header>

                {/* Main Content View */}
                <div className="blog-post-content-container">
                    {article.contentHTML ? (
                        <div 
                            className="blog-post-body dynamic-content"
                            dangerouslySetInnerHTML={{ __html: article.contentHTML }}
                        />
                    ) : (
                        <div className="blog-post-body plain-text-content">
                            {article.content}
                        </div>
                    )}
                </div>

                {/* Footer Engagement Bar */}
                <footer className="blog-post-footer">
                    <div className="engagement-stats">
                        <button 
                            onClick={handleLike} 
                            className={`engagement-btn like-btn ${isLiked ? 'liked' : ''} ${!user ? 'disabled' : ''}`}
                            title={user ? (isLiked ? 'Unlike' : 'Like') : 'Log in to like posts'}
                            disabled={!user}
                        >
                            <Heart size={20} fill={isLiked ? "var(--accent-color)" : "none"} />
                            <span>{likesCount}</span>
                        </button>
                        
                        <div className="engagement-btn comment-btn disabled" title="Comments coming soon">
                            <MessageSquare size={20} />
                            <span>{article.comments || 0}</span>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="action-btn" title="Bookmark Post">
                            <Bookmark size={20} />
                        </button>
                        <button className="action-btn" title="Share Post">
                            <Share2 size={20} />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}