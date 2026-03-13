import React, { useState, useEffect, useMemo } from 'react';

// helper to remove HTML tags when generating previews
const stripHtml = (html = '') => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticleAPI } from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';

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

    // Load Author's Posts from DB
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchAuthorPosts = async () => {
            try {
                const authorPosts = await ArticleAPI.fetchByAuthor(user.name);
                setPosts(authorPosts);
            } catch (error) {
                console.error("Error fetching author posts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAuthorPosts();
    }, [user, navigate]);

    const { published, pending } = useMemo(() => {
        return {
            published: posts.filter(p => p.status === 'accepted'),
            pending: posts.filter(p => p.status === 'pending'),
        };
    }, [posts]);

    const getItemsForTab = () => {
        if (activeTab === 'published') return published;
        if (activeTab === 'pending') return pending;
        if (activeTab === 'drafts') return drafts;
        return [];
    };

    const items = getItemsForTab();

    // Calculate total metrics for accepted posts
    const totalViews = published.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalLikes = published.reduce((acc, p) => acc + (p.likes || 0), 0);

    if (!user) return null;

    const handleSaveBio = async () => {
        try {
            await updateBio(bio);
            setEditingBio(false);
        } catch (err) {
            alert('Failed to save bio.');
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 2.5rem 6rem', width: '100%' }}>
                <div style={{ marginTop: '2rem' }}>
                    <BackButton />
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <img
                        src={user.avatar}
                        alt={user.name}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--c-yellow)', boxShadow: '4px 4px 0 #000' }}
                    />
                    <div>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Your Transmissions</h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {published.length} Published • {totalViews} Views • {totalLikes} Likes
                        </p>
                        {user.role && user.role !== 'student' && (
                            <div style={{
                                display: 'inline-block',
                                marginTop: '0.25rem',
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
                        {/* user bio display/edit */}
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

                {/* Dashboard Tabs */}
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

                {/* List Container */}
                <div style={{ marginTop: '2.5rem' }}>
                    {loading && <p style={{ color: 'white', fontFamily: 'var(--font-mono)' }}>Loading your dashboard...</p>}
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
                            cursor: activeTab === 'published' ? 'pointer' : 'default'
                        }}
                            onClick={() => {
                                if (activeTab === 'published') navigate(`/blog/${item.id}`);
                                else if (activeTab === 'drafts') navigate(`/write-for-us?draft=${i}`);
                            }}>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h3 className="serif-heading" style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--c-black)' }}>
                                    {item.title || 'Untitled Draft'}
                                </h3>
                                <p style={{ fontFamily: 'var(--font-serif)', color: '#444', fontSize: '0.95rem', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.excerpt ||
                                        (item.contentHTML ? stripHtml(item.contentHTML).substring(0, 150) + '...' : item.content?.substring(0, 150) + '...')
                                        || 'No content.'}
                                </p>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#666', fontWeight: 700 }}>
                                    {item.date ? new Date(item.date).toLocaleDateString() : 'Unsaved Date'} • {item.category || 'Uncategorized'}
                                </div>
                            </div>

                            {/* Stats box for published */}
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

                            {/* Status badge for pending/drafts */}
                            {activeTab !== 'published' && (
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    border: '2px solid var(--c-black)',
                                    background: activeTab === 'pending' ? '#FFA500' : '#ccc',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    textTransform: 'uppercase'
                                }}>
                                    {activeTab === 'pending' ? 'Reviewing' : 'Draft'}
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
