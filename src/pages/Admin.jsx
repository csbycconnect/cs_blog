import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import emailjs from '@emailjs/browser';
import { useNavigate } from 'react-router-dom';
import { ArticlesService } from '../services/articles';
import { UserService } from '../services/users';
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
    const [allBlogs, setAllBlogs] = useState([]); // Holds all articles (accepted + hidden)
    const [loadingBlogs, setLoadingBlogs] = useState(false);
    const [blogSearchQuery, setBlogSearchQuery] = useState('');
    const [cachedBlogs, setCachedBlogs] = useState([]); // Master cache layer

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
    const [cachedUsers, setCachedUsers] = useState([]); // User cache layer
    const [searchQuery, setSearchQuery] = useState('');

    // Memoized user directory filter
    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (u.id && u.id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [users, searchQuery]);

    // Memoized blog catalog filter (Searches across titles, status, categories, and authors)
    const filteredBlogs = useMemo(() => {
        return allBlogs.filter(blog =>
            (blog.title || '').toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
            (blog.subtitle || '').toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
            (blog.category || '').toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
            (blog.name || '').toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
            (blog.status || '').toLowerCase().includes(blogSearchQuery.toLowerCase())
        );
    }, [allBlogs, blogSearchQuery]);

    // Dynamic Data Sync Loader
    useEffect(() => {
        if (activeTab === 'review' && canReviewBlogs) {
            fetchPendingArticles();
        } else if (activeTab === 'manage_blogs') {
            if (cachedBlogs.length > 0) {
                setAllBlogs(cachedBlogs);
                return;
            }
            fetchAdminBlogs();
        } else if (activeTab === 'events' && eventSubTab === 'manage') {
            fetchAdminEvents();
        } else if (activeTab === 'users') {
            if (cachedUsers.length > 0) {
                setUsers(cachedUsers);
                return;
            }
            fetchUsersList();
        }
        // eslint-disable-next-line
    }, [activeTab, eventSubTab, canReviewBlogs, cachedBlogs, cachedUsers]);

    const fetchPendingArticles = async () => {
        setLoadingReview(true);
        try {
            const sortedItems = await ArticlesService.fetchByStatus('pending');
            setPendingArticles(sortedItems);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoadingReview(false);
        }
    };

    const fetchAdminBlogs = async () => {
        setLoadingBlogs(true);
        try {
            let data = [];

            // Step 1: Try the dedicated admin endpoint first
            try {
                if (typeof ArticlesService.fetchAllAdminBlogs === 'function') {
                    data = await ArticlesService.fetchAllAdminBlogs();
                }
            } catch (adminRouteError) {
                console.warn("Admin-specific route failed, attempting automatic status-fallback mesh...", adminRouteError);
            }

            // Step 2: If the admin route returned empty or failed, use the reliable status fallback mesh
            if (!data || data.length === 0) {
                console.log("Fetching via individual status pools...");
                const accepted = await ArticlesService.fetchByStatus('accepted').catch(() => []);
                const hidden = await ArticlesService.fetchByStatus('hidden').catch(() => []);
                const pending = await ArticlesService.fetchByStatus('pending').catch(() => []);

                // Combine them all together safely
                data = [...accepted, ...hidden, ...pending];
            }

            // Step 3: Remove duplicate items if any overlapped
            const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());

            setAllBlogs(uniqueData);
            setCachedBlogs(uniqueData);
        } catch (error) {
            console.error("Critical failure reading backend catalogue records:", error);
            alert("Could not load blogs from the database. Displaying empty catalog.");
            setAllBlogs([]);
        } finally {
            // This MUST run, ensuring the "READING CATALOGUE..." message goes away!
            setLoadingBlogs(false);
        }
    };

    const fetchUsersList = async () => {
        setLoadingUsers(true);
        try {
            const allUsers = await UserService.fetchAll();
            setUsers(allUsers);
            setCachedUsers(allUsers); // Keep base directories mapped in line
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchAdminEvents = async () => {
        setLoadingAdminEvents(true);
        try {
            const allEvs = await ArticlesService.fetchAllEvents();
            setAdminEvents(allEvs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingAdminEvents(false);
        }
    };

    // Editorial Action Handlers
    const handleAccept = async (article) => {
        try {
            await ArticlesService.updateStatus(article.id, 'accepted');
            setPendingArticles(prev => prev.filter(a => a.id !== article.id));

            // Force cache clearance so that Tab 2 re-fetches the updated record list on transition
            setCachedBlogs([]);

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
                console.warn("Failed to send publication email. Article was still published.", emailErr);
            }
        } catch (error) {
            alert("Failed to accept article.");
        }
    };

    const handleReject = async (article) => {
        try {
            await ArticlesService.rejectArticle(article.id);
            setPendingArticles(prev => prev.filter(a => a.id !== article.id));

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
                console.warn("Failed to send rejection email. Article was still rejected.", emailErr);
            }
        } catch (error) {
            alert("Failed to reject article.");
        }
    };

    const handleToggleVisibility = async (id, currentStatus) => {
        const targetStatus = currentStatus === 'hidden' ? 'accepted' : 'hidden';
        try {
            if (typeof ArticlesService.updateStatus === 'function') {
                await ArticlesService.updateStatus(id, targetStatus);
            } else {
                await fetch(`/api/articles/updateStatus`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status: targetStatus })
                });
            }

            const syncArray = (prev) => prev.map(b => b.id === id ? { ...b, status: targetStatus } : b);
            setAllBlogs(syncArray);
            setCachedBlogs(syncArray);
            alert(`Article shifted to ${targetStatus} visualization protocol.`);
        } catch (e) {
            console.error(e);
            alert("Failed to change article visibility status.");
        }
    };

    const handlePermanentDeleteBlog = async (id) => {
        if (!window.confirm("CRITICAL PROTOCOL > Permanently delete this article record from DynamoDB? This cannot be undone.")) return;
        try {
            if (typeof ArticlesService.deleteArticle === 'function') {
                await ArticlesService.deleteArticle(id);
            } else if (typeof ArticlesService.hardDeleteArticle === 'function') {
                await ArticlesService.hardDeleteArticle(id);
            }

            const syncArray = (prev) => prev.filter(b => b.id !== id);
            setAllBlogs(syncArray);
            setCachedBlogs(syncArray);
        } catch (e) {
            console.error(e);
            alert("Failed to execute data deletion sweep.");
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        try {
            await ArticlesService.createEvent({
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
            setEventForm({ date: '', timeStart: '', timeEnd: '', department: '', title: '', venue: '', description: '', note: '', category: '', posterUrl: '' });
        } catch (err) {
            console.error(err);
            alert("Failed to create event.");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleRoleChange = async (userId, currentGroupsArray, direction) => {
        const rolesOrder = ['User', 'AL2', 'AL1', 'AL0'];

        // Extract primary string rank token out of existing user context arrays safely
        const currentRole = Array.isArray(currentGroupsArray)
            ? (currentGroupsArray.includes('AL0') ? 'AL0' : currentGroupsArray.includes('AL1') ? 'AL1' : currentGroupsArray.includes('AL2') ? 'AL2' : 'User')
            : 'User';

        let currentIndex = rolesOrder.indexOf(currentRole);
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = direction === 'promote' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= rolesOrder.length) return;

        const targetRole = rolesOrder[nextIndex];
        if (!window.confirm(`Are you sure you want to change this user's clearance level to ${targetRole}?`)) return;

        try {
            await UserService.updateUserRole(userId, targetRole);

            // Reconstruct modern structural arrays to accurately match component list groupings instantly
            const updatedGroups = targetRole === 'User' ? [] : [targetRole];
            const updateArray = (prev) => prev.map(u => u.id === userId ? { ...u, groups: updatedGroups } : u);

            setUsers(updateArray);
            setCachedUsers(updateArray);
        } catch (err) {
            alert("Clearance transmission override failed.");
            console.error(err);
        }
    };

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
                                    background: 'transparent', border: 'none',
                                    color: activeTab === tab.id ? 'var(--c-yellow)' : 'var(--c-white)',
                                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem',
                                    padding: '0 0.5rem 0.8rem 0.5rem', cursor: 'pointer',
                                    borderBottom: activeTab === tab.id ? '4px solid var(--c-yellow)' : '4px solid transparent',
                                    transition: 'all 0.2s', marginBottom: '-2px'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

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
                                        <div key={article.id} style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                                <div style={{ flex: 1, minWidth: '280px' }}>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#000000', marginBottom: '0.5rem' }}>
                                                        {/* ✅ FIXED: Matches authorName field from database */}
                                                        {article.category || 'Article'} • By {article.authorName || article.name || 'Anonymous'} • {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Recent'}
                                                    </div>
                                                    <h2 className="serif-heading" style={{ fontSize: '1.8rem', color: 'var(--c-black)', marginBottom: '1rem', lineHeight: 1.2 }}>
                                                        {article.title}
                                                    </h2>
                                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#333333', marginBottom: '1.5rem', lineHeight: 1.6, wordWrap: 'break-word', wordBreak: 'break-word' }}>
                                                        {article.subtitle || article.excerpt || "No subtitle provided."}
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
                                                <summary style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--c-black)' }}>
                                                    View Full Content
                                                </summary>
                                                <div style={{
                                                    marginTop: '1rem',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '0.85rem',
                                                    color: '#000000', // 👈 FIXED: Explicitly set text color to solid black
                                                    lineHeight: 1.6,
                                                    whiteSpace: 'pre-wrap',
                                                    background: '#f9f9f9', // 👈 Light background for high contrast
                                                    padding: '1.5rem',
                                                    border: '1px solid #ddd'
                                                }}>
                                                    {/* ✅ FIXED: Safely tests for both types of content structures without rendering blanks */}
                                                    {article.contentHTML && article.contentHTML.trim() !== "" ? (
                                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.contentHTML) }} />
                                                    ) : (
                                                        <div>{article.content || "No text content payload detected in this database record."}</div>
                                                    )}
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
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="SEARCH_CATALOGUE > Enter title, author, category, or status (e.g. 'hidden')..."
                                        value={blogSearchQuery}
                                        onChange={(e) => setBlogSearchQuery(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: '#040D1A', border: '2px solid var(--c-yellow)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', outline: 'none', boxShadow: '4px 4px 0 #000' }}
                                    />
                                </div>

                                {loadingBlogs ? (
                                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>READING CATALOGUE DATABASE CORES...</div>
                                ) : filteredBlogs.length === 0 ? (
                                    <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>NO CATALOGUE ARTICLES MATCHING CRITERIA.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {filteredBlogs.map((blog) => {
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
                                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#8892b0' }}>{blog.subtitle}</p>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleToggleVisibility(blog.id, blog.status)}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: isHidden ? 'var(--c-yellow)' : '#222',
                                                                border: isHidden ? '2px solid var(--c-yellow)' : '2px solid #aaa',
                                                                color: isHidden ? '#000' : '#fff',
                                                                fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
                                                            }}
                                                        >
                                                            {isHidden ? '👁️ SHOW' : '👁️‍🗨️ HIDE'}
                                                        </button>
                                                        {isAL0 && (
                                                            <button onClick={() => handlePermanentDeleteBlog(blog.id)} style={{ padding: '0.5rem 1rem', background: '#1A0B0B', border: '2px solid #EF4444', color: '#FCA5A5', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>
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
                        )}

                        {/* TAB 3: EVENTS */}
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
                                            <input type="text" required placeholder="International Women's Day" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
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
                                            <input type="url" placeholder="Optional URL linkage..." value={eventForm.posterUrl} onChange={e => setEventForm(p => ({ ...p, posterUrl: e.target.value }))} style={inputStyle} />
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
                                            adminEvents.map(ev => (
                                                <div key={ev.id} style={{ background: '#f5f5f5', border: '1px solid #ccc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <h3 className="serif-heading" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--c-black)' }}>{ev.title}</h3>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', background: '#e0e0e0', color: '#000' }}>{ev.date}</span>
                                                    </div>

                                                    {(ev.posterUrl || ev.imageUrl) ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '40px', height: '40px', background: '#ccc', backgroundImage: `url(${ev.posterUrl || ev.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--c-black)' }} />
                                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'green', fontWeight: 700 }}>Poster Bound</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#c53030', fontWeight: 700 }}>No Poster</span>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid #ddd', paddingTop: '0.5rem' }}>
                                                        <input type="url" placeholder="Event Poster URL..." defaultValue={ev.posterUrl || ev.imageUrl || ''} id={`poster-input-${ev.id}`} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                                        <input type="text" placeholder="Gallery Links (Comma separated)..." defaultValue={ev.galleryUrls || ''} id={`gallery-input-${ev.id}`} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                                        <input type="text" placeholder="Geo-tagged Links..." defaultValue={ev.geoTagUrls || ''} id={`geotag-input-${ev.id}`} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                                        <button
                                                            onClick={async () => {
                                                                const p = document.getElementById(`poster-input-${ev.id}`).value;
                                                                const g = document.getElementById(`gallery-input-${ev.id}`).value;
                                                                const geo = document.getElementById(`geotag-input-${ev.id}`).value;
                                                                try {
                                                                    await ArticlesService.updateEventMedia(ev.id, { posterUrl: p, galleryUrls: g, geoTagUrls: geo });
                                                                    alert("Media links saved successfully.");
                                                                    fetchAdminEvents();
                                                                } catch (e) {
                                                                    alert("Failed to update media links.");
                                                                }
                                                            }}
                                                            style={{ background: 'var(--c-black)', color: 'var(--c-white)', border: '1px solid var(--c-black)', padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                                                        >
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
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="SEARCH_DIRECTORY > Enter user name, email, or sub ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem', background: '#040D1A', border: '2px solid var(--c-yellow)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', outline: 'none', boxShadow: '4px 4px 0 #000' }}
                                    />
                                </div>

                                {loadingUsers ? (
                                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>INITIALIZING DIRECTORY PROTOCOL...</div>
                                ) : filteredUsers.length === 0 ? (
                                    <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.5 }}>NO DIRECTORY ENTRIES FOUND MATCHING CRITERIA.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                                        {[
                                            { title: '👑 SEC_CLEARANCE_LEVEL_0 (Super Admins)', type: 'AL0' },
                                            { title: '🛡️ SEC_CLEARANCE_LEVEL_1 (Editorial Admins)', type: 'AL1' },
                                            { title: '🛡️ SEC_CLEARANCE_LEVEL_2 (Moderator Admins)', type: 'AL2' },
                                            { title: '💻 REGISTERED_OPERATORS (Raw Users)', type: 'Raw' }
                                        ].map(group => {
                                            const groupUsers = filteredUsers.filter(u => {
                                                const userGroups = u.groups || [];
                                                if (group.type === 'Raw') {
                                                    return !userGroups.includes('AL0') && !userGroups.includes('AL1') && !userGroups.includes('AL2');
                                                }
                                                return userGroups.includes(group.type);
                                            });

                                            if (groupUsers.length === 0) return null;

                                            return (
                                                <div key={group.type}>
                                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--c-yellow)', marginBottom: '1rem', borderBottom: '1px dashed rgba(250,204,21,0.3)', paddingBottom: '0.25rem' }}>
                                                        {group.title} — {groupUsers.length} node(s)
                                                    </h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                                        {groupUsers.map((u, i) => (
                                                            <div key={u.id || i} style={{ background: '#0A192F', border: '2px dashed var(--c-yellow)', padding: '1.5rem', color: 'var(--c-white)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                                <div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                                                                        {u.name || 'Anonymous User'}
                                                                    </div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#8892b0', marginBottom: '0.5rem' }}>
                                                                        {u.email}
                                                                    </div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', opacity: 0.4, wordBreak: 'break-all' }}>
                                                                        SUB: {u.id}
                                                                    </div>
                                                                    {(u.groups || []).length > 0 && (
                                                                        <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--c-yellow)' }}>
                                                                            TAGS: {(u.groups || []).join(', ')}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {isAL0 && (
                                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(250, 204, 21, 0.1)' }}>
                                                                        <button onClick={() => handleRoleChange(u.id, u.groups, 'demote')} style={{ flex: 1, padding: '0.25rem 0.5rem', background: '#1A0B0B', border: '1px solid #EF4444', color: '#FCA5A5', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer' }}>▼ DEMOTE</button>
                                                                        <button onClick={() => handleRoleChange(u.id, u.groups, 'promote')} style={{ flex: 1, padding: '0.25rem 0.5rem', background: '#0B1A0E', border: '1px solid #22C55E', color: '#86EFAC', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', cursor: 'pointer' }}>▲ PROMOTE</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
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