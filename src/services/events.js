// src/services/events.js
export const EventService = {
    // 1. Used by Events.jsx to display the list
    fetchAllEvents: async () => {
        const response = await fetch('/api/events', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Failed to fetch events");
        return await response.json();
    },
    
    // 2. Used by Admin.jsx to manage events
    save: async (eventData, action = 'create') => {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, eventData })
        });
        return await response.json();
    }
};