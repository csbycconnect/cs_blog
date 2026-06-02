// src/pages/Admin.jsx
import React from 'react';

export default function Admin() {
    console.log("Admin Component is mounting!"); // Check console for this
    
    return (
        <div style={{ padding: '100px', background: 'blue', color: 'white', minHeight: '100vh' }}>
            <h1>Admin Shell is Loading Successfully</h1>
            <p>If you see this, the shell works. The error is in one of the sub-components.</p>
        </div>
    );
}