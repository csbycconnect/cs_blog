// api/events/index.js
import { setCorsHeaders } from "../lib/utils/cors.js"; // Your new utility
import { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} from "../lib/db/events.js";

export default async function handler(req, res) {
    setCorsHeaders(res); 

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        // GET: Public fetch
        if (req.method === "GET") {
            const events = await getEvents();
            return res.status(200).json(events);
        }

        // POST: Admin Actions (Create, Update, Delete)
        if (req.method === "POST") {
            const { action, eventData } = req.body;
            
            if (action === "create") await createEvent(eventData);
            else if (action === "update") await updateEvent(eventData);
            else if (action === "delete") await deleteEvent(eventData.id);
            else return res.status(400).json({ error: "Invalid action" });

            return res.status(200).json({ success: true });
        }
    } catch (err) {
        console.error("Event API Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}