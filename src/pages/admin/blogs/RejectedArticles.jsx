import React, { useState, useEffect } from 'react';
import { ArticlesService } from '../../../services/articles';

export default function RejectedArticles() {
    const [rejected, setRejected] = useState([]);

    useEffect(() => {
        fetchRejected();
    }, []);

    const fetchRejected = async () => {
        const data = await ArticlesService.fetchByStatus('rejected');
        setRejected(data);
    };

    return (
        <div className="admin-section">
            <h2 style={{ color: 'white' }}>Rejected Articles</h2>
            {rejected.map(article => (
                <div key={article.id} className="article-card">
                    <h3>{article.title}</h3>
                    <p>Reason: {article.note || 'No reason provided'}</p>
                </div>
            ))}
        </div>
    );
}