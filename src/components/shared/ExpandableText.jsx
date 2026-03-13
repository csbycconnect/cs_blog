import React, { useState, useEffect } from 'react';

export default function ExpandableText({ children, mobileThreshold = 100 }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const content = typeof children === 'string' ? children : '';
    // Optional fallback if text elements are passed directly
    if (typeof children !== 'string') {
        return children;
    }

    const shouldTruncate = isMobile && content.length > mobileThreshold;

    if (!shouldTruncate) {
        return <>{content}</>;
    }

    return (
        <span>
            {isExpanded ? content : `${content.substring(0, mobileThreshold)}... `}
            <button 
                onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    marginLeft: '0.25rem',
                    fontSize: '0.85em',
                    display: 'inline-block'
                }}
            >
                {isExpanded ? 'View Less' : 'View More'}
            </button>
        </span>
    );
}
