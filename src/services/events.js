// src/services/events.js
import { authFetch } from "../lib/authFetch";

const API_BASE = "/api/events";

export const EventsService = {
    // Public: visible events only
    async getAll() {
        const res = await authFetch(API_BASE);
        if (!res.ok) throw new Error("Failed to load events");
        return await res.json();
    },

    // Admin: includes hien events
    async getAllAdmin() {
        const res = await authFetch(`${API_BASE}?all=1`);
        if (!res.ok) throw new Error("Failed to load events");
        return await res.json();
    },

    async create(eventData) {
        const res = await authFetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventData }),
        });
        if (!res.ok) throw new Error("Failed to create event");
        return await res.json();
    },

    async setStatus(id, status) {
        const res = await authFetch(`${API_BASE}/${encodeURIComponent(id)}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Failed to update event status");
        return await res.json();
    },

    async remove(id) {
        const res = await authFetch(`${API_BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete event");
        return await res.json();
    },
};