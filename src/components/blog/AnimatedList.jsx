import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'motion/react';
import { Heart, ThumbsUp, Eye } from 'lucide-react';
import '../../styles/components.css';
import { useAuth } from '../../context/AuthContext';

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: 0.1, once: false });
    return (
        <motion.div
            ref={ref}
            data-index={index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.4, delay: Math.min(delay, 0.4) }}
            className="blog-animated-item"
        >
            {children}
        </motion.div>
    );
};

const formatDate = (value) => {
    const d = new Date(value);
    if (!value || isNaN(d)) return '';
    return d
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        .toUpperCase();
};

const BORDER_IDLE = '2px solid rgba(255,255,255,0.25)';

const BlogCard = ({ post, onLikeToggle, onAuthRequired }) => {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);

    const hasLiked = !!user && (post.likedBy || []).includes(user.sub);
    const likesCount = post.likes || 0;
    const dateLabel = formatDate(post.date);

    useEffect(() => {
        try {
            const favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            setIsFavorite(favs.some(f => f.id === post.id));
        } catch {
            setIsFavorite(false);
        }
    }, [post.id]);

    const handleLikeClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            onAuthRequired?.();
            return;
        }
        onLikeToggle?.(post.id);
    };

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            onAuthRequired?.();
            return;
        }

        let favs = [];
        try {
            favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
        } catch {
            favs = [];
        }

        const next = !isFavorite;
        if (next) {
            if (!favs.some(f => f.id === post.id)) favs.push({ ...post, likes: likesCount });
        } else {
            favs = favs.filter(f => f.id !== post.id);
        }

        localStorage.setItem('bb_favorites', JSON.stringify(favs));
        setIsFavorite(next);
    };

    return (
        <div
            className="blog-card"
            style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            <div className="blog-card-header">
                <div className="blog-card-meta">
                    <div className="blog-meta-text">
                        <span className="blog-author">{post.author}</span>
                        <div className="blog-date-time">
                            {dateLabel && (
                                <>
                                    <span>{dateLabel}</span>
                                    <span className="bullet">•</span>
                                </>
                            )}
                            <span>{post.readTime}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="blog-card-content">
                <h2 className="serif-heading blog-title">{post.title}</h2>
                <p className="blog-excerpt">{post.excerpt}</p>
            </div>

            <div
                className="blog-card-footer"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div className="blog-footer-stats">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Eye size={14} /> {post.views || 0}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleLikeClick}
                        title="Like this article"
                        style={{
                            background: hasLiked ? '#ff4d4d' : 'transparent',
                            border: hasLiked ? '2px solid #000' : BORDER_IDLE,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.75rem',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                            boxShadow: hasLiked ? '2px 2px 0 #000' : 'none',
                            color: 'var(--c-white)',
                        }}
                    >
                        <ThumbsUp
                            size={16}
                            color={hasLiked ? '#000' : '#ff4d4d'}
                            fill={hasLiked ? '#000' : 'none'}
                        />
                        <span style={{ color: hasLiked ? '#000' : 'var(--c-white)' }}>{likesCount}</span>
                    </button>

                    <button
                        onClick={handleFavoriteClick}
                        title="Save to favorites"
                        style={{
                            background: isFavorite ? '#ff4d4d' : 'transparent',
                            border: isFavorite ? '2px solid #000' : BORDER_IDLE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isFavorite ? '2px 2px 0 #000' : 'none',
                        }}
                    >
                        <Heart
                            size={18}
                            color={isFavorite ? '#000' : '#ff4d4d'}
                            fill={isFavorite ? '#ff4d4d' : 'none'}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AnimatedList = ({
    items = [],
    onItemSelect,
    onLikeToggle,
    onAuthRequired,
    enableArrowNavigation = true,
    initialSelectedIndex = -1,
    pageSize = 8,
}) => {
    const listRef = useRef(null);
    const sentinelRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState(false);
    const [visibleCount, setVisibleCount] = useState(pageSize);

    // Reset paging only when the set/order of posts changes (not on like updates).
    const listKey = items.map(i => i.id).join('|');
    useEffect(() => {
        setVisibleCount(pageSize);
    }, [listKey, pageSize]);

    const hasMore = visibleCount < items.length;
    const visibleItems = items.slice(0, visibleCount);

    useEffect(() => {
        if (!hasMore || !sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(c => Math.min(c + pageSize, items.length));
                }
            },
            { rootMargin: '400px 0px' }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, pageSize, items.length, visibleCount]);

    const handleItemMouseEnter = useCallback((index) => {
        setSelectedIndex(index);
    }, []);

    const handleItemClick = useCallback(
        (item, index) => {
            setSelectedIndex(index);
            onItemSelect?.(item, index);
        },
        [onItemSelect]
    );

    useEffect(() => {
        if (!enableArrowNavigation || items.length === 0) return;

        const handleKeyDown = (e) => {
            if (e.target.closest?.('input, textarea, button, select, a, [contenteditable]')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex(prev => {
                    const next = Math.min(prev + 1, items.length - 1);
                    if (next >= visibleCount - 1) setVisibleCount(c => Math.min(c + pageSize, items.length));
                    return next;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    onItemSelect?.(items[selectedIndex], selectedIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, selectedIndex, onItemSelect, enableArrowNavigation, visibleCount, pageSize]);

    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
        listRef.current
            .querySelector(`[data-index="${selectedIndex}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setKeyboardNav(false);
    }, [selectedIndex, keyboardNav]);

    if (!items || items.length === 0) return null;

    return (
        <div className="blog-list-container" style={{ position: 'relative', width: '100%' }}>
            <div
                ref={listRef}
                className="blog-list-scrollarea scrollbar-hide"
                style={{ height: 'auto', maxHeight: 'none', overflow: 'visible' }}
            >
                {visibleItems.map((item, index) => (
                    <AnimatedItem
                        key={item.id || index}
                        delay={(index % pageSize) * 0.08}
                        index={index}
                        onMouseEnter={() => handleItemMouseEnter(index)}
                        onClick={() => handleItemClick(item, index)}
                    >
                        <BlogCard
                            post={item}
                            onLikeToggle={onLikeToggle}
                            onAuthRequired={onAuthRequired}
                        />
                    </AnimatedItem>
                ))}
            </div>

            {hasMore && (
                <div
                    ref={sentinelRef}
                    style={{
                        padding: '1.5rem 0',
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.5)',
                    }}
                >
                    Loading more...
                </div>
            )}
        </div>
    );
};

export default AnimatedList;