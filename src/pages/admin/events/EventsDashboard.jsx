
import React, { useState, useEffect } from 'react';
import { EventsService } from '../../../services/events';

const EMPTY_FORM = {
    date: '',
    startTime: '',
    endTime: '',
    department: '',
    title: '',
    venue: '',
    description: '',
    note: '',
    category: '',
    posterUrl: '',
};

const inputStyle = {
    padding: '0.75rem',
    border: '2px solid var(--c-black)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'var(--c-black)',
};

export default function EventsDashboard() {
    const [subTab, setSubTab] = useState('create');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        if (subTab === 'manage') {
            fetchEvents();
        }
    }, [subTab]);

    // Fetch all events, including hidden events, for administration.
    const fetchEvents = async () => {
        setLoading(true);

        try {
            const all = await EventsService.getAllAdmin();
            setEvents(Array.isArray(all) ? all : []);
        } catch (err) {
            console.error('Failed to load events:', err);
            setEvents([]);
            alert('Failed to load events. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Create a new event.
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (submitting) return;

        setSubmitting(true);

        try {
            await EventsService.create({
                date: form.date,
                startTime: form.startTime,
                endTime: form.endTime,
                department: form.department,
                title: form.title,
                venue: form.venue,
                description: form.description,
                note: form.note,
                category: form.category,
                posterUrl: form.posterUrl,
            });

            alert('Event created successfully.');
            setForm({ ...EMPTY_FORM });

            // Refresh the list if the user switches to Manage.
            if (subTab === 'manage') {
                await fetchEvents();
            }
        } catch (err) {
            console.error('Create event failed:', err);
            alert('Failed to create event.');
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle event visibility.
    const handleToggleStatus = async (id, currentStatus) => {
        if (!id) {
            alert('Unable to identify this event.');
            return;
        }

        const newStatus =
            currentStatus === 'visible' ? 'hidden' : 'visible';

        try {
            await EventsService.setStatus(id, newStatus);
            await fetchEvents();
        } catch (err) {
            console.error('Status update failed:', err);
            alert('Unable to update event status.');
        }
    };

    // Permanently delete an event.
    const handleDelete = async (id) => {
        if (!id) {
            alert('Unable to identify this event.');
            return;
        }

        if (!window.confirm('Delete this event forever?')) {
            return;
        }

        try {
            await EventsService.remove(id);
            await fetchEvents();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Unable to delete event.');
        }
    };

    // Search and filter events.
    const filteredEvents = events.filter((ev) => {
        const query = searchQuery.trim().toLowerCase();

        const matchesSearch =
            !query ||
            [ev.title, ev.department, ev.venue, ev.category]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(query)
                );

        const matchesCategory =
            filterCategory === 'All' ||
            ev.category === filterCategory;

        const matchesDate =
            !dateFilter || ev.date === dateFilter;

        return matchesSearch && matchesCategory && matchesDate;
    });

    const field = (key) => ({
        value: form[key],
        onChange: (e) =>
            setForm((previous) => ({
                ...previous,
                [key]: e.target.value,
            })),
    });

    return (
        <div
            style={{
                background: 'var(--c-white)',
                border: '2px solid var(--c-black)',
                boxShadow: '8px 8px 0 var(--c-yellow)',
                padding: '2rem',
            }}
        >
            {/* Dashboard header and tabs */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    borderBottom: '2px solid #ddd',
                    paddingBottom: '0.5rem',
                }}
            >
                <h2
                    className="serif-heading"
                    style={{
                        color: 'var(--c-black)',
                        fontSize: '1.8rem',
                        margin: 0,
                    }}
                >
                    Events Dashboard
                </h2>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['create', 'manage'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setSubTab(tab)}
                            style={{
                                background:
                                    subTab === tab
                                        ? 'var(--c-yellow)'
                                        : 'transparent',
                                border: '1px solid var(--c-black)',
                                padding: '0.3rem 0.6rem',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {tab === 'create' ? 'Create' : 'Manage Past'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Create event */}
            {subTab === 'create' ? (
                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        <div>
                            <label style={labelStyle}>Date</label>
                            <input
                                type="date"
                                required
                                style={inputStyle}
                                {...field('date')}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Department</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. CS Dept"
                                style={inputStyle}
                                {...field('department')}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Event Title</label>
                        <input
                            type="text"
                            required
                            placeholder="Event title..."
                            style={inputStyle}
                            {...field('title')}
                        />
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        <div>
                            <label style={labelStyle}>Start Time</label>
                            <input
                                type="time"
                                required
                                style={inputStyle}
                                {...field('startTime')}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>End Time</label>
                            <input
                                type="time"
                                required
                                style={inputStyle}
                                {...field('endTime')}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        <div>
                            <label style={labelStyle}>Venue</label>
                            <input
                                type="text"
                                required
                                placeholder="Seminar Hall B"
                                style={inputStyle}
                                {...field('venue')}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Category</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Workshop"
                                style={inputStyle}
                                {...field('category')}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Main event description..."
                            style={{ ...inputStyle, resize: 'vertical' }}
                            {...field('description')}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Additional Notes</label>
                        <textarea
                            rows={2}
                            placeholder="Optional notes for attendees..."
                            style={{ ...inputStyle, resize: 'vertical' }}
                            {...field('note')}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Poster Image URL</label>
                        <input
                            type="url"
                            placeholder="Optional..."
                            style={inputStyle}
                            {...field('posterUrl')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            background: 'var(--c-yellow)',
                            border: '2px solid var(--c-black)',
                            padding: '1rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: submitting ? 'wait' : 'pointer',
                            boxShadow: '4px 4px 0 #000',
                            marginTop: '1rem',
                            opacity: submitting ? 0.6 : 1,
                        }}
                    >
                        {submitting ? 'CREATING...' : 'CREATE EVENT'}
                    </button>
                </form>
            ) : (
                /* Manage events */
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '1rem',
                            alignItems: 'end',
                        }}
                    >
                        <div>
                            <label style={labelStyle}>Search</label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                }
                                placeholder="Search events..."
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) =>
                                    setFilterCategory(e.target.value)
                                }
                                style={inputStyle}
                            >
                                <option value="All">All Categories</option>
                                <option value="Competition">Competition</option>
                                <option value="Lecture">Lecture</option>
                                <option value="Workshop">Workshop</option>
                                <option value="Editorial">Editorial</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Date</label>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) =>
                                    setDateFilter(e.target.value)
                                }
                                style={inputStyle}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={fetchEvents}
                            disabled={loading}
                            style={{
                                background: 'var(--c-black)',
                                color: 'var(--c-white)',
                                border: '2px solid var(--c-black)',
                                padding: '0.85rem 1rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                cursor: loading ? 'wait' : 'pointer',
                            }}
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>

                    {loading ? (
                        <p style={{ fontFamily: 'var(--font-mono)' }}>
                            Loading events...
                        </p>
                    ) : filteredEvents.length === 0 ? (
                        <p
                            style={{
                                fontFamily: 'var(--font-mono)',
                                color: '#555',
                            }}
                        >
                            No events match your filters.
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: '#000',
                                            color: '#fff',
                                        }}
                                    >
                                        {[
                                            'Title',
                                            'Category',
                                            'Department',
                                            'Date',
                                            'Status',
                                            'Actions',
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                style={{
                                                    padding: '0.85rem',
                                                    textAlign: 'left',
                                                    border: '1px solid #ccc',
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredEvents.map((ev) => {
                                        const id = ev.id ?? ev.eventId;
                                        const status =
                                            ev.status || 'visible';

                                        return (
                                            <tr
                                                key={id}
                                                style={{
                                                    opacity:
                                                        status === 'hidden'
                                                            ? 0.55
                                                            : 1,
                                                }}
                                            >
                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                    }}
                                                >
                                                    {ev.title}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                    }}
                                                >
                                                    {ev.category || 'N/A'}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                    }}
                                                >
                                                    {ev.department ||
                                                        ev.venue ||
                                                        'N/A'}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                    }}
                                                >
                                                    {ev.date || '—'}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                        textTransform:
                                                            'capitalize',
                                                    }}
                                                >
                                                    {status}
                                                </td>

                                                <td
                                                    style={{
                                                        padding: '0.85rem',
                                                        border: '1px solid #ccc',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            gap: '0.5rem',
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={!id}
                                                            onClick={() =>
                                                                handleToggleStatus(
                                                                    id,
                                                                    status
                                                                )
                                                            }
                                                            style={{
                                                                padding:
                                                                    '0.5rem 0.75rem',
                                                                border:
                                                                    '1px solid var(--c-black)',
                                                                background:
                                                                    status ===
                                                                    'visible'
                                                                        ? '#000'
                                                                        : '#f5f5f5',
                                                                color:
                                                                    status ===
                                                                    'visible'
                                                                        ? '#fff'
                                                                        : '#000',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {status ===
                                                            'visible'
                                                                ? 'Hide'
                                                                : 'Show'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={!id}
                                                            onClick={() =>
                                                                handleDelete(id)
                                                            }
                                                            style={{
                                                                padding:
                                                                    '0.5rem 0.75rem',
                                                                border:
                                                                    '1px solid var(--c-black)',
                                                                background:
                                                                    '#c53030',
                                                                color: '#fff',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
