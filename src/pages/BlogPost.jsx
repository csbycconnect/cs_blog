import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArticlesService } from '../services/articles';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackButton from '../components/shared/BackButton';

// helper to remove HTML tags when generating previews
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

    // Load Author's Posts from DB properly matching DynamoDB CSV scheme fields
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchAuthorPosts = async () => {
            try {
                setLoading(true);
                
                // Fetch using established fallback chains to catch everything
                let data = [];
                if (typeof ArticlesService.getAccepted === 'function') {
                    data = await ArticlesService.getAccepted();
                } else if (typeof ArticlesService.fetchByStatus === 'function') {
                    data = await ArticlesService.fetchByStatus('accepted');
                } else {
                    const res = await fetch('/api/articles');
                    if (res.ok) data = await res.json();
                }

                let pendingData = [];
                if (typeof ArticlesService.getPending === 'function') {
                    pendingData = await ArticlesService.getPending().catch(() => []);
                }

                const combinedDataset = [...(data || []), ...(pendingData || [])];

                // Map precisely against the true data definitions present in your CSV dump
                const userEmail = (user.email || '').toLowerCase();
                const userSub = (user.sub || user.id || '').toLowerCase();
                const userName = (user.name || '').toLowerCase();

                const filtered = combinedDataset.filter(art => 
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

    // Handle profile bio saving transitions
    const handleSaveBio = async () => {
        try {
            await updateBio(bio);
            setEditingBio(false);
        } catch (err) {
            alert('Failed to save bio.');
        }
    };

    // Cleanly delete browser drafts without triggering unintended item container navigation clicks
    const handleDeleteDraft = (e, draftIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this draft?')) {
            const updatedDrafts = drafts.filter((_, idx) => idx !== draftIndex);
            setDrafts(updatedDrafts);
            localStorage.setItem('bb_drafts', JSON.stringify(updatedDrafts));
        }
    };

    // Distribute records to tabs dynamically based on status properties
    const published = useMemo(() => posts.filter(p => p.status === 'accepted'), [posts]);
    const pending = useMemo(() => posts.filter(p => p.status === 'pending' || p.status === 'hidden'), [posts]);

    const getItemsForTab = () => {
        if (activeTab === 'published') return published;
        if (activeTab === 'pending') return pending;
        if (activeTab === 'drafts') return drafts;
        return [];
    };

    const currentItems = getItemsForTab();

    if (!user) return null;

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            
            <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 2.5rem 6rem', width: '100%' }}>
                <div style={{ marginTop: '2rem' }}>
                    <BackButton />
                </div>

                {/* Profile Header */}
                <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <img 
                        src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"} 
                        alt={user.name} 
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--c-yellow)', boxShadow: '4px 4px 0 #000' }}
                    />
                    <div>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', margin: '0 0 0.5rem 0', fontSize: '2.5rem' }}>Your Transmissions</h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {published.length} Published • {posts.reduce((acc, p) => acc + (parseInt(p.views) || 0), 0)} Views • {posts.reduce((acc, p) => acc + (parseInt(p.likes) || 0), 0)} Likes
                        </p>
                        
                        <div style={{ marginTop: '0.75rem' }}>
                            {editingBio ? (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={bio} 
                                        onChange={(e) => setBio(e.target.value)}
                                        style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', border: '2px solid var(--c-black)', outline: 'none', width: '250px' }}
                                        maxLength={150}
                                    />
                                    <button onClick={handleSaveBio} style={{ padding: '0.3rem 0.7rem', background: 'var(--c-yellow)', border: '2px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>SAVE</button>
                                    <button onClick={() => { setEditingBio(false); setBio(user.bio || ''); }} style={{ padding: '0.3rem 0.7rem', background: '#fff', border: '2px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}>CANCEL</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
                                        {user.bio || "No bio transmission received yet..."}
                                    </p>
                                    <button 
                                        onClick={() => setEditingBio(true)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                                    >
                                        [EDIT]
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs selection control row */}
                <div style={{ marginTop: '3rem', borderBottom: '2px solid rgba(255,255,255,0.2)', display: 'flex', gap: '2rem' }}>
                    {['published', 'pending', 'drafts'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: activeTab === tab ? 'var(--c-yellow)' : 'var(--c-white)',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '700',
                                fontSize: '1.1rem',
                                padding: '0 0 1rem 0',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                borderBottom: activeTab === tab ? '4px solid var(--c-yellow)' : '4px solid transparent',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            {tab} ({tab === 'published' ? published.length : tab === 'pending' ? pending.length : drafts.length})
                        </button>
                    ))}
                </div>

                {/* Main dynamic mapping card feed lists container */}
                <div style={{ marginTop: '2.5rem' }}>
                    {loading && (
                        <p style={{ color: 'var(--c-white)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                            SYNCING DATA TRANSFERS WITH COGNITO/DYNAMODB CORE...
                        </p>
                    )}

                    {!loading && currentItems.length === 0 && (
                        <div style={{ border: '2px dashed rgba(255,255,255,0.2)', padding: '4rem 2rem', textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', margin: 0, textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                No transmissions recorded within the "{activeTab}" matrix block.
                            </p>
                        </div>
                    )}

                    {!loading && currentItems.map((item, i) => (
                        <div 
                            key={item.id || i}
                            onClick={() => {
                                if (activeTab === 'published') {
                                    navigate(`/blog/${item.id}`);
                                } else if (activeTab === 'drafts') {
                                    navigate(`/write-for-us?draft=${i}`);
                                }
                            }}
                            className="article-card"
                            style={{
                                backgroundColor: 'var(--c-white)',
                                border: '2px solid var(--c-black)',
                                padding: '1.5rem',
                                marginBottom: '1.5rem',
                                boxShadow: '4px 4px 0 var(--c-black)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1.5rem',
                                cursor: activeTab === 'pending' ? 'default' : 'pointer',
                                transition: 'transform 0.2s, boxShadow 0.2s'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', backgroundColor: 'var(--c-black)', color: 'var(--c-yellow)', padding: '0.2rem 0.5rem', textTransform: 'uppercase' }}>
                                        {item.category || "UNASSIGNED"}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#666' }}>
                                        {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'RAW CHIPS'}
                                    </span>
                                </div>
                                
                                <h3 className="serif-heading" style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: 'var(--c-black)', lineHeight: '1.2' }}>
                                    {item.title || "Untitled Fragment Transmission"}
                                </h3>
                                
                                <p style={{ margin: 0, fontFamily: 'var(--font-serif)', color: '#444', fontSize: '0.95rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.subtitle || (item.contentHTML ? stripHtml(item.contentHTML).substring(0, 160) + '...' : item.content?.substring(0, 160) + '...') || "No content logging attached."}
                                </p>
                            </div>

                            {/* View counters display logic tray */}
                            {activeTab === 'published' && (
                                <div style={{ display: 'flex', gap: '1rem', borderLeft: '1px dashed #ccc', paddingLeft: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '700', color: 'var(--c-black)', textAlign: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '1.1rem' }}>{item.views || 0}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#666' }}>VIEWS</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', color: '#ff4d4d' }}>{item.likes || 0}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#666' }}>LIKES</div>
                                    </div>
                                </div>
                            )}

                            {/* Option tags tray for unfinished structures */}
                            {activeTab !== 'published' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ 
                                        fontFamily: 'var(--font-mono)', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '700', 
                                        border: '2px solid var(--c-black)', 
                                        padding: '0.3rem 0.6rem',
                                        backgroundColor: item.status === 'hidden' ? '#000' : activeTab === 'pending' ? 'var(--c-yellow)' : '#eee',
                                        color: item.status === 'hidden' ? 'var(--c-yellow)' : 'var(--c-black)'
                                    }}>
                                        {item.status === 'hidden' ? 'HIDDEN' : activeTab === 'pending' ? 'REVIEW' : 'LOCAL'}
                                    </span>

                                    {activeTab === 'drafts' && (
                                        <button
                                            onClick={(e) => handleDeleteDraft(e, i)}
                                            style={{
                                                padding: '0.3rem 0.6rem',
                                                background: '#fff',
                                                border: '2px solid #c53030',
                                                color: '#c53030',
                                                fontFamily: 'var(--font-mono)',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
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