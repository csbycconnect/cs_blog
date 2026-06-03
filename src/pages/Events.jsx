import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import ShuffleText from '../components/shared/ShuffleText';
import BackButton from '../components/shared/BackButton';
import { EventService } from '../services/events';

const categoryColors = {
    Competition: { bg: '#f7d000', text: '#000' },
    Lecture: { bg: '#fff9db', text: '#000' },
    Editorial: { bg: '#0A192F', text: '#fff' },
    Workshop: { bg: '#000', text: '#fff' },
};

export default function Events() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Dynamic Events State
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedEvents, setExpandedEvents] = useState({});

    useEffect(() => {
        fetchDynamicEvents();
    }, []);

    const fetchDynamicEvents = async () => {
        setLoading(true);
        try {
            const data = await EventService.fetchAllEvents();

            // Map the data to ensure flat structure if your DB returns nested DynamoDB format
            const normalizedData = (data || []).map(item => ({
                ...item,
                startTime: item.time?.start?.S || item.time?.start || item.timeStart || "",
                endTime: item.time?.end?.S || item.time?.end || item.timeEnd || ""
            }));

            setAllEvents(normalizedData);
        } catch (e) {
            console.error("Failed to fetch events:", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedEvents(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filtered = allEvents.filter(ev => {
        const q = searchQuery.toLowerCase();
        return (
            (ev.title && ev.title.toLowerCase().includes(q)) ||
            (ev.description && ev.description.toLowerCase().includes(q)) ||
            (ev.category && ev.category.toLowerCase().includes(q)) ||
            (ev.venue && ev.venue.toLowerCase().includes(q))
        );
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const todaysEvents = filtered.filter(ev => {
        const d = new Date(ev.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === now.getTime();
    });

    const upcomingEvents = filtered.filter(ev => {
        const d = new Date(ev.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() > now.getTime();
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const pastEvents = filtered.filter(ev => {
        const d = new Date(ev.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < now.getTime();
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Reusable Event Card Component
    const EventCard = ({ event, index }) => {
        const cat = categoryColors[event.category] || { bg: '#eee', text: '#000' };
        const isExpanded = !!expandedEvents[event.id];

        let timeDisplay = '';
        if (event.startTime) {
            timeDisplay = `${event.startTime} – ${event.endTime}`;
        } else if (event.timeStart) {
            timeDisplay = `${event.timeStart} – ${event.timeEnd}`;
        }

        return (
            <AnimateOnScroll animationClass="animate-slide-up" delay={0.1 * index} threshold={0.05}>
                <div style={{ position: 'relative', height: '100%' }}>
                    <div style={{ position: 'absolute', top: '8px', left: '8px', width: '100%', height: '100%', border: '2px solid var(--c-yellow)', zIndex: 0 }} />
                    <div style={{
                        position: 'relative', zIndex: 1,
                        backgroundColor: 'var(--c-white)', border: '2px solid var(--c-black)',
                        padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%'
                    }}>
                        <span style={{
                            alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: cat.bg, color: cat.text,
                            border: '2px solid var(--c-black)', padding: '0.2rem 0.6rem',
                        }}>
                            {event.category || 'Event'}
                        </span>

                        <h2 className="serif-heading" style={{ fontSize: '1.4rem', lineHeight: 1.2, color: 'var(--c-black)' }}>
                            {event.title}
                        </h2>

                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#333', lineHeight: 1.6, flexGrow: 1 }}>
                            {event.description}
                        </p>

                        <div style={{ borderTop: '2px solid var(--c-black)', paddingTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#555', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span>📅 {event.date} {timeDisplay ? `· ${timeDisplay}` : ''}</span>
                            <span>📍 {event.venue || event.department}</span>
                        </div>

                        {isExpanded && (
                            <div style={{ marginTop: '1rem', borderTop: '2px dashed #ccc', paddingTop: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                                {(event.posterUrl || event.imageUrl) && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Event Poster</p>
                                        <img src={event.posterUrl || event.imageUrl} alt="Poster" style={{ width: '100%', border: '2px solid var(--c-black)', display: 'block' }} />
                                    </div>
                                )}
                                {event.note ? (
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#000', lineHeight: 1.6, background: '#f5f5f5', padding: '1rem', border: '1px solid #ddd' }}>
                                        <strong>Notes:</strong> {event.note}
                                    </p>
                                ) : (
                                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#777', fontStyle: 'italic' }}>No additional notes available.</p>
                                )}
                            </div>
                        )}

                        <button onClick={() => toggleExpand(event.id)} style={{
                            alignSelf: 'flex-start', marginTop: '1rem',
                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                            backgroundColor: 'var(--c-black)', color: 'var(--c-white)', border: '2px solid var(--c-black)', boxShadow: '4px 4px 0 var(--c-yellow)',
                            padding: '0.6rem 1.25rem', cursor: 'pointer', transition: 'all 0.1s'
                        }}>
                            <ShuffleText text={isExpanded ? "Collapse ▲" : "Learn More ▼"} />
                        </button>
                    </div>
                </div>
            </AnimateOnScroll>
        );
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <Navbar />
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 5% 5rem', width: '100%' }}>
                <BackButton />
                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '2rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem' }}>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                            Events<span style={{ color: 'var(--c-yellow)' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                            Upcoming happenings and past galleries from the CS Department.
                        </p>
                    </div>
                </AnimateOnScroll>

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.15} threshold={0.05}>
                    <div style={{ marginBottom: '3.5rem', position: 'relative' }}>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%', maxWidth: '480px' }}>
                            <span style={{ position: 'absolute', left: '0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: isFocused ? 'var(--c-yellow)' : 'rgba(255,255,255,0.4)', pointerEvents: 'none', transition: 'color 0.15s', userSelect: 'none', }}>⌕</span>
                            <input
                                type="text" placeholder="Search events…" value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                                style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--c-white)', background: 'transparent', border: `2px solid ${isFocused ? 'var(--c-yellow)' : 'rgba(255,255,255,0.3)'}`, outline: 'none', padding: '0.65rem 2.5rem 0.65rem 2.35rem', boxShadow: isFocused ? '4px 4px 0 var(--c-yellow)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} aria-label="Clear search" style={{ position: 'absolute', right: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', lineHeight: 1, padding: '0' }}>×</button>
                            )}
                        </div>
                    </div>
                </AnimateOnScroll>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-yellow)', fontSize: '1.2rem' }}>Syncing Server Calendars...</p>
                    </div>
                ) : (
                    <>
                        {todaysEvents.length > 0 && (
                            <>
                                <h2 className="serif-heading" style={{ color: 'var(--c-white)', borderBottom: '2px solid var(--c-yellow)', display: 'inline-block', fontSize: '2rem', marginBottom: '1.5rem' }}>Today's Events</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem', marginBottom: '5rem' }}>
                                    {todaysEvents.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
                                </div>
                            </>
                        )}

                        <h2 className="serif-heading" style={{ color: 'var(--c-yellow)', fontSize: '2rem', marginBottom: '1.5rem' }}>Upcoming Sessions</h2>
                        {upcomingEvents.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem', marginBottom: '5rem' }}>
                                {upcomingEvents.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.2)', marginBottom: '5rem' }}>
                                <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>No upcoming events currently scheduled.</p>
                            </div>
                        )}

                        <h2 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: '2rem', marginBottom: '1.5rem', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '3rem' }}>Event Archives</h2>
                        {pastEvents.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                                {pastEvents.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.2)' }}>
                                <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', fontSize: '1rem' }}>No past events archived yet.</p>
                            </div>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}