// api/events/index.js
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { TABLES } from "../lib/constants/tables.js";
import { dynamoDb } from "../lib/aws/dynamodb.js";
import { getViewer, denyUnlessAdmin, rateLimited } from "../lib/auth.js";

const TABLE_NAME = TABLES.EVENTS || process.env.TABLE_NAME || "bb_gallery_events";

const ALLOWED_STATUSES = ["visible", "hidden"];
const MAX_EVENT_JSON_CHARS = 50_000;
const MAX_SCAN_PAGES = 20;
// Fields the client may never set itself
const RESERVED = ["PK", "SK", "id", "status", "createdAt"];

// Scan with pagination (a single Scan stops at 1MB and silently drops the rest).
async function scanAll(extra = {}) {
    const items = [];
    let ExclusiveStartKey;
    for (let page = 0; page < MAX_SCAN_PAGES; page++) {
        const r = await dynamoDb.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey, ...extra }));
        items.push(...(r.Items || []));
        ExclusiveStartKey = r.LastEvaluatedKey;
        if (!ExclusiveStartKey) break;
    }
    return items;
}

// Old events were saved as PK "EVENT#<id>" / SK "METADATA", new ones as PK "EVENT" / SK "EV#<id>".
// Look the real key up by id so update/delete work on both.
async function findKey(id) {
    const items = await scanAll({
        FilterExpression: "#i = :id",
        ExpressionAttributeNames: { "#i": "id" },
        ExpressionAttributeValues: { ":id": id },
        ProjectionExpression: "PK, SK",
    });
    return items[0] ? { PK: items[0].PK, SK: items[0].SK } : null;
}

export default async function handler(req, res) {
    // Same-origin calls need no CORS. Only open it to an origin you name.
    if (process.env.ALLOWED_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const urlParts = req.url.split("?")[0].split("/").filter(Boolean);
        const viewer = await getViewer(req);

        // GET: public sees visible events only; admins can ask for everything with ?all=1
        if (req.method === "GET") {
            const wantsAll = new URL(req.url, "http://x").searchParams.get("all") === "1";
            let items = await scanAll();
            if (wantsAll) {
                if (denyUnlessAdmin(viewer, res)) return;
            } else {
                items = items.filter(e => e.status !== "hidden");
                res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
            }
            return res.status(200).json(items);
        }

        // Everything below changes data: admin only
        if (denyUnlessAdmin(viewer, res)) return;
        if (rateLimited(req, "events-write", 30)) return res.status(429).json({ error: "Too many requests" });

        // POST: create event
        if (req.method === "POST") {
            const eventData = req.body?.eventData;
            if (!eventData || typeof eventData !== "object" || Array.isArray(eventData)) {
                return res.status(400).json({ error: "Missing eventData" });
            }
            if (JSON.stringify(eventData).length > MAX_EVENT_JSON_CHARS) {
                return res.status(413).json({ error: "Event is too large" });
            }
            const clean = Object.fromEntries(Object.entries(eventData).filter(([k]) => !RESERVED.includes(k)));
            const eventId = randomUUID();

            // Spread FIRST so the client can never override keys/status
            const newItem = {
                ...clean,
                PK: "EVENT",
                SK: `EV#${eventId}`,
                id: eventId,
                status: "visible",
                createdAt: new Date().toISOString(),
            };
            await dynamoDb.send(new PutCommand({ TableName: TABLE_NAME, Item: newItem }));
            return res.status(201).json({ message: "Event created successfully", id: eventId });
        }

        // PATCH /api/events/{id}/status
        if (req.method === "PATCH" && urlParts.includes("status")) {
            const eventId = urlParts[urlParts.length - 2];
            const { status } = req.body || {};
            if (!eventId || !ALLOWED_STATUSES.includes(status)) {
                return res.status(400).json({ error: "Missing or invalid parameters" });
            }
            const key = await findKey(eventId);
            if (!key) return res.status(404).json({ error: "Event not found" });

            await dynamoDb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: key,
                UpdateExpression: "SET #s = :s",
                ConditionExpression: "attribute_exists(PK)",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: { ":s": status },
            }));
            return res.status(200).json({ message: "Status updated" });
        }

        // DELETE /api/events/{id}
        if (req.method === "DELETE") {
            const eventId = urlParts[urlParts.length - 1];
            if (!eventId || eventId === "events") return res.status(400).json({ error: "Missing ID" });
            const key = await findKey(eventId);
            if (!key) return res.status(404).json({ error: "Event not found" });

            await dynamoDb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }));
            return res.status(200).json({ message: "Event deleted" });
        }

        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    } catch (err) {
        console.error("Events API error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}