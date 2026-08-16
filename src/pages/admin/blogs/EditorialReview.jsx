//EditorialReview.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { ArticlesService } from '../../../services/articles';

const PAGE_SIZE_OPTIONS = [5, 10];

export default function EditorialReview({ canReview }) {
    const [pendingArticles, setPendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search + pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // Rejection modal
    const [showModal, setShowModal] = useState(false);
    const [modalArticle, setModalArticle] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Author review required modal
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewModalArticle, setReviewModalArticle] = useState(null);
    const [reviewMessage, setReviewMessage] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    useEffect(() => {
        if (canReview) fetchPending();
    }, [canReview]);

    // Prevent background scroll while any modal is open
    useEffect(() => {
        if (showModal || showReviewModal) {
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prevOverflow; };
        }
    }, [showModal, showReviewModal]);

    // Reset to page 1 whenever the search term or page size changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm, pageSize]);

    const filteredArticles = pendingArticles.filter(article => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.trim().toLowerCase();
        const title = (article.title || '').toLowerCase();
        const author = (article.name || article.authorName || '').toLowerCase();
        return title.includes(q) || author.includes(q);
    });

    const totalCount = pendingArticles.length;
    const totalFiltered = filteredArticles.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const visibleArticles = filteredArticles.slice(pageStart, pageStart + pageSize);

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

    const openReviewModal = (article) => {
        setReviewModalArticle(article);
        setReviewMessage('');
        setShowReviewModal(true);
    };

    const confirmAuthorReview = async () => {
        if (!reviewModalArticle) return;
        const article = reviewModalArticle;
        const id = article.id || article.PK;
        const toEmail = article.email || article.authorEmail;
        if (!toEmail) {
            alert('This article has no author email on file — cannot send notification.');
            return;
        }
        setReviewSubmitting(true);
        try {
            // Move the article back to drafts so the author can revise it
            await ArticlesService.updateStatus(id, 'draft', reviewMessage || null);

            // Notify the author by email
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateType: 'author_review_required',
                    toEmail,
                    templateData: {
                        postTitle: article.title,
                        authorName: article.name || article.authorName || 'Contributor',
                        reviewMessage: reviewMessage || null,
                    },
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Email send failed');
            }

            setPendingArticles(prev => prev.filter(a => (a.id || a.PK) !== id));
            setShowReviewModal(false);
            setReviewModalArticle(null);
            setReviewMessage('');
            alert('Article moved to drafts and author notified.');
        } catch (err) {
            console.error(err);
            alert('Failed to complete author review request.');
        } finally {
            setReviewSubmitting(false);
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

            {/* Author Review Required Modal — rendered via portal for the same
                reasons as the rejection modal above. */}
            {showReviewModal && reviewModalArticle && createPortal(
                <div
                    onClick={() => { setShowReviewModal(false); setReviewModalArticle(null); }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ width: 'min(720px, 95%)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', padding: '1.25rem', borderRadius: '6px', boxShadow: '0 6px 30px rgba(0,0,0,0.4)', color: '#000' }}
                    >
                        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>Author Review Required: {reviewModalArticle.title}</h3>
                        <p style={{ fontFamily: 'var(--font-mono)', color: '#444', marginBottom: '0.5rem' }}>
                            This moves the article back to the author's Drafts and emails them the feedback below.
                        </p>
                        <textarea
                            value={reviewMessage}
                            onChange={e => setReviewMessage(e.target.value)}
                            rows={6}
                            placeholder="Describe the changes the author needs to make..."
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowReviewModal(false); setReviewModalArticle(null); }} style={{ padding: '0.5rem 0.8rem', background: '#eee', border: '1px solid #ccc', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={confirmAuthorReview} style={{ padding: '0.6rem 0.9rem', background: '#d97706', color: '#fff', border: '2px solid #d97706', cursor: 'pointer' }}>
                                {reviewSubmitting ? 'Sending...' : 'Send for Author Review'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Search + count + page size toolbar */}
            <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '6px 6px 0 var(--c-yellow)', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
                    <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.95rem', opacity: 0.5 }}>
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by title or author…"
                        style={{
                            width: '100%',
                            padding: '0.7rem 0.9rem 0.7rem 2.3rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                            border: '2px solid var(--c-black)',
                            background: '#fafafa',
                            color: 'var(--c-black)',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '0.35rem',
                        padding: '0.55rem 0.9rem',
                        border: '2px solid var(--c-black)',
                        background: 'var(--c-yellow)',
                        color: 'var(--c-black)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                    }}>
                        <span style={{ fontSize: '1rem' }}>{totalFiltered}</span>
                        <span style={{ opacity: 0.7, fontWeight: 500 }}>/ {totalCount} pending</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#555', whiteSpace: 'nowrap' }}>
                        Show
                    </label>
                    <select
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        style={{
                            padding: '0.55rem 2rem 0.55rem 0.75rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: '2px solid var(--c-black)',
                            background: 'var(--c-white)',
                            color: 'var(--c-black)',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--c-black) 50%), linear-gradient(135deg, var(--c-black) 50%, transparent 50%)',
                            backgroundPosition: 'calc(100% - 14px) calc(50% - 3px), calc(100% - 9px) calc(50% - 3px)',
                            backgroundSize: '5px 5px, 5px 5px',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        {PAGE_SIZE_OPTIONS.map(size => (
                            <option key={size} value={size}>{size} per page</option>
                        ))}
                    </select>
                </div>
            </div>

            {totalFiltered === 0 ? (
                <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '6px 6px 0 var(--c-yellow)', padding: '2rem', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', color: '#555', margin: 0 }}>No submissions match your search.</p>
                </div>
            ) : (
                <>
                    {/* Articles */}
                    {visibleArticles.map(article => (
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
                            <button onClick={() => openReviewModal(article)} style={{ background: '#d97706', border: '2px solid #d97706', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '0.75rem', cursor: 'pointer' }}>
                                AUTHOR REVIEW REQUIRED
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

                    {/* Pagination controls */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '0.5rem',
                        background: 'var(--c-white)',
                        border: '2px solid var(--c-black)',
                        boxShadow: '6px 6px 0 var(--c-yellow)',
                        padding: '0.9rem 1.25rem',
                    }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.55rem 1rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                border: '2px solid var(--c-black)',
                                background: currentPage <= 1 ? '#eee' : 'var(--c-white)',
                                color: 'var(--c-black)',
                                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage <= 1 ? 0.4 : 1,
                            }}
                        >
                            ← Prev
                        </button>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--c-black)',
                            background: 'var(--c-yellow)',
                            border: '2px solid var(--c-black)',
                            padding: '0.5rem 0.9rem',
                            whiteSpace: 'nowrap',
                        }}>
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.55rem 1rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                border: '2px solid var(--c-black)',
                                background: currentPage >= totalPages ? '#eee' : 'var(--c-white)',
                                color: 'var(--c-black)',
                                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage >= totalPages ? 0.4 : 1,
                            }}
                        >
                            Next →
                        </button>
                    </div>
                </>
            )}
        </>
    );
}