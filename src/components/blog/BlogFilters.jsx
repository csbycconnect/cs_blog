import React, { useMemo, useState } from 'react';
import '../../styles/blog-filters.css';

const parseMins = rt => Number.parseInt(rt || 0, 10);

export const READ_TIME_RANGES = [
    { key: 'short', label: '< 5 min', fn: rt => parseMins(rt) < 5 },
    { key: 'mid', label: '5–8 min', fn: rt => { const m = parseMins(rt); return m >= 5 && m <= 8; } },
    { key: 'long', label: '8+ min', fn: rt => parseMins(rt) > 8 },
];

export const DATE_RANGES = [
    { key: 'any', label: 'Any time', days: null },
    { key: '7', label: 'Past week', days: 7 },
    { key: '30', label: 'Past month', days: 30 },
    { key: '365', label: 'Past year', days: 365 },
];

export const SORT_OPTIONS = [
    { label: 'Most Recent', key: 'recent' },
    { label: 'Most Viewed', key: 'views' },
    { label: 'Most Liked', key: 'likes' },
    { label: 'Most Commented', key: 'comments' },
];

export const EMPTY_FILTERS = { authors: [], categories: [], readTimes: [], date: 'any' };

const postTime = p => new Date(p.createdAt || p.date || 0).getTime();

/**
 * Multi-select filters: OR inside a group, AND across groups.
 * `skip` ignores one group (used for faceted counts).
 */
export function applyFilters(posts, { search = '', filters, sortBy = 'recent' }, skip = null) {
    let out = [...posts];
    const q = search.trim().toLowerCase();

    if (q) {
        out = out.filter(p =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.excerpt || '').toLowerCase().includes(q) ||
            (p.content || '').toLowerCase().includes(q) ||
            (p.author || '').toLowerCase().includes(q)
        );
    }
    if (skip !== 'authors' && filters.authors.length) {
        out = out.filter(p => filters.authors.includes(p.author));
    }
    if (skip !== 'categories' && filters.categories.length) {
        out = out.filter(p => filters.categories.includes(p.category));
    }
    if (skip !== 'readTimes' && filters.readTimes.length) {
        const ranges = READ_TIME_RANGES.filter(r => filters.readTimes.includes(r.key));
        out = out.filter(p => ranges.some(r => r.fn(p.readTime)));
    }
    if (skip !== 'date' && filters.date !== 'any') {
        const days = DATE_RANGES.find(d => d.key === filters.date)?.days;
        if (days) {
            const cutoff = Date.now() - days * 86400000;
            out = out.filter(p => postTime(p) >= cutoff);
        }
    }

    const sorters = {
        views: (a, b) => (b.views || 0) - (a.views || 0),
        likes: (a, b) => (b.likes || 0) - (a.likes || 0),
        comments: (a, b) => (b.comments || 0) - (a.comments || 0),
        recent: (a, b) => postTime(b) - postTime(a),
    };
    out.sort(sorters[sortBy] || sorters.recent);
    return out;
}

export function countActive(filters, sortBy) {
    return (
        filters.authors.length +
        filters.categories.length +
        filters.readTimes.length +
        (filters.date !== 'any' ? 1 : 0) +
        (sortBy !== 'recent' ? 1 : 0)
    );
}

const Section = ({ title, badge, defaultOpen = true, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bf-section">
            <button className="bf-section-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <span className="bf-section-title">{title}</span>
                {badge > 0 && <span className="bf-badge">{badge}</span>}
                <span className="bf-caret">{open ? '−' : '+'}</span>
            </button>
            {open && <div className="bf-section-body">{children}</div>}
        </div>
    );
};

const FacetList = ({ options, selected, onToggle, searchable = false, limit = 6, placeholder }) => {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);

    const sorted = useMemo(() => {
        const q = query.trim().toLowerCase();
        return options
            .filter(o => !q || o.label.toLowerCase().includes(q))
            .sort((a, b) => {
                const as = selected.includes(a.value) ? 1 : 0;
                const bs = selected.includes(b.value) ? 1 : 0;
                return bs - as || b.count - a.count || a.label.localeCompare(b.label);
            });
    }, [options, query, selected]);

    const visible = expanded || query ? sorted : sorted.slice(0, limit);

    return (
        <>
            {searchable && options.length > limit && (
                <input
                    className="bf-search"
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={e => setQuery(e.target.value)}
                />
            )}
            <div className="bf-options">
                {visible.map(o => {
                    const active = selected.includes(o.value);
                    const dim = !active && o.count === 0;
                    return (
                        <button
                            key={o.value}
                            className={`bf-option ${active ? 'active' : ''} ${dim ? 'dim' : ''}`}
                            onClick={() => onToggle(o.value)}
                            aria-pressed={active}
                        >
                            <span className="bf-check">{active ? '✓' : ''}</span>
                            <span className="bf-option-label">{o.label}</span>
                            <span className="bf-count">{o.count}</span>
                        </button>
                    );
                })}
                {visible.length === 0 && <span className="bf-empty">No matches</span>}
            </div>
            {!query && sorted.length > limit && (
                <button className="bf-more" onClick={() => setExpanded(e => !e)}>
                    {expanded ? 'Show less' : `Show ${sorted.length - limit} more`}
                </button>
            )}
        </>
    );
};

