import React, { useState, useEffect, useMemo } from 'react';
import { ArticlesService } from '../../../services/articles';

export default function ManageBlogs() {
    const [blogs, setBlogs] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            const data = await ArticlesService.fetchAllAdminBlogs();
            setBlogs(data);
        };
        fetchAll();
    }, []);

    const filtered = useMemo(() => blogs.filter(b => 
        b.title.toLowerCase().includes(search.toLowerCase())
    ), [blogs, search]);

    return (
        <div className="admin-section">
            <input 
                placeholder="Search blogs..." 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ marginBottom: '1rem' }}
            />
            {filtered.map(b => (
                <div key={b.id} className="blog-card">
                    <h3>{b.title}</h3>
                    <button onClick={() => console.log('Edit', b.id)}>Edit</button>
                    <button onClick={() => console.log('Hide', b.id)}>Hide</button>
                </div>
            ))}
        </div>
    );
}