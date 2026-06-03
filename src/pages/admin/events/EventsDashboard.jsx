import React, { useState, useEffect } from 'react';
import { ArticlesService } from '../../../services/articles';

const EMPTY_FORM = {
    date: '', timeStart: '', timeEnd: '', department: '',
    title: '', venue: '', description: '', note: '', category: '', posterUrl: ''
};

const inputStyle = {
    padding: '0.75rem', border: '2px solid var(--c-black)',
    fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: '100%', outline: 'none'
};

const labelStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--c-black)'
};

export default function EventsDashboard() {
    const [subTab, setSubTab] = useState('create');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (subTab === 'manage') fetchEvents();
    }, [subTab]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const all = await ArticlesService.fetchAllEvents();
            setEvents(all);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await ArticlesService.createEvent({
                date: form.date,
                department: form.department,
                title: form.title,
                time: { start: form.timeStart, end: form.timeEnd },
                venue: form.venue,
                description: form.description,
                note: form.note,
                category: form.category,
                posterUrl: form.posterUrl,
            });
            alert('Event created successfully.');
            setForm(EMPTY_FORM);
        } catch (err) {
            console.error(err);
            alert('Failed to create event.');
        }
    };

    const handleSaveMedia = async (ev) => {
        const poster = document.getElementById(`poster-${ev.id}`).value;
        const gallery = document.getElementById(`gallery-${ev.id}`).value;
        const geo = document.getElementById(`geo-${ev.id}`).value;
        try {
            await ArticlesService.updateEventMedia(ev.id, { posterUrl: poster, galleryUrls: gallery, geoTagUrls: geo });
            alert('Media links saved.');
            fetchEvents();
        } catch (err) {
            alert('Failed to save media links.');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'visible' ? 'hidden' : 'visible';
        await EventService.updateEventStatus(id, newStatus);
        fetchDynamicEvents(); // Refresh list
    };


    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            await EventService.deleteEvent(id);
            fetchDynamicEvents();
        }
    };

    const filteredEvents = allEvents.filter(ev => {
        const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ev.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'All' || ev.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const field = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

    return (
        <div style={{ background: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '8px 8px 0 var(--c-yellow)', padding: '2rem' }}>
            {/* Sub-tab header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                <h2 className="serif-heading" style={{ color: 'var(--c-black)', fontSize: '1.8rem', margin: 0 }}>Events Dashboard</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['create', 'manage'].map(t => (
                        <button
                            key={t}
                            onClick={() => setSubTab(t)}
                            style={{ background: subTab === t ? 'var(--c-yellow)' : 'transparent', border: '1px solid var(--c-black)', padding: '0.3rem 0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            {t === 'create' ? 'Create' : 'Manage Past'}
                        </button>
                    ))}
                </div>
            </div>

            {subTab === 'create' ? (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Date</label>
                            <input type="date" required style={inputStyle} {...field('date')} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Department</label>
                            <input type="text" required placeholder="e.g. CS Dept" style={inputStyle} {...field('department')} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Event Title</label>
                        <input type="text" required placeholder="Event title..." style={inputStyle} {...field('title')} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Start Time</label>
                            <input type="time" required style={inputStyle} {...field('timeStart')} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>End Time</label>
                            <input type="time" required style={inputStyle} {...field('timeEnd')} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Venue</label>
                            <input type="text" required placeholder="Seminar Hall B" style={inputStyle} {...field('venue')} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={labelStyle}>Category</label>
                            <input type="text" required placeholder="CS Dept" style={inputStyle} {...field('category')} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Description</label>
                        <textarea required rows={3} placeholder="Main event description..." style={{ ...inputStyle, resize: 'vertical' }} {...field('description')} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Additional Notes</label>
                        <textarea rows={2} placeholder="Optional notes for attendees..." style={{ ...inputStyle, resize: 'vertical' }} {...field('note')} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={labelStyle}>Poster Image URL</label>
                        <input type="url" placeholder="Optional..." style={inputStyle} {...field('posterUrl')} />
                    </div>

                    <button type="submit" style={{ background: 'var(--c-yellow)', border: '2px solid var(--c-black)', padding: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '4px 4px 0 #000', marginTop: '1rem' }}>
                        CREATE EVENT
                    </button>
                </form>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {loading ? (
                        <p style={{ fontFamily: 'var(--font-mono)' }}>Loading events...</p>
                    ) : events.length === 0 ? (
                        <p style={{ fontFamily: 'var(--font-mono)', color: '#555' }}>No events yet.</p>
                    ) : (
                        events.map(ev => (
                            <div key={ev.id} style={{ background: '#f5f5f5', border: '1px solid #ccc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h3 className="serif-heading" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--c-black)' }}>{ev.title}</h3>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', background: '#e0e0e0' }}>{ev.date}</span>
                                </div>

                                {(ev.posterUrl || ev.imageUrl) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#ccc', backgroundImage: `url(${ev.posterUrl || ev.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--c-black)' }} />
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'green', fontWeight: 700 }}>Poster Bound</span>
                                    </div>
                                ) : (
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#c53030', fontWeight: 700 }}>No Poster</span>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid #ddd', paddingTop: '0.5rem' }}>
                                    <input id={`poster-${ev.id}`} type="url" placeholder="Event Poster URL..." defaultValue={ev.posterUrl || ev.imageUrl || ''} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                    <input id={`gallery-${ev.id}`} type="text" placeholder="Gallery Links (comma separated)..." defaultValue={ev.galleryUrls || ''} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                    <input id={`geo-${ev.id}`} type="text" placeholder="Geo-tagged Links..." defaultValue={ev.geoTagUrls || ''} style={{ padding: '0.4rem', border: '1px solid var(--c-black)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                                    <button
                                        onClick={() => handleSaveMedia(ev)}
                                        style={{ background: 'var(--c-black)', color: 'var(--c-white)', border: '1px solid var(--c-black)', padding: '0.5rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                                    >
                                        SAVE MEDIA
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}