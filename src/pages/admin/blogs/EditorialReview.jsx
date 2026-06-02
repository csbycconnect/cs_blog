import React, { useState, useEffect } from 'react';
import { ArticlesService } from '../../../services/articles';

export default function EditorialReview() {
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const data = await ArticlesService.fetchByStatus('pending');
            setPendingArticles(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleAction = async (id, action) => {
        await ArticlesService.updateStatus(id, action); // 'accepted' or 'rejected'
        setPendingArticles(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="admin-section">
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>Editorial Review</h2>
            {loading ? <p>Loading...</p> : (
                pendingArticles.map(article => (
                    <div key={article.id} className="article-card" style={{ padding: '1rem', border: '1px solid #333' }}>
                        <h3>{article.title}</h3>
                        <button onClick={() => handleAction(article.id, 'accepted')}>Accept</button>
                        <button onClick={() => handleAction(article.id, 'rejected')} style={{ marginLeft: '10px' }}>Reject</button>
                    </div>
                ))
            )}
        </div>
    );
}