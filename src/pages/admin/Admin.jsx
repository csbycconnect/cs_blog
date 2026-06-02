// Inside Admin.jsx
import React, { useState, useEffect } from 'react';
import AdminEvents from './events/EventsDashboard';
import Sidebar from '../../components/home/Sidebar';
import EditorialReview from './blogs/EditorialReview';
import RejectedArticles from './blogs/RejectedArticles';
import ManageBlogs from './blogs/ManageBlogs';
import UserManagement from './users/UserManagement';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('review');

    // ONLY the shell logic here.
    return (
        <div className="admin-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="content-area">
                {activeTab === 'review' && <EditorialReview />}
                {activeTab === 'rejected' && <RejectedArticles />}
                {activeTab === 'manage_blogs' && <ManageBlogs />}
                {activeTab === 'events' && <AdminEvents />}
                {activeTab === 'users' && <UserManagement />}
            </main>
        </div>
    );
}