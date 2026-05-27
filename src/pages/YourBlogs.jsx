import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticlesService } from '../services/articles';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';

// Helper to remove HTML tags when generating previews
const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export default function YourBlogs() {
    const { user, updateBio } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [activeTab, setActiveTab] = useState('published'); // 'published', 'pending', 'drafts'

    const [bio, setBio] = useState(user?.bio || '');
    const [editingBio, setEditingBio] = useState(false);

    // Load Drafts from localStorage
    useEffect(() => {
        const localDrafts = JSON.parse(localStorage.getItem('bb_drafts') || '[]');
        setDrafts(localDrafts);
    }, []);

    // Load Author's Posts from DB properly
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchAuthorPosts = async () => {
            try {
                setLoading(true);
                
                // Fetch using our established service methods
                let data = [];
                if (typeof ArticlesService.getAccepted === 'function') {
                    data = await ArticlesService.getAccepted();
                } else if (typeof ArticlesService.fetchByStatus === 'function') {
                    data = await ArticlesService.fetchByStatus('accepted');
                } else {
                    const res = await fetch('/api/articles');
                    if (res.ok) data = await res.json();
                }

                // Gather pending articles to capture drafts submitted into the queue
                let pendingData = [];
                if (typeof ArticlesService.getPending === 'function') {
                    pendingData = await ArticlesService.getPending().catch(() => []);
                }

                const combined = [...(data || []), ...(pendingData || [])];

                // Map against the true DynamoDB schema properties present in your CSV records
                const userEmail = (user.email || '').toLowerCase();
                const userSub = (user.sub || user.id || '').toLowerCase();
                const userName = (user.name || '').toLowerCase();

                const filtered = combined.filter(art => 
                    (art.email && art.email.toLowerCase() === userEmail) ||
                    (art.authorId && art.authorId.toLowerCase() === userSub) ||
                    (art.authorName && art.authorName.toLowerCase() === userName)
                );

                setPosts(filtered);
            } catch (error) {
                console.error("Error matching author identity metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuthorPosts();
    }, [user, navigate]);

    // Compute metrics and separate posts into appropriate lists cleanly
    const { publishedList, pendingList, metrics } = useMemo(() => {
        const publishedItems = posts.filter(p => p.status === 'accepted');
        const pendingItems = posts.filter(p => p.status === 'pending' || p.status === 'hidden');
        
        return {
            publishedList: publishedItems,
            pendingList: pendingItems,
            metrics: {
                publishedCount: publishedItems.length,
                totalViews: posts.reduce((acc, p) => acc + (parseInt(p.views) || 0), 0),
                totalLikes: posts.reduce((acc, p) => acc + (parseInt(p.likes) || 0), 0)
            }
        };
    }, [posts]);

    // Map correct data slice depending on active view selection
    const items = useMemo(() => {
        if (activeTab === 'published') return publishedList;
        if (activeTab === 'pending') return pendingList;
        if (activeTab === 'drafts') return drafts;
        return [];
    }, [activeTab, publishedList, pendingList, drafts]);

    const handleSaveBio = async () => {
        try {
            await updateBio(bio);
            setEditingBio(false);
        } catch (err) {
            alert('Failed to save bio.');
        }
    };

    // Cleanly delete browser drafts without breaking UI navigation tree state
    const handleDeleteDraft = (e, draftIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this draft?')) {
            const updatedDrafts = drafts.filter((_, idx) => idx !== draftIndex);
            setDrafts(updatedDrafts);
            localStorage.setItem('bb_drafts', JSON.stringify(updatedDrafts));
        }
    };

    if (!user) return null;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 2.5rem 6rem', width: '100%' }}>
                <div style={{ marginTop: '2rem' }}>
                    <BackButton />
                </div>

                {/* Profile Header Block */}
                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <img
                        src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"}
                        alt={user.name}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--c-yellow)', boxShadow: '4px 4px 0 #000' }}
                    />
                    <div>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Your Transmissions</h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {metrics.publishedCount} Published • {metrics.totalViews} Views • {metrics.totalLikes} Likes
                        </p>
                        {user.role && user.role !== 'student' && (
                            <div style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '3px 8px',
                                background: 'var(--c-yellow)',
                                color: 'var(--c-black)',
                                fontFamily: 'Space Mono, monospace',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                borderRadius: '3px',
                                textTransform: 'uppercase',
                                border: '1px solid var(--c-black)'
                            }}>
                                {user.role} Admin
                            </div>
                        )}
                        <div style={{ marginTop: '0.75rem' }}>
                            {editingBio ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', flex: 1 }}
                                        maxLength={160}
                                    />
                                    <button onClick={handleSaveBio} style={{ padding: '0.5rem 0.75rem' }}>Save</button>
                                    <button onClick={() => { setEditingBio(false); setBio(user.bio || ''); }} style={{ padding: '0.5rem 0.75rem' }}>Cancel</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <p style={{ fontFamily: 'var(--font-mono)', color: '#ccc', margin: 0 }}>{user.bio || 'No bio yet.'}</p>
                                    <button onClick={() => setEditingBio(true)} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Edit</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation Menu Controls */}
                <div style={{ marginTop: '3rem', borderBottom: '2px solid rgba(255,255,255,0.2)', display: 'flex', gap: '2rem' }}>
                    {['published', 'pending', 'drafts'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === tab ? 'var(--c-yellow)' : 'var(--c-white)',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                padding: '0 0 1rem 0',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                borderBottom: activeTab === tab ? '4px solid var(--c-yellow)' : '4px solid transparent',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Elements Display Stack */}
                <div style={{ marginTop: '2.5rem' }}>
                    {loading && <p style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>Syncing database connection core...</p>}
                    
                    {!loading && items.length === 0 && (
                        <div style={{
                            padding: '3rem',
                            background: '#0A192F',
                            border: '2px dashed rgba(255,255,255,0.3)',
                            textAlign: 'center',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--c-white)'
                        }}>
                            You have no {activeTab} articles.
                        </div>
                    )}

                    {!loading && items.map((item, i) => (
                        <div key={item.id || i} style={{
                            background: 'var(--c-white)',
                            border: '2px solid var(--c-black)',
                            boxShadow: '6px 6px 0 var(--c-yellow)',
                            padding: '1.5rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (activeTab === 'published') navigate(`/blog/${item.id}`);
                            else if (activeTab === 'drafts') navigate(`/write-for-us?draft=${i}`);
                        }}>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h3 className="serif-heading" style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--c-black)' }}>
                                    {item.title || 'Untitled Transmission'}
                                </h3>
                                <p style={{ fontFamily: 'var(--font-serif)', color: '#444', fontSize: '0.95rem', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.subtitle || (item.contentHTML ? stripHtml(item.contentHTML).substring(0, 150) + '...' : item.content?.substring(0, 150) + '...') || 'No summary provided.'}
                                </p>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#666', fontWeight: 700 }}>
                                    {item.date ? new Date(item.date).toLocaleDateString() : 'Unsaved Date'} • {item.category || 'Uncategorized'}
                                </div>
                            </div>

                            {/* View/Like metrics segment for published list cards */}
                            {activeTab === 'published' && (
                                <div style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    background: '#f0f0f0',
                                    padding: '1rem 1.5rem',
                                    border: '2px solid #000',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    fontSize: '0.9rem'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', color: 'var(--c-black)', marginBottom: '0.2rem' }}>{item.views || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Views</div>
                                    </div>
                                    <div style={{ width: '2px', background: '#ccc' }}></div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', color: '#ff4d4d', marginBottom: '0.2rem' }}>{item.likes || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Likes</div>
                                    </div>
                                </div>
                            )}

                            {/* Options configuration tray for pending drafts lists */}
                            {activeTab !== 'published' && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        border: '2px solid var(--c-black)',
                                        background: item.status === 'hidden' ? '#000' : activeTab === 'pending' ? '#FFA500' : '#ccc',
                                        color: item.status === 'hidden' ? 'var(--c-yellow)' : 'var(--c-black)',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase'
                                    }}>
                                        {item.status === 'hidden' ? 'Hidden' : activeTab === 'pending' ? 'Reviewing' : 'Draft'}
                                    </div>
                                    {activeTab === 'drafts' && (
                                        <button
                                            onClick={(e) => handleDeleteDraft(e, i)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: '2px solid #c53030',
                                                background: '#fff',
                                                color: '#c53030',
                                                fontFamily: 'var(--font-mono)',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#c53030';
                                                e.currentTarget.style.color = '#fff';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.color = '#c53030';
                                            }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}