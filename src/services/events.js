export const EventService = {
    
    // 1. Fetch all events (Public and Admin view)
    fetchAllEvents: async () => {
        const response = await fetch('/api/events', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Failed to fetch events");
        return await response.json();
    },

    // 2. Create a new event
    createEvent: async (eventData) => {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', eventData })
        });
        if (!response.ok) throw new Error("Failed to create event");
        return await response.json();
    },

    // 3. Update visibility (Hide/Show)
    updateEventStatus: async (id, status) => {
        const response = await fetch(`/api/events/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error("Failed to update status");
        return await response.json();
    },

    // 4. Delete an event
    deleteEvent: async (id) => {
        const response = await fetch(`/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Failed to delete event");
        return await response.json();
    }
};