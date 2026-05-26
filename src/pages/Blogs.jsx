import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArticleAPI } from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimatedList from '../components/blog/AnimatedList';
import BackButton from '../components/shared/BackButton';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';


const READ_TIME_RANGES = [
    { label: '< 5 min', fn: rt => parseInt(rt) < 5 },
    { label: '5–8 min', fn: rt => parseInt(rt) >= 5 && parseInt(rt) <= 8 },
    { label: '8+ min', fn: rt => parseInt(rt) > 8 },
];

const SORT_OPTIONS = [
    { label: 'Most Recent', key: 'recent' },
    { label: 'Most Viewed', key: 'views' },
    { label: 'Most Commented', key: 'comments' },
];

function parseDate(str) { return new Date(str); }

export default function Blogs() {
    const [dbPosts, setDbPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [search, setSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedReadTime, setSelectedReadTime] = useState(null);
    const [sortBy, setSortBy] = useState('recent');

    useEffect(() => {
        const fetchAcceptedArticles = async () => {
            try {
                // Fetch from backend API instead of direct DynamoDB
                const response = await fetch('/api/articles');

                if (!response.ok) {
                    throw new Error('Failed to fetch articles');
                }

                const items = await response.json();

                // Only accepted articles
                const acceptedItems = items.filter(
                    item => item.status === 'accepted'
                );

                const formattedPosts = acceptedItems.map(item => ({
                    ...item,
                    author: item.name || 'Anonymous',
                    avatar:
                        item.avatarUrl ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${item.name || 'A'
                        }&backgroundColor=0d2142&textColor=ffffff`,
                }));

                // Set DB posts only
                setDbPosts(formattedPosts);

            } catch (error) {
                console.error("Error fetching articles:", error);
                setDbPosts([]);
            } finally {
                setLoadingPosts(false);
            }
        };

        fetchAcceptedArticles();
    }, []);

    const authors = [...new Set(dbPosts.map(p => p.author))];
    const categories = [...new Set(dbPosts.map(p => p.category))];

    const filtered = useMemo(() => {
        let posts = [...dbPosts];
        if (search.trim()) {
            const q = search.toLowerCase();
            posts = posts.filter(p =>
                p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)
            );
        }
        if (selectedAuthor) posts = posts.filter(p => p.author === selectedAuthor);
        if (selectedCategory) posts = posts.filter(p => p.category === selectedCategory);
        if (selectedReadTime !== null) posts = posts.filter(p => READ_TIME_RANGES[selectedReadTime].fn(p.readTime));
        if (sortBy === 'views') posts.sort((a, b) => (b.views || 0) - (a.views || 0));
        if (sortBy === 'comments') posts.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        if (sortBy === 'recent') posts.sort((a, b) => parseDate(b.date || 0) - parseDate(a.date || 0));
        return posts;
    }, [dbPosts, search, selectedAuthor, selectedCategory, selectedReadTime, sortBy]);

    const clearAll = () => {
        setSearch('');
        setSelectedAuthor(null);
        setSelectedCategory(null);
        setSelectedReadTime(null);
        setSortBy('recent');
    };

    const activeFilterCount = [selectedAuthor, selectedCategory, selectedReadTime !== null ? true : null]
        .filter(Boolean).length + (sortBy !== 'recent' ? 1 : 0);

    const { user } = useAuth();
    const [showGate, setShowGate] = useState(false);
    const navigate = useNavigate();

    const handlePostSelect = (post, index) => {
        if (!user) { setShowGate(true); return; }
        navigate(`/blog/${post.id}`);
    };

    const handleLikeToggle = async (post, isLiking, callback) => {
        if (!user) { setShowGate(true); return; }
        try {
            await ArticleAPI.toggleLike(post.id, isLiking);
            let favs = JSON.parse(localStorage.getItem('bb_favorites') || '[]');
            if (isLiking) {
                if (!favs.some(f => f.id === post.id)) {
                    favs.push({ ...post, likes: (post.likes || 0) + 1 });
                }
            } else {
                favs = favs.filter(f => f.id !== post.id);
            }
            localStorage.setItem('bb_favorites', JSON.stringify(favs));
            // Update local state post optimistically
            setDbPosts(current => current.map(p => {
                if (p.id === post.id) return { ...p, likes: (p.likes || 0) + (isLiking ? 1 : -1) };
                return p;
            }));
            if (callback) callback(true);
        } catch (e) {
            console.error("Failed to like post", e);
            if (callback) callback(false);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {showGate && <AuthGateModal action="view and comment on articles" onClose={() => setShowGate(false)} />}
            <Navbar />
            <main className="blog-page-container">
                <BackButton />

                {/* ── Page Header ── */}
                <div className="blog-page-header">
                    <h1 className="serif-heading" style={{ color: 'var(--c-white)' }}>All Posts</h1>
                    <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        {loadingPosts ? "Loading dispatches..." : `${filtered.length} of ${dbPosts.length} dispatches`}
                    </p>
                </div>

                {/* ── Search + Filter Toggle Row ── */}
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
                            <button className="blog-search-clear" onClick={() => setSearch('')}>✕</button>
                        )}
                    </div>

                    <button
                        className={`blog-filter-toggle-btn ${sidebarOpen ? 'open' : ''}`}
                        onClick={() => setSidebarOpen(v => !v)}
                        aria-label={sidebarOpen ? 'Close filters' : 'Open filters'}
                    >
                        <span className="blog-filter-toggle-icon">{sidebarOpen ? '✕' : '⊞'}</span>
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="blog-filter-badge">{activeFilterCount}</span>
                        )}
                    </button>
                </div>

                {/* ── Main content: sidebar + list ── */}
                <div className="blog-content-area">

                    {/* Filter Sidebar */}
                    <aside className={`blog-filter-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                        <div className="blog-sidebar-header">
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-black)' }}>
                                Filters
                            </span>
                            {activeFilterCount > 0 && (
                                <button className="blog-sidebar-clear-all" onClick={clearAll}>Clear all</button>
                            )}
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Author</span>
                            <div className="blog-filter-chips">
                                {authors.map(a => (
                                    <button key={a} className={`blog-filter-chip ${selectedAuthor === a ? 'active' : ''}`}
                                        onClick={() => setSelectedAuthor(selectedAuthor === a ? null : a)}>{a}</button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Category</span>
                            <div className="blog-filter-chips">
                                {categories.map(c => (
                                    <button key={c} className={`blog-filter-chip ${selectedCategory === c ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}>{c}</button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Read Time</span>
                            <div className="blog-filter-chips">
                                {READ_TIME_RANGES.map((r, i) => (
                                    <button key={r.label} className={`blog-filter-chip ${selectedReadTime === i ? 'active' : ''}`}
                                        onClick={() => setSelectedReadTime(selectedReadTime === i ? null : i)}>{r.label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="blog-sidebar-group">
                            <span className="blog-sidebar-label">Sort By</span>
                            <div className="blog-filter-chips">
                                {SORT_OPTIONS.map(s => (
                                    <button key={s.key} className={`blog-filter-chip ${sortBy === s.key ? 'active' : ''}`}
                                        onClick={() => setSortBy(s.key)}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Article list */}
                    <div className={`blog-list-area ${sidebarOpen ? 'sidebar-offset' : ''}`}>
                        {filtered.length === 0 ? (
                            <div className="blog-no-results">
                                <p>No dispatches match your search.</p>
                                <button className="blog-filter-clear-all" onClick={clearAll} style={{ marginTop: '1rem' }}>
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <AnimatedList
                                items={filtered}
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
            <div style={{ position: 'relative', zIndex: 10 }}>
                <Footer />
            </div>
        </div>
    );
}
