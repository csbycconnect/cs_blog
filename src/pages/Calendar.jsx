import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import AnimateOnScroll from '../components/shared/AnimateOnScroll';
import BackButton from '../components/shared/BackButton';
import { useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

import { ArticleAPI } from '../lib/api';

const categoryColors = {
    Competition: { bg: '#f7d000', text: '#000' },
    Lecture: { bg: '#fff9db', text: '#000' },
    Editorial: { bg: '#0A192F', text: '#fff' },
    Workshop: { bg: '#000', text: '#fff' },
};

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

const navBtnStyle = {
    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    backgroundColor: 'transparent', color: 'var(--c-black)',
    border: '2px solid var(--c-black)', boxShadow: '3px 3px 0 var(--c-black)',
    padding: '0.4rem 0.9rem', cursor: 'pointer',
};

export default function Calendar() {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(null);

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else { setViewMonth(m => m - 1); } setSelected(null); };
    const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else { setViewMonth(m => m + 1); } setSelected(null); };

    const pad = n => String(n).padStart(2, '0');
    const dateKey = (d) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
    const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

    const [eventsMap, setEventsMap] = useState({});
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchDynamicEvents = async () => {
            try {
                const data = await ArticleAPI.fetchAllEvents();
                const grouped = {};
                data.forEach(ev => {
                    const dateObj = new Date(ev.date);
                    // Standardize the key into YYYY-MM-DD
                    const standardKey = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
                    if (!grouped[standardKey]) grouped[standardKey] = [];
                    grouped[standardKey].push(ev);
                });
                setEventsMap(grouped);
            } catch (err) {
                console.error("Failed to map dynamic events for calendar:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDynamicEvents();
    }, []);

    const selectedEventsArr = selected ? (eventsMap[dateKey(selected)] || []) : [];

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2.5rem 5rem' }}>
                <BackButton />

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.1} threshold={0.05}>
                    <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--c-white)', paddingBottom: '1rem' }}>
                        <h1 className="serif-heading" style={{ color: 'var(--c-white)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
                            Calendar<span style={{ color: 'var(--c-yellow)' }}>.</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                            Track important dates, events, and deadlines for the CS Department.
                        </p>
                    </div>
                </AnimateOnScroll>

                <AnimateOnScroll animationClass="animate-slide-up" delay={0.15} threshold={0.05}>
                    <div style={{ position: 'relative' }}>
                        {/* Brutalist shadow */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '100%', height: '100%', border: '2px solid var(--c-yellow)', zIndex: 0 }} />
                        <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'var(--c-white)', border: '2px solid var(--c-black)', padding: '2rem' }}>

                            {/* Month Nav */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--c-black)', paddingBottom: '1rem' }}>
                                <button onClick={prevMonth} style={navBtnStyle}>← Prev</button>
                                <h2 className="serif-heading" style={{ fontSize: '1.8rem', color: 'var(--c-black)' }}>
                                    {MONTH_NAMES[viewMonth]} {viewYear}
                                </h2>
                                <button onClick={nextMonth} style={navBtnStyle}>Next →</button>
                            </div>

                            {/* Day headers */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                                {DAYS.map(d => (
                                    <div key={d} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', padding: '0.4rem 0', color: '#555', letterSpacing: '0.1em' }}>{d}</div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                {cells.map((day, i) => {
                                    if (!day) return <div key={`e-${i}`} />;
                                    const key = dateKey(day);
                                    const dayEvents = eventsMap[key] || [];
                                    const hasEvent = dayEvents.length > 0;
                                    const isSelected = selected === day;
                                    const todayDay = isToday(day);
                                    const topEventTagColor = hasEvent ? (categoryColors[dayEvents[0].category] ? categoryColors[dayEvents[0].category].bg : 'var(--c-black)') : null;

                                    return (
                                        <div
                                            key={key}
                                            onClick={() => hasEvent && setSelected(isSelected ? null : day)}
                                            title={hasEvent ? event.title : undefined}
                                            style={{
                                                aspectRatio: '1',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                                                fontWeight: todayDay ? 700 : 400,
                                                border: isSelected ? '2px solid var(--c-black)' : todayDay ? '2px solid var(--c-black)' : '2px solid transparent',
                                                backgroundColor: isSelected ? 'var(--c-black)' : todayDay ? 'var(--c-yellow)' : hasEvent ? '#f5f0e8' : 'transparent',
                                                color: isSelected ? '#fff' : 'var(--c-black)',
                                                cursor: hasEvent ? 'pointer' : 'default',
                                                boxShadow: isSelected ? '3px 3px 0 var(--c-yellow)' : todayDay ? '3px 3px 0 var(--c-black)' : 'none',
                                                transition: 'all 0.15s',
                                                position: 'relative',
                                            }}
                                        >
                                            {day}
                                            {hasEvent && (
                                                <span style={{
                                                    width: 5, height: 5, borderRadius: '50%',
                                                    backgroundColor: isSelected ? '#f7d000' : topEventTagColor,
                                                    position: 'absolute', bottom: 4,
                                                }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Selected day event panel */}
                            {selected && (
                                <div style={{
                                    marginTop: '1.5rem', borderTop: '2px solid var(--c-black)', paddingTop: '1.25rem',
                                    transition: 'all 0.2s',
                                }}>
                                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem', letterSpacing: '0.08em' }}>
                                        {MONTH_NAMES[viewMonth]} {selected}, {viewYear}
                                    </p>
                                    {selectedEventsArr.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {selectedEventsArr.map(ev => {
                                                const catColors = categoryColors[ev.category] || { bg: '#0A192F', text: '#fff' };
                                                let timeDisplay = '';
                                                if (ev.time && typeof ev.time === 'object') {
                                                    timeDisplay = `${ev.time.start} – ${ev.time.end}`;
                                                } else if (ev.timeStart) {
                                                    timeDisplay = `${ev.timeStart} – ${ev.timeEnd}`;
                                                }

                                                return (
                                                    <div key={ev.id} style={{ border: '2px solid #000', boxShadow: '5px 5px 0 ' + catColors.bg }}>
                                                        {/* Event header */}
                                                        <div style={{ background: catColors.bg, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                                            <div>
                                                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: catColors.text, marginBottom: 2, opacity: 0.8 }}>
                                                                    {ev.category || 'Event'}
                                                                </div>
                                                                <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '1.2rem', fontWeight: 700, color: catColors.text, lineHeight: 1.2 }}>
                                                                    {ev.title}
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: '1.5px solid rgba(0,0,0,0.2)', color: catColors.text, cursor: 'pointer', padding: '0.2rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', flexShrink: 0 }}>✕</button>
                                                        </div>
                                                        {/* Event body */}
                                                        <div style={{ background: '#fff', padding: '1.25rem' }}>
                                                            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                                                <div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#999', letterSpacing: '0.1em', marginBottom: 2 }}>🕐 Time</div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#000', fontWeight: 700 }}>{timeDisplay}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#999', letterSpacing: '0.1em', marginBottom: 2 }}>📍 Venue</div>
                                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#000', fontWeight: 700 }}>{ev.venue}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#444', lineHeight: 1.6, borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                                                                {ev.description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#aaa', padding: '1rem', border: '1.5px dashed #ddd' }}>
                                            No events scheduled for this day.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Legend */}
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#777', borderTop: '1px solid #ddd', paddingTop: '1rem', flexWrap: 'wrap' }}>
                                <span><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: 'var(--c-yellow)', border: '2px solid #000', marginRight: 4, verticalAlign: 'middle' }} />Today</span>
                                <span><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#f5f0e8', border: '1px solid #ccc', marginRight: 4, verticalAlign: 'middle' }} />Has Event <span style={{ color: '#bbb' }}>(click to view)</span></span>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f7d000', border: '1px solid #000', marginRight: 4, verticalAlign: 'middle' }} />ByteBoard</span>
                                    <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0A192F', marginRight: 4, verticalAlign: 'middle' }} />CS Dept</span>
                                    <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#333', marginRight: 4, verticalAlign: 'middle' }} />Academic</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>
            </main>
            <Footer />
        </div>
    );
}
