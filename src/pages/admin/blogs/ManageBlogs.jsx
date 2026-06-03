import React, { useState, useEffect, useMemo } from 'react';
import { ArticlesService } from '../../../services/articles';

export default function ManageBlogs({ isAL0 }) {
    const [blogs, setBlogs] = useState([]);
    const [cache, setCache] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (cache.length > 0) {
            setBlogs(cache);
        } else {
            fetchBlogs();
        }
    }, []);

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            let data = [];

            if (typeof ArticlesService.fetchAllAdminBlogs === 'function') {
                try { data = await ArticlesService.fetchAllAdminBlogs(); } catch (e) { console.warn(e); }
            }

            if (!data?.length) {
                const [accepted, hidden, pending] = await Promise.all([
                    ArticlesService.fetchByStatus('accepted').catch(() => []),
                    ArticlesService.fetchByStatus('hidden').catch(() => []),
                    ArticlesService.fetchByStatus('pending').catch(() => []),
                ]);
                data = [...accepted, ...hidden, ...pending];
            }

            // Deduplicate
            const unique = Array.from(new Map(data.map(i => [i.id, i])).values());
            setBlogs(unique);
            setCache(unique);
        } catch (err) {
            console.error(err);
            alert('Could not load blogs.');
            setBlogs([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredBlogs = useMemo(() => {
        const q = search.toLowerCase();
        return blogs.filter(b =>
            (b.title || '').toLowerCase().includes(q) ||
            (b.subtitle || '').toLowerCase().includes(q) ||
            (b.category || '').toLowerCase().includes(q) ||
            (b.name || '').toLowerCase().includes(q) ||
            (b.status || '').toLowerCase().includes(q)
        );
    }, [blogs, search]);

    const handleToggleVisibility = async (id, currentStatus) => {
        const newStatus = currentStatus === 'hidden' ? 'accepted' : 'hidden';
        try {
            await ArticlesService.updateStatus(id, newStatus);
            const updated = prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b);
            setBlogs(updated);
            setCache(updated);
        } catch (err) {
            console.error(err);
            alert('Failed to update visibility.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this article? This cannot be undone.')) return;
        try {
            if (typeof ArticlesService.deleteArticle === 'function') {
                await ArticlesService.deleteArticle(id);
            } else {
                await ArticlesService.hardDeleteArticle(id);
            }
            const updated = prev => prev.filter(b => b.id !== id);
            setBlogs(updated);
            setCache(updated);
        } catch (err) {
            console.error(err);
            alert('Failed to delete article.');
        }
    };

    return (
        <>
            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Search by title, author, category, or status..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#040D1A', border: '2px solid var(--c-yellow)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', outline: 'none', boxShadow: '4px 4px 0 #000' }}
                />
            </div>

            {loading ? (
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading catalogue...</div>
            ) : filteredBlogs.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>No articles match your search.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {filteredBlogs.map(blog => {
                        const isHidden = blog.status === 'hidden';
                        return (
                            <div key={blog.id} style={{
                                background: isHidden ? '#0e1117' : '#0A192F',
                                border: isHidden ? '2px solid #4a5568' : '2px solid var(--c-yellow)',
                                padding: '1.5rem', display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                                opacity: isHidden ? 0.75 : 1
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: isHidden ? '#a0aec0' : 'var(--c-yellow)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>[{blog.category || 'GENERAL'}] By {blog.name || 'Contributor'}</span>
                                        {isHidden && <span style={{ background: '#e53e3e', color: '#fff', padding: '1px 5px', fontSize: '0.55rem', fontWeight: 'bold', borderRadius: '3px' }}>HIDDEN</span>}
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: isHidden ? '#cbd5e0' : '#fff' }}>{blog.title}</h3>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#8892b0' }}>{blog.excerpt || blog.subtitle}</p>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleToggleVisibility(blog.id, blog.status)}
                                        style={{ padding: '0.5rem 1rem', background: isHidden ? 'var(--c-yellow)' : '#222', border: isHidden ? '2px solid var(--c-yellow)' : '2px solid #aaa', color: isHidden ? '#000' : '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {isHidden ? '👁️ SHOW' : '👁️‍🗨️ HIDE'}
                                    </button>
                                    {isAL0 && (
                                        <button
                                            onClick={() => handleDelete(blog.id)}
                                            style={{ padding: '0.5rem 1rem', background: '#1A0B0B', border: '2px solid #EF4444', color: '#FCA5A5', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            🗑️ DELETE
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}