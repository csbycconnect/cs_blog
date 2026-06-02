// Inside Admin.jsx
import React, { useState, useEffect } from 'react';
import AdminEvents from './events/EventsDashboard';
import Sidebar from '../../components/home/Sidebar';
import EditorialReview from './blogs/EditorialReview';
import RejectedArticles from './blogs/RejectedArticles';
import ManageBlogs from './blogs/ManageBlogs';
import UserManagement from './users/UserManagement';

// src/pages/Admin.jsx

export default function Admin() {
    const [activeTab, setActiveTab] = useState('review');

    return (
        // Add this style prop temporarily to force visibility
        <div className="admin-layout" style={{ 
            display: 'flex', 
            minHeight: '100vh', 
            backgroundColor: '#111' 
        }}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <main className="content-area" style={{ 
                flex: 1, 
                padding: '2rem',
                color: 'white' 
            }}>
                {activeTab === 'review' && <EditorialReview />}
                {activeTab === 'rejected' && <RejectedArticles />}
                {activeTab === 'manage_blogs' && <ManageBlogs />}
                {activeTab === 'events' && <AdminEvents />}
                {activeTab === 'users' && <UserManagement />}
            </main>
        </div>
    );
}