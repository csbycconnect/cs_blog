import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimatedList from '../components/blog/AnimatedList';
import BlogFilters, { applyFilters, countActive, EMPTY_FILTERS } from '../components/blog/BlogFilters';
import BlogPagination from '../components/blog/BlogPagination';
import BackButton from '../components/shared/BackButton';
import { useAuth } from '../context/AuthContext';
import AuthGateModal from '../components/shared/AuthGateModal';
import ShuffleText from '../components/shared/ShuffleText';
import { ArticlesService } from '../services/articles';

// ---- DB protection: cache + request de-duplication ----
const CACHE_KEY = 'bb_accepted_articles_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // re-fetch from the DB at most once per 5 min per browser
let inflightRequest = null;

const readCache = () => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { at, items } = JSON.parse(raw);
        return Date.now() - at < CACHE_TTL_MS ? items : null;
    } catch {
        return null;
    }
};

const writeCache = (items) => {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
    } catch {
        /* storage full or blocked: skip caching */
    }
};

const clearCache = () => {
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
};

const fetchAccepted = async () => {
    const cached = readCache();
    if (cached) return cached;
    if (!inflightRequest) {
        inflightRequest = ArticlesService.getAccepted()
            .then(items => { writeCache(items || []); return items || []; })
            .finally(() => { inflightRequest = null; });
    }
    return inflightRequest;
};

const PAGE_SIZE = 10;

export default function Blogs() {
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const likingRef = useRef(new Set());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [sortBy, setSortBy] = useState('recent');
    const [showGate, setShowGate] = useState(false);

    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const listTopRef = useRef(null);
    const likesCheckedRef = useRef({ sub: null, ids: new Set() });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 250);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        let cancelled = false;

        const loadAcceptedArticles = async () => {
            setLoadingPosts(true);
            setError(null);

            try {
                const items = await fetchAccepted();
                if (cancelled) return;
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
                if (cancelled) return;
                console.error('Failed to load accepted articles:', err);
                setError(err?.message || 'Unable to load articles.');
                setPosts([]);
            } finally {
                if (!cancelled) setLoadingPosts(false);
            }
        };

        loadAcceptedArticles();
        return () => { cancelled = true; };
    }, []);

    const filteredPosts = useMemo(
        () => applyFilters(posts, { search: debouncedSearch, filters, sortBy }),
        [posts, debouncedSearch, filters, sortBy]
    );

    // ---- pagination ----
    // The page lives in the URL (?page=2), so Back from an article returns to the same page.
    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const page = Math.min(Math.max(Number.isNaN(requestedPage) ? 1 : requestedPage, 1), totalPages);
    const pageItems = useMemo(
        () => filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filteredPosts, page]
    );

    const goToPage = (n) => {
        setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            if (n <= 1) p.delete('page'); else p.set('page', String(n));
            return p;
        });
        // bring the top of the list into view (not the very top of the page)
        requestAnimationFrame(() => listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    // Changing search / filters / sort starts again at page 1 (but not on first load,
    // so opening /blogs?page=3 directly still works)
    const filterKey = `${debouncedSearch}|${sortBy}|${JSON.stringify(filters)}`;
    const prevFilterKey = useRef(filterKey);
    useEffect(() => {
        if (prevFilterKey.current === filterKey) return;
        prevFilterKey.current = filterKey;
        setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            p.delete('page');
            return p;
        }, { replace: true });
    }, [filterKey, setSearchParams]);

    // "Did I like these?" is asked only for the articles on the current page, once each.
    // (The big public list stays identical for everyone, so the CDN can cache it.)
    const pageIdsKey = pageItems.map(p => p.id).filter(Boolean).join(',');
    useEffect(() => {
        if (!user?.sub || !pageIdsKey) return;
        if (likesCheckedRef.current.sub !== user.sub) {
            likesCheckedRef.current = { sub: user.sub, ids: new Set() };
        }
        const checked = likesCheckedRef.current.ids;
        const todo = pageIdsKey.split(',').filter(id => !checked.has(id));
        if (!todo.length) return;

        let cancelled = false;
        ArticlesService.getMyLikes(todo)
            .then(likedIds => {
                if (cancelled) return;
                todo.forEach(id => checked.add(id));
                if (!likedIds.length) return;
                const liked = new Set(likedIds);
                setPosts(prev => prev.map(p =>
                    liked.has(p.id)
                        ? { ...p, likedBy: [...new Set([...(p.likedBy || []), user.sub])] }
                        : p
                ));
            })
            .catch(() => { /* likes state is non-critical */ });

        return () => { cancelled = true; };
    }, [user?.sub, pageIdsKey]);

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

        // one in-flight like request per post: blocks click-spam from hammering the DB
        if (likingRef.current.has(postId)) return;
        likingRef.current.add(postId);

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
            clearCache(); // counts changed server-side; next load fetches fresh data
        } catch (err) {
            console.error('Like toggle failed:', err);
            apply(!isLiking);
        } finally {
            likingRef.current.delete(postId);
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
                            search={debouncedSearch}
                            filters={filters}
                            setFilters={setFilters}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            onClear={clearFilters}
                        />
                    </aside>

                    <div ref={listTopRef} style={{ scrollMarginTop: '6rem' }} className={`blog-list-area ${sidebarOpen ? 'sidebar-offset' : ''}`}>
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
                            <>
                                <AnimatedList
                                    key={page}
                                    items={pageItems}
                                    onItemSelect={handlePostSelect}
                                    onLikeToggle={handleLikeToggle}
                                    onAuthRequired={() => setShowGate(true)}
                                    enableArrowNavigation={true}
                                />
                                <BlogPagination
                                    page={page}
                                    totalPages={totalPages}
                                    totalItems={filteredPosts.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={goToPage}
                                />
                            </>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}