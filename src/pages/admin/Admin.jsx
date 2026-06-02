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

    const renderContent = () => {
        switch(activeTab) {
            case 'review': return <EditorialReview />;
            case 'rejected': return <RejectedArticles />;
            case 'manage_blogs': return <ManageBlo s />;
            case 'events': return <AdminEvents />;
            case 'users': return <UserManagement />;
            default: return <EditorialReview />;
        }
    };

    return (
        <div className="admin-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="content-area">
                {renderContent()}
            </main>
        </div>
    );
}