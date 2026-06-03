import React, { useState, useEffect } from 'react';
import { ArticlesService } from '../../../services/articles';

export default function RejectedArticles() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRejected();
    }, []);

    const fetchRejected = async () => {
        setLoading(true);
        try {
            const items = await ArticlesService.fetchByStatus('rejected');
            setArticles(items);
        } catch (err) {
            console.error(err);
            setArticles([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading rejected submissions...</p>;
    if (articles.length === 0) return <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)' }}>No rejected submissions found.</p>;

    return (
        <>
            <h2 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: '1.6rem' }}>Rejected Submissions</h2>
            {articles.map(item => (
                <div key={item.id} style={{ background: '#111827', border: '2px solid #2d3748', padding: '1rem', marginBottom: '0.75rem', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.title}</h3>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#9CA3AF' }}>
                                By {item.name || item.authorName || 'Contributor'}
                            </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#e2e8f0' }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                        </div>
                    </div>
                    {item.rejectionReason && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0b1220', borderLeft: '4px solid #ef4444', color: '#f8d7da' }}>
                            <strong>Editor's Note:</strong>
                            <div style={{ marginTop: '0.35rem', fontFamily: 'var(--font-mono)', color: '#ffdede' }}>{item.rejectionReason}</div>
                        </div>
                    )}
                </div>
            ))}
        </>
    );
}