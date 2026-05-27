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
    const [dbPosts, setDbPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    const [search, setSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedReadTime, setSelectedReadTime] = useState(null);

    const [sortBy, setSortBy] = useState('recent');

    const { user } = useAuth();
    const [showGate, setShowGate] = useState(false);

    const navigate = useNavigate();

    /* ------------------------------------------------ */
    /* FETCH ARTICLES */
    /* ------------------------------------------------ */

    useEffect(() => {
        const fetchAcceptedArticles = async () => {
            try {
                const items = await ArticlesService.getAccepted();

                const formattedPosts = items.map(item => ({
                    ...item,

                    // Normalize author field
                    author: item.name || item.authorName || 'Anonymous',

                    // Safe avatar fallback
                    avatar:
                        item.avatarUrl ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            item.name || item.authorName || 'A'
                        )}&backgroundColor=0d2142&textColor=ffffff`,
                }));

                setDbPosts(formattedPosts);
            } catch (error) {
                console.error('Error fetching articles:', error);
                setDbPosts([]);
            } finally {
                setLoadingPosts(false);
            }
        };

        fetchAcceptedArticles();
    }, []);

    /* ------------------------------------------------ */
    /* FILTER DATA */
    /* ------------------------------------------------ */

    const authors = [
        ...new Set(
            dbPosts
                .map(p => p.author)
                .filter(Boolean)
        )
    ];

    const categories = [
        ...new Set(
            dbPosts
                .map(p => p.category)
                .filter(Boolean)
        )
    ];

    const allTags = [
        ...new Set(
            dbPosts.flatMap(p =>
                Array.isArray(p.tags) ? p.tags : []
            )
        )
    ];

    const filtered = useMemo(() => {
        let posts = [...dbPosts];

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();

            posts = posts.filter(p =>
                (p.title || '').toLowerCase().includes(q) ||
                (p.excerpt || '').toLowerCase().includes(q) ||
                (p.content || '').toLowerCase().includes(q)
            );
        }

        // Author filter
        if (selectedAuthor) {
            posts = posts.filter(p => p.author === selectedAuthor);
        }

        // Category filter
        if (selectedCategory) {
            posts = posts.filter(p => p.category === selectedCategory);
        }

        // Read time filter
        if (selectedReadTime !== null) {
            posts = posts.filter(p =>
                READ_TIME_RANGES[selectedReadTime].fn(p.readTime)
            );
        }

        // Sorting
        if (sortBy === 'views') {
            posts.sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        if (sortBy === 'comments') {
            posts.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        }

        if (sortBy === 'recent') {
            posts.sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            );
        }

        return posts;
    }, [
        dbPosts,
        search,
        selectedAuthor,
        selectedCategory,
        selectedReadTime,
        sortBy
    ]);

    /* ------------------------------------------------ */
    /* CLEAR FILTERS */
    /* ------------------------------------------------ */

    const clearAll = () => {
        setSearch('');
        setSelectedAuthor(null);
        setSelectedCategory(null);
        setSelectedReadTime(null);
        setSortBy('recent');
    };

    const activeFilterCount =
        [
            selectedAuthor,
            selectedCategory,
            selectedReadTime !== null ? true : null
        ].filter(Boolean).length +
        (sortBy !== 'recent' ? 1 : 0);

    /* ------------------------------------------------ */
    /* POST SELECT */
    /* ------------------------------------------------ */

    const handlePostSelect = (post) => {
        if (!user) {
            setShowGate(true);
            return;
        }

        navigate(`/blog/${post.id}`);
    };

    /* ------------------------------------------------ */
    /* LIKE TOGGLE */
    /* ------------------------------------------------ */

    const handleLikeToggle = async (postId) => {
        if (!user) {
            setShowGate(true);
            return;
        }

        // ✅ FIXED: Use normalized ID
        const targetArticle = dbPosts.find(
            p => p.id === postId
        );

        if (!targetArticle) {
            console.error('Article not found:', postId);
            return;
        }

        const currentLikedBy = targetArticle.likedBy || [];

        // Determine action
        const isLiking = !currentLikedBy.includes(user.sub);

        try {
            // Backend update
            await ArticlesService.toggleLike(postId, isLiking);

            // Optimistic UI update
            setDbPosts(prev =>
                prev.map(p => {
                    // ✅ FIXED: Use ID instead of PK
                    if (p.id === postId) {
                        const updatedLikedBy = isLiking
                            ? [...(p.likedBy || []), user.sub]
                            : (p.likedBy || []).filter(
                                  id => id !== user.sub
                              );

                        return {
                            ...p,

                            likes: Math.max(
                                0,
                                (p.likes || 0) +
                                    (isLiking ? 1 : -1)
                            ),

                            likedBy: updatedLikedBy,
                        };
                    }

                    return p;
                })
            );
        } catch (e) {
            console.error('Failed to toggle like:', e);
        }
    };

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100vh',
                overflow: 'hidden'
            }}
        >
            {showGate && (
                <AuthGateModal
                    action="view and comment on articles"
                    onClose={() => setShowGate(false)}
                />
            )}

            <Navbar />

            <main className="blog-page-container">

                <BackButton />

                {/* ── Header ── */}

                <div className="blog-page-header">
                    <h1
                        className="serif-heading"
                        style={{ color: 'var(--c-white)' }}
                    >
                        All Posts
                    </h1>

                    <p
                        style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '0.85rem',
                            marginTop: '0.5rem'
                        }}
                    >
                        {loadingPosts
                            ? 'Loading dispatches...'
                            : `${filtered.length} of ${dbPosts.length} dispatches`}
                    </p>
                </div>

                {/* ── Search + Filter ── */}

                <div className="blog-topbar">

                    <div className="blog-search-bar-container">

                        <span className="blog-search-icon">
                            ⌕
                        </span>

                        <input
                            id="blog-search"
                            type="text"
                            className="blog-search-input"
                            placeholder="Search by title or content..."
                            value={search}
                            onChange={e =>
                                setSearch(e.target.value)
                            }
                        />

                        {search && (
                            <button
                                className="blog-search-clear"
                                onClick={() => setSearch('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <button
                        className={`blog-filter-toggle-btn ${
                            sidebarOpen ? 'open' : ''
                        }`}
                        onClick={() =>
                            setSidebarOpen(v => !v)
                        }
                        aria-label={
                            sidebarOpen
                                ? 'Close filters'
                                : 'Open filters'
                        }
                    >
                        <span className="blog-filter-toggle-icon">
                            {sidebarOpen ? '✕' : '⊞'}
                        </span>

                        <span>Filters</span>

                        {activeFilterCount > 0 && (
                            <span className="blog-filter-badge">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Main Layout ── */}

                <div className="blog-content-area">

                    {/* Sidebar */}

                    <aside
                        className={`blog-filter-sidebar ${
                            sidebarOpen
                                ? 'sidebar-open'
                                : ''
                        }`}
                    >
                        <div className="blog-sidebar-header">

                            <span
                                style={{
                                    fontFamily:
                                        'var(--font-mono)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    textTransform:
                                        'uppercase',
                                    letterSpacing:
                                        '0.1em',
                                    color:
                                        'var(--c-black)'
                                }}
                            >
                                Filters
                            </span>

                            {activeFilterCount > 0 && (
                                <button
                                    className="blog-sidebar-clear-all"
                                    onClick={clearAll}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Author */}

                        <div className="blog-sidebar-group">

                            <span className="blog-sidebar-label">
                                Author
                            </span>

                            <div className="blog-filter-chips">
                                {authors.map(a => (
                                    <button
                                        key={a}
                                        className={`blog-filter-chip ${
                                            selectedAuthor === a
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedAuthor(
                                                selectedAuthor === a
                                                    ? null
                                                    : a
                                            )
                                        }
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category */}

                        <div className="blog-sidebar-group">

                            <span className="blog-sidebar-label">
                                Category
                            </span>

                            <div className="blog-filter-chips">
                                {categories.map(c => (
                                    <button
                                        key={c}
                                        className={`blog-filter-chip ${
                                            selectedCategory === c
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSelectedCategory(
                                                selectedCategory === c
                                                    ? null
                                                    : c
                                            )
                                        }
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Read Time */}

                        <div className="blog-sidebar-group">

                            <span className="blog-sidebar-label">
                                Read Time
                            </span>

                            <div className="blog-filter-chips">
                                {READ_TIME_RANGES.map(
                                    (r, i) => (
                                        <button
                                            key={r.label}
                                            className={`blog-filter-chip ${
                                                selectedReadTime === i
                                                    ? 'active'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setSelectedReadTime(
                                                    selectedReadTime === i
                                                        ? null
                                                        : i
                                                )
                                            }
                                        >
                                            {r.label}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Sort */}

                        <div className="blog-sidebar-group">

                            <span className="blog-sidebar-label">
                                Sort By
                            </span>

                            <div className="blog-filter-chips">
                                {SORT_OPTIONS.map(s => (
                                    <button
                                        key={s.key}
                                        className={`blog-filter-chip ${
                                            sortBy === s.key
                                                ? 'active'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            setSortBy(s.key)
                                        }
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Blog List */}

                    <div
                        className={`blog-list-area ${
                            sidebarOpen
                                ? 'sidebar-offset'
                                : ''
                        }`}
                    >
                        {filtered.length === 0 ? (
                            <div className="blog-no-results">

                                <p>
                                    No dispatches match
                                    your search.
                                </p>

                                <button
                                    className="blog-filter-clear-all"
                                    onClick={clearAll}
                                    style={{
                                        marginTop: '1rem'
                                    }}
                                >
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <AnimatedList
                                items={filtered}
                                onItemSelect={
                                    handlePostSelect
                                }
                                onLikeToggle={
                                    handleLikeToggle
                                }
                                showGradients={false}
                                enableArrowNavigation={
                                    true
                                }
                                displayScrollbar={false}
                            />
                        )}
                    </div>
                </div>
            </main>

            <div
                style={{
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <Footer />
            </div>
        </div>
    );
}