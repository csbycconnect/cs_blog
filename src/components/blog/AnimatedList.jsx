import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'motion/react';
import { Heart, ThumbsUp } from 'lucide-react';
import { ArticleAPI } from '../../lib/api';
import '../../styles/components.css'; // ensure components.css is loaded
import { useAuth } from '../../context/AuthContext';

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: 0.1, once: false }); // reduced amount for larger items
    return (
        <motion.div
            ref={ref}
            data-index={index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.4, delay }}
            className="blog-animated-item"
        >
            {children}
        </motion.div>
    );
};

const BlogCard = ({ post }) => {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);

    useEffect(() => {
        const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
        setIsFavorite(favs.some(f => f.id === post.id));

        const localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
        setHasLiked(localLikes.includes(post.id));
        setLikesCount(post.likes || 0);
    }, [post]);

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
            await ArticleAPI.toggleLike(post.id, newLiked);

            let localLikes = JSON.parse(localStorage.getItem('bb_likes') || '[]');
            if (newLiked) {
                if (!localLikes.includes(post.id)) localLikes.push(post.id);
            } else {
                localLikes = localLikes.filter(id => id !== post.id);
            }
            localStorage.setItem('bb_likes', JSON.stringify(localLikes));

            let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            const favIndex = favs.findIndex(f => f.id === post.id);
            if (favIndex > -1) {
                favs[favIndex].likes = newLiked ? (favs[favIndex].likes || 0) + 1 : (favs[favIndex].likes || 0) - 1;
                localStorage.setItem('bb_favorites', JSON.stringify(favs));
            }
        } catch (error) {
            console.error(error);
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
            if (!favs.some(f => f.id === post.id)) {
                favs.push({ ...post, likes: likesCount });
            }
        } else {
            favs = favs.filter(f => f.id !== post.id);
        }

        localStorage.setItem('bb_favorites', JSON.stringify(favs));
        setIsFavorite(newIsFavorite);
    };

    return (
        <div className="blog-card" style={{ transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div className="blog-card-header">
                <div className="blog-card-meta">
                    {/* Removed Avatar Image */}
                    <div className="blog-meta-text">
                        <span className="blog-author">{post.author}</span>
                        <div className="blog-date-time">
                            <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                            <span className="bullet">•</span>
                            <span>{post.readTime}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="blog-card-content">
                <h2 className="serif-heading blog-title">{post.title}</h2>
                <p className="blog-excerpt">{post.excerpt}</p>
            </div>

            <div className="blog-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="blog-footer-stats">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>👁 {post.views || 0}</span>
                </div>

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
                            boxShadow: hasLiked ? '2px 2px 0 #000' : 'none',
                            color: 'var(--c-white)'
                        }}
                    >
                        <ThumbsUp size={16} color={hasLiked ? "#000" : "#ff4d4d"} fill={hasLiked ? "#000" : "none"} />
                        <span style={{ color: hasLiked ? '#000' : 'var(--c-white)' }}>{likesCount}</span>
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
    );
};

const AnimatedList = ({
    items = [],
    onItemSelect,
    showGradients = false, // disabled by default to match clean aesthetic
    enableArrowNavigation = true,
    displayScrollbar = false, // disabled to match clean aesthetic
    initialSelectedIndex = -1
}) => {
    const listRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState(false);
    const [topGradientOpacity, setTopGradientOpacity] = useState(0);
    const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

    const handleItemMouseEnter = useCallback((index) => {
        setSelectedIndex(index);
    }, []);

    const handleItemClick = useCallback(
        (item, index) => {
            setSelectedIndex(index);
            if (onItemSelect) {
                onItemSelect(item, index);
            }
        },
        [onItemSelect]
    );

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setTopGradientOpacity(Math.min(scrollTop / 50, 1));
        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
    };

    useEffect(() => {
        if (!enableArrowNavigation || items.length === 0) return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
            } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    if (onItemSelect) {
                        onItemSelect(items[selectedIndex], selectedIndex);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
        const container = listRef.current;
        const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedItem) {
            const extraMargin = 50;
            const containerScrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemTop = selectedItem.offsetTop;
            const itemBottom = itemTop + selectedItem.offsetHeight;
            if (itemTop < containerScrollTop + extraMargin) {
                container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
            } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
                container.scrollTo({
                    top: itemBottom - containerHeight + extraMargin,
                    behavior: 'smooth'
                });
            }
        }
        setKeyboardNav(false);
    }, [selectedIndex, keyboardNav]);

    if (!items || items.length === 0) return null;

    return (
        <div className="blog-list-container" style={{ position: 'relative', width: '100%' }}>
            <div
                ref={listRef}
                className={`blog-list-scrollarea ${displayScrollbar ? 'with-scrollbar' : 'scrollbar-hide'}`}
                onScroll={handleScroll}
            >
                {items.map((item, index) => (
                    <AnimatedItem
                        key={item.id || index}
                        delay={index * 0.1}
                        index={index}
                        onMouseEnter={() => handleItemMouseEnter(index)}
                        onClick={() => handleItemClick(item, index)}
                    >
                        <BlogCard post={item} />
                    </AnimatedItem>
                ))}
            </div>
            {showGradients && (
                <>
                    <div
                        className="scroll-gradient-top"
                        style={{ opacity: topGradientOpacity }}
                    ></div>
                    <div
                        className="scroll-gradient-bottom"
                        style={{ opacity: bottomGradientOpacity }}
                    ></div>
                </>
            )}
        </div>
    );
};

export default AnimatedList;
