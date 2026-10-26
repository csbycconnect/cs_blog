import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimatedList from '../components/blog/AnimatedList';
import BlogFilters, { applyFilters, countActive, EMPTY_FILTERS } from '../components/blog/BlogFilters';
import BackButton from '../components/shared/BackButton';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import ShuffleText from '../components/shared/ShuffleText';
import { ArticlesService } from '../services/articles';

export default function Blogs() {
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
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

    const filteredPosts = useMemo(
        () => applyFilters(posts, { search, filters, sortBy }),
        [posts, search, filters, sortBy]
    );

    const activeFilterCount = countActive(filters, sortBy);

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setSortBy('recent');
    };

    const clearAll = () => {
        setSearch('');
        clearFilters();
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

        const apply = (liking) => setPosts(prev => prev.map(post =>
            post.id === postId
                ? {
                    ...post,
                    likes: Math.max(0, (post.likes || 0) + (liking ? 1 : -1)),
                    likedBy: liking
                        ? [...new Set([...(post.likedBy || []), user.sub])]
                        : (post.likedBy || []).filter(id => id !== user.sub),
                }
                : post
        ));

        apply(isLiking);

        try {
            await ArticlesService.toggleLike(postId, isLiking);
        } catch (err) {
            console.error('Like toggle failed:', err);
            apply(!isLiking);
        }
    };

    const handleWriteForUs = (e) => {
        if (!user) {
            e.preventDefault();
            setShowGate(true);
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'clip' }}>
            {showGate && (
                <AuthGateModal action="view and comment on articles" onClose={() => setShowGate(false)} />
            )}

            <Navbar />

            <main className="blog-page-container">
                <BackButton />

                <div className="blog-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)' }}>
                            All Posts
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            {loadingPosts ? 'Loading dispatches...' : `${filteredPosts.length} of ${posts.length} dispatches`}
                        </p>
                        {error && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 77, 77, 0.15)', border: '1px solid #ff4d4d', color: '#fff', borderRadius: '8px' }}>
                                {error}
                            </div>
                        )}
                    </div>

                    <a
                        href="/write-for-us"
                        onClick={handleWriteForUs}
                        style={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--c-black)',
                            backgroundColor: 'var(--c-yellow)',
                            border: '2px solid var(--c-black)',
                            boxShadow: '6px 6px 0 var(--c-black)',
                            padding: '0.75rem 1.75rem',
                            textDecoration: 'none',
                            flexShrink: 0,
                            alignSelf: 'flex-start',
                            marginTop: '1rem',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--c-black)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '6px 6px 0 var(--c-black)'; }}
                    >
                        <ShuffleText text="Write for Us →" />
                    </a>
                </div>

                <div className="blog-topbar">
                    <div className="blog-search-bar-container">
                        <span className="blog-search-icon">⌕</span>
                        <input
                            id="blog-search"
                            type="text"
                            className="blog-search-input"
                            placeholder="Search title, content or author..."
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
                        <BlogFilters
                            posts={posts}
                            search={search}
                            filters={filters}
                            setFilters={setFilters}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            onClear={clearFilters}
                        />
                    </aside>

                    <div className={`blog-list-area ${sidebarOpen ? 'sidebar-offset' : ''}`}>
                        {loadingPosts ? (
                            <div style={{ color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)' }}>
                                Loading accepted articles...
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="blog-no-results">
                                <p>{posts.length === 0 ? 'No articles yet.' : 'No dispatches match your search.'}</p>
                                {posts.length > 0 && (
                                    <button className="blog-filter-clear-all" onClick={clearAll} style={{ marginTop: '1rem' }}>
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <AnimatedList
                                items={filteredPosts}
                                onItemSelect={handlePostSelect}
                                onLikeToggle={handleLikeToggle}
                                onAuthRequired={() => setShowGate(true)}
                                enableArrowNavigation={true}
                            />
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}