import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ByteboardLoader from './components/shared/ByteboardLoader';
import GlobalBackground from './components/layout/GlobalBackground';
import AdminRoute from './components/shared/AdminRoute';

// Lazy loading all page components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Blogs = lazy(() => import('./pages/Blogs'));
const Events = lazy(() => import('./pages/Events'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Login = lazy(() => import('./pages/Login'));
const Gallery = lazy(() => import('./pages/Gallery'));
const WriteForUs = lazy(() => import('./pages/WriteForUs'));
const CSConnect = lazy(() => import('./pages/CSConnect'));
const FacultyProfile = lazy(() => import('./pages/FacultyProfile'));
const Admin = lazy(() => import('./pages/Admin'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const YourBlogs = lazy(() => import('./pages/YourBlogs'));
const Account = lazy(() => import('./pages/Account'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
    // Show the loader only once per browser session.
    const [loading, setLoading] = useState(() => {
        const alreadyShown = sessionStorage.getItem('bb_loader_shown');
        const isWriteForUs = window.location.pathname === '/write-for-us';
        return !alreadyShown && !isWriteForUs;
    });

    useEffect(() => {
        // Cleanup stale data (older than 24 hours) from localStorage to improve Speed Index / storage overhead
        try {
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();
            
            // Clean autosaves older than 1 day
            const autosave = localStorage.getItem('bb_autosave');
            if (autosave) {
                const parsed = JSON.parse(autosave);
                // Assuming autosave is continuously updated, we just clear it if it hasn't been touched in a day.
                // Best effort cleanup if no timestamp exists
                if (!parsed.timestamp || (now - parsed.timestamp > ONE_DAY)) {
                    localStorage.removeItem('bb_autosave');
                }
            }

            // Clean drafts older than 7 days
            const draftsStr = localStorage.getItem('bb_drafts');
            if (draftsStr) {
                const drafts = JSON.parse(draftsStr);
                const SEVEN_DAYS = 7 * ONE_DAY;
                const freshDrafts = drafts.filter(d => (now - (d.lastUpdated || d.date || 0)) < SEVEN_DAYS);
                if (freshDrafts.length !== drafts.length) {
                    localStorage.setItem('bb_drafts', JSON.stringify(freshDrafts));
                }
            }
        } catch (e) {
            console.error('Storage cleanup failed:', e);
        }
    }, []);

    return (
        <>
            <GlobalBackground />
            <Router>
                <Suspense fallback={<div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span className="blinking-cursor" style={{fontSize: '2rem'}}>_</span></div>}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/blogs" element={<Blogs />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/favorites" element={<Favorites />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/gallery" element={<Gallery />} />
                        <Route path="/write-for-us" element={<WriteForUs />} />
                        <Route path="/cs-connect" element={<CSConnect />} />
                        <Route path="/cs-connect/:id" element={<FacultyProfile />} />
                        <Route path="/blog/:id" element={<BlogPost />} />
                        <Route path="/your-blogs" element={<YourBlogs />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                    </Routes>
                </Suspense>
            </Router>
            {loading && <ByteboardLoader onComplete={() => { sessionStorage.setItem('bb_loader_shown', '1'); setLoading(false); }} />}
        </>
    );
}

export default App;
