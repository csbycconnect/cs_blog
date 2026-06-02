// Inside Admin.jsx
import React, { useState, useEffect } from 'react';
import AdminEvents from './events/EventsDashboard';
import Sidebar from '../../components/home/Sidebar';
import EditorialReview from './blogs/EditorialReview';
import RejectedArticles from './blogs/RejectedArticles';
import ManageBlogs from './blogs/ManageBlogs';
import UserManagement from './users/UserManagement';

export default function Admin() {
    return (
        <div style={{ background: 'red', height: '100vh', width: '100%', color: 'white', padding: '50px' }}>
            <h1>If you see this RED BACKGROUND, your Admin page IS loading!</h1>
        </div>
    );
}