export default function BlogFilters({
    posts,
    search,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    onClear,
}) {
    const activeCount = countActive(filters, sortBy);

    const toggle = (group, value) =>
        setFilters(f => ({
            ...f,
            [group]: f[group].includes(value) ? f[group].filter(v => v !== value) : [...f[group], value],
        }));

    const facets = useMemo(() => {
        const base = { search, filters, sortBy: 'recent' };
        const count = (skip, getter) => {
            const map = new Map();
            applyFilters(posts, base, skip).forEach(p => {
                const v = getter(p);
                if (v) map.set(v, (map.get(v) || 0) + 1);
            });
            return map;
        };

        const authorCounts = count('authors', p => p.author);
        const categoryCounts = count('categories', p => p.category);
        const readPool = applyFilters(posts, base, 'readTimes');
        const datePool = applyFilters(posts, base, 'date');

        const build = (all, counts) =>
            [...new Set(all)].filter(Boolean).map(v => ({ value: v, label: v, count: counts.get(v) || 0 }));

        return {
            authors: build(posts.map(p => p.author), authorCounts),
            categories: build(posts.map(p => p.category), categoryCounts),
            readTimes: READ_TIME_RANGES.map(r => ({
                value: r.key,
                label: r.label,
                count: readPool.filter(p => r.fn(p.readTime)).length,
            })),
            dates: DATE_RANGES.map(d => ({
                ...d,
                count: d.days
                    ? datePool.filter(p => postTime(p) >= Date.now() - d.days * 86400000).length
                    : datePool.length,
            })),
        };
    }, [posts, search, filters]);

    const chips = [
        ...filters.authors.map(v => ({ group: 'authors', value: v, label: v })),
        ...filters.categories.map(v => ({ group: 'categories', value: v, label: v })),
        ...filters.readTimes.map(v => ({
            group: 'readTimes',
            value: v,
            label: READ_TIME_RANGES.find(r => r.key === v)?.label,
        })),
    ];
    if (filters.date !== 'any') {
        chips.push({
            group: 'date',
            value: filters.date,
            label: DATE_RANGES.find(d => d.key === filters.date)?.label,
        });
    }

    const removeChip = chip =>
        chip.group === 'date'
            ? setFilters(f => ({ ...f, date: 'any' }))
            : toggle(chip.group, chip.value);

    return (
        <div className="bf-root">
            <div className="bf-header">
                <span className="bf-header-title">Filters</span>
                {activeCount > 0 && (
                    <button className="bf-clear" onClick={onClear}>
                        Clear all
                    </button>
                )}
            </div>

            {chips.length > 0 && (
                <div className="bf-chips">
                    {chips.map(c => (
                        <button
                            key={`${c.group}-${c.value}`}
                            className="bf-chip"
                            onClick={() => removeChip(c)}
                            title="Remove filter"
                        >
                            {c.label} <span aria-hidden>✕</span>
                        </button>
                    ))}
                </div>
            )}

            <Section title="Sort by">
                <select className="bf-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    {SORT_OPTIONS.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                </select>
            </Section>

            <Section title="Posted" badge={filters.date !== 'any' ? 1 : 0}>
                <div className="bf-options">
                    {facets.dates.map(d => (
                        <button
                            key={d.key}
                            className={`bf-option ${filters.date === d.key ? 'active' : ''}`}
                            onClick={() => setFilters(f => ({ ...f, date: d.key }))}
                            aria-pressed={filters.date === d.key}
                        >
                            <span className="bf-check">{filters.date === d.key ? '●' : ''}</span>
                            <span className="bf-option-label">{d.label}</span>
                            <span className="bf-count">{d.count}</span>
                        </button>
                    ))}
                </div>
            </Section>

            <Section title="Category" badge={filters.categories.length}>
                <FacetList
                    options={facets.categories}
                    selected={filters.categories}
                    onToggle={v => toggle('categories', v)}
                    searchable
                    placeholder="Search categories..."
                />
            </Section>

            <Section title="Author" badge={filters.authors.length}>
                <FacetList
                    options={facets.authors}
                    selected={filters.authors}
                    onToggle={v => toggle('authors', v)}
                    searchable
                    placeholder="Search authors..."
                />
            </Section>

            <Section title="Read time" badge={filters.readTimes.length}>
                <FacetList
                    options={facets.readTimes}
                    selected={filters.readTimes}
                    onToggle={v => toggle('readTimes', v)}
                    limit={10}
                />
            </Section>
        </div>
    );
}
