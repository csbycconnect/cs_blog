import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from "../lib/constants/tables.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = TABLES.EVENTS || 'bb_gallery_events';

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const urlParts = req.url.split('?')[0].split('/');

        // GET all events
        if (req.method === 'GET') {
            const command = new ScanCommand({ TableName: TABLE_NAME });
            const response = await docClient.send(command);
            return res.status(200).json(response.Items || []);
        }

        // POST - create event
        if (req.method === 'POST') {
            const body = req.body || {};
            const eventId = uuidv4();

            const newItem = {
                PK: 'EVENT',
                SK: `EV#${eventId}`,
                id: eventId,
                ...body.eventData,
                status: 'visible',
                createdAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: newItem }));
            return res.status(201).json({ message: 'Event created successfully', id: eventId });
        }

        // PATCH - update status at /api/events/{id}/status
        if (req.method === 'PATCH' && urlParts.includes('status')) {
            const eventId = urlParts[urlParts.length - 2];
            const { status } = req.body || {};
            if (!eventId || typeof status === 'undefined') return res.status(400).json({ error: 'Missing parameters' });

            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: 'EVENT', SK: `EV#${eventId}` },
                UpdateExpression: 'SET #s = :s',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':s': status }
            }));

            return res.status(200).json({ message: 'Status updated' });
        }

        // DELETE - /api/events/{id}
        if (req.method === 'DELETE') {
            const eventId = urlParts[urlParts.length - 1];
            if (!eventId) return res.status(400).json({ error: 'Missing ID' });

            await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: 'EVENT', SK: `EV#${eventId}` } }));
            return res.status(200).json({ message: 'Event deleted' });
        }

        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    } catch (err) {
        console.error('Backend Error:', err);
        return res.status(500).json({ error: err.message || String(err) });
    }
}