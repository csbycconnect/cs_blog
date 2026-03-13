import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Blogs from './pages/Blogs';
import Events from './pages/Events';
import Calendar from './pages/Calendar';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import WriteForUs from './pages/WriteForUs';
import CSConnect from './pages/CSConnect';
import FacultyProfile from './pages/FacultyProfile';
import Admin from './pages/Admin';
import BlogPost from './pages/BlogPost';
import YourBlogs from './pages/YourBlogs';
import ByteboardLoader from './components/shared/ByteboardLoader';
import GlobalBackground from './components/layout/GlobalBackground';
import Account from './pages/Account';
import Settings from './pages/Settings';
import AdminRoute from './components/shared/AdminRoute';

function App() {
    // Show the loader only once per browser session (not on every navigation).
    // sessionStorage persists within the tab but clears on close/refresh of a new tab.
    const [loading, setLoading] = useState(() => {
        const alreadyShown = sessionStorage.getItem('bb_loader_shown');
        const isWriteForUs = window.location.pathname === '/write-for-us';
        return !alreadyShown && !isWriteForUs;
    });

    return (
        <>
            {/* Fixed full-viewport animated background — z-index 0, pointer-events none */}
            <GlobalBackground />

            {/* Website always rendered underneath */}
            <Router>
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
            </Router>

            {/* Loader overlaid on top — fades out to reveal the site behind */}
            {loading && <ByteboardLoader onComplete={() => { sessionStorage.setItem('bb_loader_shown', '1'); setLoading(false); }} />}
        </>
    );
}

export default App;
