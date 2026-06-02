import React from 'react';
import '../../styles/components.css';

// Added setActiveTab as a prop
export default function Sidebar({ activeTab, setActiveTab }) {
    const adminLinks = [
        { name: 'Review', id: 'review' },
        { name: 'Rejected', id: 'rejected' },
        { name: 'Manage Blogs', id: 'manage_blogs' },
        { name: 'Events', id: 'events' },
        { name: 'Users', id: 'users' }
    ];

    return (
        <aside className="sidebar">
            <h2>Admin Panel</h2>
            <div className="filter-list">
                {adminLinks.map(link => (
                    <button 
                        key={link.id} 
                        onClick={() => setActiveTab(link.id)}
                        className={`filter-item ${activeTab === link.id ? 'active' : ''}`}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: activeTab === link.id ? 'gold' : 'white',
                            cursor: 'pointer',
                            display: 'block',
                            padding: '10px 0'
                        }}
                    >
                        {link.name}
                    </button>
                ))}
            </div>
        </aside>
    );
}