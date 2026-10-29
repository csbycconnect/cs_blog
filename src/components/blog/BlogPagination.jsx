import React from 'react';
import '../../styles/blog-pagination.css';

// 1 2 3 4 5 … 20  |  1 … 8 9 10 … 20  |  1 … 16 17 18 19 20
export function getPageItems(page, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 'end-gap', total];
    if (page >= total - 3) return [1, 'start-gap', total - 4, total - 3, total - 2, total - 1, total];
    return [1, 'start-gap', page - 1, page, page + 1, 'end-gap', total];
}

export default function BlogPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    return (
        <nav className="bp-root" aria-label="Pagination">
            <p className="bp-summary">
                Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong> dispatches
            </p>

            <div className="bp-controls">
                <button
                    type="button"
                    className="bp-btn bp-nav"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                >
                    <span aria-hidden>←</span>
                    <span className="bp-nav-label">Prev</span>
                </button>

                <ol className="bp-pages">
                    {getPageItems(page, totalPages).map(item =>
                        typeof item === 'number' ? (
                            <li key={item}>
                                <button
                                    type="button"
                                    className={`bp-btn bp-page ${item === page ? 'is-current' : ''}`}
                                    onClick={() => item !== page && onPageChange(item)}
                                    aria-label={`Page ${item}`}
                                    aria-current={item === page ? 'page' : undefined}
                                >
                                    {item}
                                </button>
                            </li>
                        ) : (
                            <li key={item} className="bp-gap" aria-hidden>…</li>
                        )
                    )}
                </ol>

                <span className="bp-status" aria-hidden>
                    Page {page} / {totalPages}
                </span>

                <button
                    type="button"
                    className="bp-btn bp-nav bp-next"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                >
                    <span className="bp-nav-label">Next</span>
                    <span aria-hidden>→</span>
                </button>
            </div>
        </nav>
    );
}
