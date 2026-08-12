//EditorialReview.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { ArticlesService } from '../../../services/articles';

export default function EditorialReview({ canReview }) {
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Rejection modal
    const [showModal, setShowModal] = useState(false);
    const [modalArticle, setModalArticle] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (canReview) fetchPending();
    }, [canReview]);

    // Prevent background scroll while the rejection modal is open
    useEffect(() => {
        if (showModal) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prevOverflow; };
        }
    }, [showModal]);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const items = await ArticlesService.fetchByStatus('pending');
            setPendingArticles(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (article) => {
        const id = article.id || article.PK;
        if (!id) return alert('Missing article ID.');
        try {
            await ArticlesService.updateStatus(id, 'accepted');
            setPendingArticles(prev => prev.filter(a => (a.id || a.PK) !== id));
            alert('Article accepted and published.');
        } catch (err) {
            console.error(err);
            alert('Failed to accept article.');
        }
    };

    const openRejectModal = (article) => {
        setModalArticle(article);
        setRejectionReason('');
        setShowModal(true);
    };

    const confirmReject = async () => {
        if (!modalArticle) return;
        const id = modalArticle.id || modalArticle.PK;
        setSubmitting(true);
        try {
            await ArticlesService.updateStatus(id, 'rejected', rejectionReason || null);
            setPendingArticles(prev => prev.filter(a => (a.id || a.PK) !== id));
            setShowModal(false);
            setModalArticle(null);
            setRejectionReason('');
            alert('Submission rejected.');
        } catch (err) {
            console.error(err);
            alert('Failed to reject submission.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!canReview) {
        return (
            <div style={{ padding: '2rem', background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--c-black)', marginBottom: '1rem' }}>Access Restricted</p>
                <p style={{ fontFamily: 'var(--font-mono)', color: '#555' }}>You do not have permission to review pending articles.</p>
            </div>
        );
    }

    if (loading) return <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)' }}>Loading submissions...</p>;
    if (pendingArticles.length === 0) return <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)' }}>No pending submissions.</p>;

    return (
        <>
            <style>{`
                .admin-review-content img {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block;
                    margin: 1rem auto;
                }
            `}</style>
            {/* Rejection Modal — rendered via portal directly into document.body.
                This guarantees it centers on the viewport regardless of scroll
                position, and can't be broken by any ancestor with a CSS
                transform/filter/perspective (which would otherwise turn
                "position: fixed" into something relative to that ancestor). */}
            {showModal && modalArticle && createPortal(
                <div
                    onClick={() => { setShowModal(false); setModalArticle(null); }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ width: 'min(720px, 95%)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', padding: '1.25rem', borderRadius: '6px', boxShadow: '0 6px 30px rgba(0,0,0,0.4)', color: '#000' }}
                    >
                        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>Reject: {modalArticle.title}</h3>
                        <p style={{ fontFamily: 'var(--font-mono)', color: '#444', marginBottom: '0.5rem' }}>Reason (optional — sent to author):</p>
                        <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            rows={6}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowModal(false); setModalArticle(null); }} style={{ padding: '0.5rem 0.8rem', background: '#eee', border: '1px solid #ccc', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={confirmReject} style={{ padding: '0.6rem 0.9rem', background: 'var(--c-black)', color: 'var(--c-yellow)', border: '2px solid var(--c-black)', cursor: 'pointer' }}>
                                {submitting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Articles */}
            {pendingArticles.map(article => (
                <div key={article.id} style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#000', marginBottom: '0.5rem' }}>
                                {article.category || 'Article'} • By {article.name || article.authorName || 'Anonymous'} • {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Recent'}
                            </div>
                            <h2 className="serif-heading" style={{ fontSize: '1.8rem', color: 'var(--c-black)', marginBottom: '1rem', lineHeight: 1.2 }}>
                                {article.title}
                            </h2>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#333', marginBottom: '1.5rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
                                {article.excerpt || article.subtitle || 'No subtitle provided.'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', minWidth: '120px' }}>
                            <button onClick={() => handleAccept(article)} style={{ background: 'var(--c-black)', border: '2px solid var(--c-black)', color: 'var(--c-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.75rem', cursor: 'pointer' }}>
                                ACCEPT
                            </button>
                            <button onClick={() => openRejectModal(article)} style={{ background: 'transparent', border: '2px solid var(--c-black)', color: 'var(--c-black)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.75rem', cursor: 'pointer' }}>
                                REJECT
                            </button>
                        </div>
                    </div>

                    <details style={{ marginTop: '1.5rem', borderTop: '2px dashed #ccc', paddingTop: '1rem' }}>
                        <summary style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--c-black)' }}>
                            View Full Content
                        </summary>
                        <div className="admin-review-content" style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#000', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: '1.5rem', border: '1px solid #ddd', overflow: 'hidden', wordBreak: 'break-word' }}>
                            {article.contentHTML?.trim() ? (
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.contentHTML) }} />
                            ) : (
                                <div>{article.content || 'No content available.'}</div>
                            )}
                        </div>
                    </details>
                </div>
            ))}
        </>
    );
}