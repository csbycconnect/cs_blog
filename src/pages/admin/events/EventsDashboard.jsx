import React, { useState, useEffect, useMemo } from 'react';
import { EventService } from '../../../services/events';

export default function AdminEvents() {
    const [adminEvents, setAdminEvents] = useState([]);
    const [eventSearch, setEventSearch] = useState('');
    const [eventCategoryFilter, setEventCategoryFilter] = useState('');
    const [eventDateFilter, setEventDateFilter] = useState('');

    useEffect(() => {
        fetchAdminEvents();
    }, []);

    const fetchAdminEvents = async () => {
        try {
            const data = await EventService.fetchAllEvents();
            setAdminEvents(data);
        } catch (err) { console.error(err); }
    };

    const filteredEvents = useMemo(() => {
        return adminEvents.filter(ev => {
            const matchesSearch = ev.title?.toLowerCase().includes(eventSearch.toLowerCase()) || 
                                  ev.department?.toLowerCase().includes(eventSearch.toLowerCase());
            const matchesCategory = eventCategoryFilter ? ev.category === eventCategoryFilter : true;
            const matchesDate = eventDateFilter ? ev.date === eventDateFilter : true;
            return matchesSearch && matchesCategory && matchesDate;
        });
    }, [adminEvents, eventSearch, eventCategoryFilter, eventDateFilter]);

    const toggleHide = async (e, event) => {
        e.preventDefault();
        const newStatus = event.status === 'hidden' ? 'visible' : 'hidden';
        await EventService.updateEventStatus(event.id, newStatus);
        setAdminEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, status: newStatus } : ev));
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (!window.confirm("Delete this event?")) return;
        await EventService.deleteEvent(id);
        setAdminEvents(prev => prev.filter(ev => ev.id !== id));
    };

    return (
        <div className="admin-events-container">
            {/* SEARCH & FILTER UI */}
            <div className="controls">
                <input placeholder="Search Title..." onChange={(e) => setEventSearch(e.target.value)} />
                <input type="date" onChange={(e) => setEventDateFilter(e.target.value)} />
                {/* ... select category ... */}
            </div>

            {/* EVENT LIST */}
            {filteredEvents.map(event => (
                <div key={event.id} className={event.status === 'hidden' ? 'dimmed' : ''}>
                    <h3>{event.title}</h3>
                    <button type="button" onClick={(e) => toggleHide(e, event)}>
                        {event.status === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                    <button type="button" onClick={(e) => handleDelete(e, event.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
}