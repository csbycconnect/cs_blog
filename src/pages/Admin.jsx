import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import emailjs from '@emailjs/browser';
import { useNavigate } from 'react-router-dom';
import { ArticleAPI, UserAPI } from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import { useAuth } from '../context/AuthContext';


export default function Admin() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Auth & Permissions
    const groups = user?.groups || [];
    const isAL0 = groups.includes('AL0');
    const isAL1 = groups.includes('AL1');
    const canReviewBlogs = isAL0 || isAL1;

    // Tabs
    const [activeTab, setActiveTab] = useState('review'); // 'review', 'manage_blogs', 'events', 'users'

    // Tab 1: Review
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loadingReview, setLoadingReview] = useState(true);

    // Tab 2: Manage Blogs
    const [acceptedBlogs, setAcceptedBlogs] = useState([]);
    const [loadingBlogs, setLoadingBlogs] = useState(false);

    // Tab 3: Events
    const [eventSubTab, setEventSubTab] = useState('create'); // 'create', 'manage'
    const [adminEvents, setAdminEvents] = useState([]);
    const [loadingAdminEvents, setLoadingAdminEvents] = useState(false);
    const [eventForm, setEventForm] = useState({
        date: '', timeStart: '', timeEnd: '', department: '', title: '', venue: '', description: '', note: '', category: '', posterUrl: ''
    });

    // Tab 4: Users
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Data Loaders
    useEffect(() => {
        if (activeTab === 'review' && canReviewBlogs) {
            fetchPendingArticles();
        } else if (activeTab === 'manage_blogs') {
            fetchAcceptedBlogs();
        } else if (activeTab === 'events' && eventSubTab === 'manage') {
            fetchAdminEvents();
        } else if (activeTab === 'users') {
            fetchUsersList();
        }
        // eslint-disable-next-line
    }, [activeTab, eventSubTab, canReviewBlogs]);

    const fetchPendingArticles = async () => {
        setLoadingReview(true);
        try {
            const sortedItems = await ArticleAPI.fetchByStatus('pending');
            setPendingArticles(sortedItems);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoadingReview(false);
        }
    };

    const fetchAcceptedBlogs = async () => {
        setLoadingBlogs(true);
        try {
            const sortedItems = await ArticleAPI.fetchByStatus('accepted');
            setAcceptedBlogs(sortedItems);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingBlogs(false);
        }
    };

    const fetchUsersList = async () => {
        setLoadingUsers(true);
        try {
            const allUsers = await UserAPI.fetchAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchAdminEvents = async () => {
        setLoadingAdminEvents(true);
        try {
            const allEvs = await ArticleAPI.fetchAllEvents();
            setAdminEvents(allEvs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAdminEvents(false);
        }
    };

    // Actions
    const handleAccept = async (article) => {
        try {
            await ArticleAPI.acceptArticle(article.id);
            setPendingArticles(prev => prev.filter(a => a.id !== article.id));

            // Send publication email via emailjs
            try {
                await emailjs.send(
                    import.meta.env.VITE_EMAILJS_SERVICE_ID,
                    import.meta.env.VITE_EMAILJS_TEMPLATE_PUBLICATION,
                    {
                        name: article.name ? article.name.split(' ')[0] : 'Contributor',
                        email: article.email || '',
                        title: article.title,
                        blog_link: `${window.location.origin}/blog/${article.id}`
                    },
                    import.meta.env.VITE_EMAILJS_PUBLIC_KEY
                );
            } catch (emailErr) {
                console.warn("Failed to send publication email. However, article was still published.", emailErr);
            }
        } catch (error) {
            alert("Failed to accept article.");
        }
    };

    const handleReject = async (article) => {
        try {
            await ArticleAPI.rejectArticle(article.id);
            setPendingArticles(prev => prev.filter(a => a.id !== article.id));

            // Send rejection email via emailjs using secondary credentials
            try {
                await emailjs.send(
                    import.meta.env.VITE_EMAILJS_REJECT_SERVICE_ID,
                    import.meta.env.VITE_EMAILJS_REJECT_TEMPLATE_ID,
                    {
                        name: article.name ? article.name.split(' ')[0] : 'Contributor',
                        email: article.email || '',
                        title: article.title
                    },
                    import.meta.env.VITE_EMAILJS_REJECT_PUBLIC_KEY
                );
            } catch (emailErr) {
                console.warn("Failed to send rejection email. However, article was still rejected.", emailErr);
            }

        } catch (error) {
            alert("Failed to reject article.");
        }
    };

    const handleSoftDelete = async (id) => {
        if (!window.confirm("Are you sure you want to hide/archive this article?")) return;
        try {
            await ArticleAPI.softDeleteArticle(id);
            setAcceptedBlogs(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            alert("Failed to hide article.");
        }
    };

    const handleHardDelete = async (id) => {
        if (!window.confirm("PERMANENTLY delete this article? This cannot be undone.")) return;
        try {
            await ArticleAPI.hardDeleteArticle(id);
            setAcceptedBlogs(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            alert("Failed to delete article.");
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            await ArticleAPI.createEvent({
                date: eventForm.date,
                department: eventForm.department,
                title: eventForm.title,
                time: {
                    start: eventForm.timeStart,
                    end: eventForm.timeEnd
                },
                venue: eventForm.venue,
                description: eventForm.description,
                note: eventForm.note,
                category: eventForm.category
            });
            alert("Event created successfully!");
            setEventForm({ date: '', timeStart: '', timeEnd: '', department: '', title: '', venue: '', description: '', note: '', category: '' });
        } catch (err) {
            console.error(err);
            alert("Failed to create event.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Shared Styles
    const inputStyle = {
        padding: '0.75rem', border: '2px solid var(--c-black)',
        fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: '100%',
        transition: 'all 0.1s', outline: 'none'
    };

    const labelStyle = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--c-black)' };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '4rem 2.5rem', width: '100%' }}>
                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '2.5rem', borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                                Admin Authority<span style={{ color: 'var(--c-yellow)' }}>.</span>
                            </h1>
                            <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                                Secured Dashboard Panel.
                            </p>
                            {groups.length > 0 && (
                                <div style={{ marginTop: '0.5rem', display: 'inline-block', background: 'var(--c-yellow)', color: 'var(--c-black)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, borderRadius: '4px' }}>
                                    {groups.join(', ')} Security Clearance
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'transparent', border: '2px solid var(--c-yellow)',
                                color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)',
                                fontWeight: 700, fontSize: '0.8rem', padding: '0.6rem 1.2rem',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-yellow)'; e.currentTarget.style.color = 'var(--c-black)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-yellow)'; }}
                        >
                            Logout
                        </button>
                    </div>

                    {/* Dashboard Tabs */}
                    <div style={{ marginBottom: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                        {[
                            { id: 'review', label: 'Editorial Review' },
                            { id: 'manage_blogs', label: 'Manage Blogs' },
                            { id: 'events', label: 'Record / Event Entry' },
                            { id: 'users', label: 'User Directory' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: activeTab === tab.id ? 'var(--c-yellow)' : 'var(--c-white)',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    padding: '0 0.5rem 0.8rem 0.5rem',
                                    cursor: 'pointer',
                                    borderBottom: activeTab === tab.id ? '4px solid var(--c-yellow)' : '4px solid transparent',
                                    transition: 'all 0.2s',
                                    marginBottom: '-2px'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* TAB VIEWS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* TAB 1: EDITORIAL REVIEW */}
                        {activeTab === 'review' && (
                            <>
                                {!canReviewBlogs ? (
                                    <div style={{ padding: '2rem', background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)' }}>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--c-black)', marginBottom: '1rem' }}>Access Restricted</p>
                                        <p style={{ fontFamily: 'var(--font-mono)', color: '#555' }}>You do not have permission to view pending articles in the review queue.</p>
                                    </div>
                                ) : loadingReview ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading submissions...</p>
                                ) : pendingArticles.length === 0 ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)' }}>No pending submissions currently.</p>
                                ) : (
                                    pendingArticles.map(article => (
                                        <div key={article.id} style={{
                                            background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                                <div style={{ flex: 1, minWidth: '100%' }}>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-black)', marginBottom: '0.5rem' }}>
                                                        {article.category || 'Article'} • By {article.name || 'Anonymous'} • {article.date ? new Date(article.date).toLocaleDateString() : ''}
                                                    </div>
                                                    <h2 className="serif-heading" style={{ fontSize: '1.8rem', color: 'var(--c-black)', marginBottom: '1rem', lineHeight: 1.2 }}>
                                                        {article.title}
                                                    </h2>
                                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555', marginBottom: '1.5rem', lineHeight: 1.6, wordWrap: 'break-word', wordBreak: 'break-word' }}>
                                                        {article.excerpt}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', minWidth: '120px' }}>
                                                    <button onClick={() => handleAccept(article)} style={{ background: 'var(--c-black)', border: '2px solid var(--c-black)', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.75rem', cursor: 'pointer', textAlign: 'center' }}>
                                                        ACCEPT
                                                    </button>
                                                    <button onClick={() => handleReject(article)} style={{ background: 'transparent', border: '2px solid var(--c-black)', color: 'var(--c-black)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.75rem', cursor: 'pointer', textAlign: 'center' }}>
                                                        REJECT
                                                    </button>
                                                </div>
                                            </div>

                                            <details style={{ marginTop: '1.5rem', borderTop: '2px dashed #ccc', paddingTop: '1rem' }}>
                                                <summary style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--c-black)' }}>View Full Content</summary>
                                                <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: '1.5rem', border: '1px solid #ddd' }}>
                                                    {article.contentHTML ?
                                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.contentHTML) }} />
                                                        : article.content
                                                    }
                                                </div>
                                            </details>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {/* TAB 2: MANAGE BLOGS */}
                        {activeTab === 'manage_blogs' && (
                            <>
                                {loadingBlogs ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading accepted blogs...</p>
                                ) : acceptedBlogs.length === 0 ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)' }}>No accepted blogs available.</p>
                                ) : (
                                    acceptedBlogs.map(article => (
                                        <div key={article.id} style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-black)', padding: '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                <div>
                                                    <h3 className="serif-heading" style={{ fontSize: '1.4rem', margin: '0 0 0.25rem 0', color: 'var(--c-black)' }}>{article.title}</h3>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#555' }}>
                                                        By {article.name || 'Anonymous'} • {article.date ? new Date(article.date).toLocaleDateString() : ''}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {(isAL1 || isAL0) && (
                                                        <button onClick={() => handleSoftDelete(article.id)} style={{ background: '#f0f0f0', border: '2px solid var(--c-black)', padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                                            Hide / Remove
                                                        </button>
                                                    )}
                                                    {isAL0 && (
                                                        <button onClick={() => handleHardDelete(article.id)} style={{ background: '#c53030', color: 'white', border: '2px solid var(--c-black)', padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                                                            PERMANENT DELETE
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}

                        {/* TAB 3: EVENTS ENTRY & MANAGE */}
                        {activeTab === 'events' && (
                            <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                                    <h2 className="serif-heading" style={{ color: 'var(--c-black)', fontSize: '1.8rem', margin: 0 }}>Events Dashboard</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => setEventSubTab('create')} style={{ background: eventSubTab === 'create' ? 'var(--c-yellow)' : 'transparent', border: '1px solid var(--c-black)', padding: '0.3rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Create</button>
                                        <button onClick={() => setEventSubTab('manage')} style={{ background: eventSubTab === 'manage' ? 'var(--c-yellow)' : 'transparent', border: '1px solid var(--c-black)', padding: '0.3rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Manage Past</button>
                                    </div>
                                </div>

                                {eventSubTab === 'create' ? (
                                    <form onSubmit={handleEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>Date</label>
                                                <input type="date" required value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>Department</label>
                                                <input type="text" required placeholder="e.g. CS Dept" value={eventForm.department} onChange={e => setEventForm(p => ({ ...p, department: e.target.value }))} style={inputStyle} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={labelStyle}>Event Title</label>
                                            <input type="text" required placeholder="International Women's Day — Tech Panel" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>Start Time</label>
                                                <input type="time" required value={eventForm.timeStart} onChange={e => setEventForm(p => ({ ...p, timeStart: e.target.value }))} style={inputStyle} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>End Time</label>
                                                <input type="time" required value={eventForm.timeEnd} onChange={e => setEventForm(p => ({ ...p, timeEnd: e.target.value }))} style={inputStyle} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>Venue</label>
                                                <input type="text" required placeholder="Seminar Hall B" value={eventForm.venue} onChange={e => setEventForm(p => ({ ...p, venue: e.target.value }))} style={inputStyle} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={labelStyle}>Category</label>
                                                <input type="text" required placeholder="CS Dept" value={eventForm.category} onChange={e => setEventForm(p => ({ ...p, category: e.target.value }))} style={inputStyle} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={labelStyle}>Event Description</label>
                                            <textarea required rows={3} placeholder="Main event description..." value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={labelStyle}>Additional Notes</label>
                                            <textarea rows={2} placeholder="Optional notes for attendees..." value={eventForm.note} onChange={e => setEventForm(p => ({ ...p, note: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={labelStyle}>Poster Image URL</label>
                                            <input type="url" placeholder="Optional raw GitHub link, Drive link, etc..." value={eventForm.posterUrl} onChange={e => setEventForm(p => ({ ...p, posterUrl: e.target.value }))} style={inputStyle} />
                                        </div>

                                        <button type="submit" style={{ background: 'var(--c-yellow)', border: '2px solid var(--c-black)', padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '4px 4px 0 #000', marginTop: '1rem' }}>
                                            CREATE EVENT
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {loadingAdminEvents ? (
                                            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-black)' }}>Iterating events table...</p>
                                        ) : adminEvents.length === 0 ? (
                                            <p style={{ fontFamily: 'var(--font-mono)', color: '#555' }}>No events constructed yet.</p>
                                        ) : (
                                            adminEvents.filter(ev => {
                                                const d = new Date(ev.date);
                                                d.setHours(0, 0, 0, 0);
                                                return d < new Date(); // Past events only
                                            }).map(ev => (
                                                <div key={ev.id} style={{ background: '#f5f5f5', border: '1px solid #ccc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <h3 className="serif-heading" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--c-black)' }}>{ev.title}</h3>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', background: '#e0e0e0', color: '#000' }}>{ev.date}</span>
                                                    </div>

                                                    {ev.posterUrl || ev.imageUrl ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '40px', height: '40px', background: '#ccc', backgroundImage: `url(${ev.posterUrl || ev.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--c-black)' }} />
                                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'green', fontWeight: 700 }}>Poster Bound</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#c53030', fontWeight: 700 }}>No Poster</span>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid #ddd', paddingTop: '0.5rem' }}>
                                                        <input
                                                            type="url" placeholder="Event Poster URL..."
                                                            defaultValue={ev.posterUrl || ev.imageUrl || ''}
                                                            id={`poster-input-${ev.id}`}
                                                            style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                                        />
                                                        <input
                                                            type="text" placeholder="Gallery Links (Comma separated)..."
                                                            defaultValue={ev.galleryUrls || ''}
                                                            id={`gallery-input-${ev.id}`}
                                                            style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                                        />
                                                        <input
                                                            type="text" placeholder="Geo-tagged Links (Comma separated)..."
                                                            defaultValue={ev.geoTagUrls || ''}
                                                            id={`geotag-input-${ev.id}`}
                                                            style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                const p = document.getElementById(`poster-input-${ev.id}`).value;
                                                                const g = document.getElementById(`gallery-input-${ev.id}`).value;
                                                                const geo = document.getElementById(`geotag-input-${ev.id}`).value;
                                                                try {
                                                                    await ArticleAPI.updateEventMedia(ev.id, { posterUrl: p, galleryUrls: g, geoTagUrls: geo });
                                                                    alert("Media links saved successfully.");
                                                                    fetchAdminEvents();
                                                                } catch (e) {
                                                                    alert("Failed to update media links.");
                                                                }
                                                            }}
                                                            style={{ background: 'var(--c-black)', color: 'var(--c-white)', border: '1px solid var(--c-black)', padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
                                                            SAVE MEDIA
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: USERS DIRECTORY */}
                        {activeTab === 'users' && (
                            <>
                                {loadingUsers ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Fetching directory...</p>
                                ) : users.length === 0 ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)' }}>No users found.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                        {users.map((u, i) => (
                                            <div key={i} style={{ background: '#0A192F', border: '2px dashed var(--c-yellow)', padding: '1.5rem', color: 'var(--c-white)' }}>
                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--c-yellow)', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
                                                    {u.id}
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: '#ddd' }}>
                                                    {u.bio ? (
                                                        <span style={{ fontStyle: 'italic' }}>"{u.bio}"</span>
                                                    ) : (
                                                        <span style={{ opacity: 0.5 }}>No bio set.</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </AnimateOnScroll>
            </main>
            <Footer />
        </div>
    );
}
