import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimatedList from '../components/blog/AnimatedList';
import BackButton from '../components/shared/BackButton';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import { ArticlesService } from '../services/articles';

const READ_TIME_RANGES = [
    {
        label: '< 5 min',
        fn: rt => Number.parseInt(rt || 0, 10) < 5
    },
    {
        label: '5–8 min',
        fn: rt => {
            const mins = Number.parseInt(rt || 0, 10);
            return mins >= 5 && mins <= 8;
        }
    },
    {
        label: '8+ min',
        fn: rt => Number.parseInt(rt || 0, 10) > 8
    },
];

const SORT_OPTIONS = [
    { label: 'Most Recent', key: 'recent' },
    { label: 'Most Viewed', key: 'views' },
    { label: 'Most Commented', key: 'comments' },
];

export default function Blogs() {
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedReadTime, setSelectedReadTime] = useState(null);
    const [sortBy, setSortBy] = useState('recent');
    const [showGate, setShowGate] = useState(false);

    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadAcceptedArticles = async () => {
            setLoadingPosts(true);
            setError(null);

            try {
                const items = await ArticlesService.getAccepted();
                const normalized = (items || []).map(item => ({
                    ...item,
                    author: item.name || item.authorName || 'Anonymous',
                    excerpt: item.excerpt || item.subtitle || '',
                    date: item.date || item.createdAt || '',
                    readTime: item.readTime || '1 min read',
                    avatar: item.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(item.name || item.authorName || 'A')}&backgroundColor=0d2142&textColor=ffffff`,
                }));

                setPosts(normalized);
            } catch (err) {
                console.error('Failed to load accepted articles:', err);
                setError(err?.message || 'Unable to load articles.');
                setPosts([]);
            } finally {
                setLoadingPosts(false);
            }
        };

        loadAcceptedArticles();
    }, []);

    const authors = useMemo(
        () => [...new Set(posts.map(p => p.author).filter(Boolean))],
        [posts]
    );

    const categories = useMemo(
        () => [...new Set(posts.map(p => p.category).filter(Boolean))],
        [posts]
    );

    const filteredPosts = useMemo(() => {
        let filtered = [...posts];

        if (search.trim()) {
            const query = search.toLowerCase();
            filtered = filtered.filter(post =>
                (post.title || '').toLowerCase().includes(query) ||
                (post.excerpt || '').toLowerCase().includes(query) ||
                (post.content || '').toLowerCase().includes(query)
            );
        }

        if (selectedAuthor) {
            filtered = filtered.filter(post => post.author === selectedAuthor);
        }

        if (selectedCategory) {
            filtered = filtered.filter(post => post.category === selectedCategory);
        }

        if (selectedReadTime !== null) {
            filtered = filtered.filter(post => READ_TIME_RANGES[selectedReadTime].fn(post.readTime));
        }

        if (sortBy === 'views') {
            filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        if (sortBy === 'comments') {
            filtered.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        }

        if (sortBy === 'recent') {
            filtered.sort(
                (a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
            );
        }

        return filtered;
    }, [posts, search, selectedAuthor, selectedCategory, selectedReadTime, sortBy]);

    const activeFilterCount = [
        selectedAuthor,
        selectedCategory,
        selectedReadTime !== null ? true : null,
    ].filter(Boolean).length + (sortBy !== 'recent' ? 1 : 0);

    const clearAll = () => {
        setSearch('');
        setSelectedAuthor(null);
        setSelectedCategory(null);
        setSelectedReadTime(null);
        setSortBy('recent');
    };

    const handlePostSelect = (post) => {
        if (!user) {
            setShowGate(true);
            return;
        }

        if (!post.id) {
            console.error('Missing article id for navigation', post);
            return;
        }

        navigate(`/blog/${encodeURIComponent(post.id)}`);
    };

    const handleLikeToggle = async (postId) => {
        if (!user) {
            setShowGate(true);
            return;
        }

        const existing = posts.find(post => post.id === postId);
        if (!existing) {
            console.error('Article not found for like toggle:', postId);
            return;
        }

        const isLiking = !((existing.likedBy || []).includes(user.sub));

        setPosts(prev => prev.map(post =>
            post.id === postId
                ? {
                    ...post,
                    likes: Math.max(0, (post.likes || 0) + (isLiking ? 1 : -1)),
                    likedBy: isLiking ? [...new Set([...(post.likedBy || []), user.sub])] : (post.likedBy || []).filter(id => id !== user.sub)
                }
                : post
        ));

        try {
            await ArticlesService.toggleLike(postId, isLiking);
        } catch (err) {
            console.error('Like toggle failed:', err);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {showGate && (
                <AuthGateModal action="view and comment on articles" onClose={() => setShowGate(false)} />
            )}

            <Navbar />

            <main className="blog-page-container">
                <BackButton />

                <div className="blog-page-header">
                    <div>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)' }}>
                            All Posts
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {loadingPosts ? 'Loading dispatches...' : `${filteredPosts.length} of ${posts.length} dispatches`}
                        </p>
                    </div>
                    {error && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 77, 77, 0.15)', border: '1px solid #ff4d4d', color: '#fff', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div className="blog-topbar">
                    <div className="blog-search-bar-container">
                        <span className="blog-search-icon">⌕</span>
                        <input
                            id="blog-search"
                            type="text"
                            className="blog-search-input"
                            placeholder="Search by title or content..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="blog-search-clear" onClick={() => setSearch('')}>
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        className={`blog-filter-toggle-btn ${sidebarOpen ? 'open' : ''}`}
                        onClick={() => setSidebarOpen(v => !v)}
                        aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
                    >
                        <span className="blog-filter-toggle-icon">{sidebarOpen ? '✕' : '⊞'}</span>
                        <span>Filters</span>
                        {activeFilterCount > 0 && <span className="blog-filter-badge">{activeFilterCount}</span>}
                    </button>
                </div>

                <div className="blog-content-area">
                    <aside className={`blog-filter-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                        <div className="blog-sidebar-header">
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-black)' }}>
                                Filters
                            </span>
                            {activeFilterCount > 0 && (
                                <button className="blog-sidebar-clear-all" onClick={clearAll}>
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Author</span>
                            <div className="blog-filter-chips">
                                {authors.map(author => (
                                    <button
                                        key={author}
                                        className={`blog-filter-chip ${selectedAuthor === author ? 'active' : ''}`}
                                        onClick={() => setSelectedAuthor(selectedAuthor === author ? null : author)}
                                    >
                                        {author}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Category</span>
                            <div className="blog-filter-chips">
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        className={`blog-filter-chip ${selectedCategory === category ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Read Time</span>
                            <div className="blog-filter-chips">
                                {READ_TIME_RANGES.map((range, index) => (
                                    <button
                                        key={range.label}
                                        className={`blog-filter-chip ${selectedReadTime === index ? 'active' : ''}`}
                                        onClick={() => setSelectedReadTime(selectedReadTime === index ? null : index)}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Sort By</span>
                            <div className="blog-filter-chips">
                                {SORT_OPTIONS.map(option => (
                                    <button
                                        key={option.key}
                                        className={`blog-filter-chip ${sortBy === option.key ? 'active' : ''}`}
                                        onClick={() => setSortBy(option.key)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <div className={`blog-list-area ${sidebarOpen ? 'sidebar-offset' : ''}`}>
                        {loadingPosts ? (
                            <div style={{ color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)' }}>
                                Loading accepted articles...
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="blog-no-results">
                                <p>No dispatches match your search.</p>
                                <button className="blog-filter-clear-all" onClick={clearAll} style={{ marginTop: '1rem' }}>
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <AnimatedList
                                items={filteredPosts}
                                onItemSelect={handlePostSelect}
                                onLikeToggle={handleLikeToggle}
                                showGradients={false}
                                enableArrowNavigation={true}
                                displayScrollbar={false}
                            />
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
