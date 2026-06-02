const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Use your specific table name
const TABLE_NAME = process.env.TABLE_NAME || 'bb_gallery_events';

exports.handler = async (event) => {
    const method = event.httpMethod;
    const path = event.path; // e.g., /api/events or /api/events/{id}/status

    try {
        // 1. GET ALL EVENTS
        if (method === 'GET') {
            const command = new ScanCommand({ TableName: TABLE_NAME });
            const response = await docClient.send(command);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response.Items)
            };
        }

        // 2. CREATE (POST)
        if (method === 'POST') {
            const body = JSON.parse(event.body);
            const eventId = uuidv4();
            
            const newItem = {
                PK: 'EVENT',
                SK: `EV#${eventId}`,
                id: eventId, // Storing ID for easier frontend access
                ...body.eventData,
                status: 'visible', // Default to visible
                createdAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({ 
                TableName: TABLE_NAME, 
                Item: newItem 
            }));
            
            return {
                statusCode: 201,
                body: JSON.stringify({ message: "Event created successfully", id: eventId })
            };
        }

        // 3. UPDATE STATUS (PATCH - Hide/Show)
        // Expected Path: /api/events/{id}/status
        if (method === 'PATCH' && path.includes('/status')) {
            const pathParts = path.split('/');
            const eventId = pathParts[pathParts.length - 2]; 
            const { status } = JSON.parse(event.body);
            
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: 'EVENT', SK: `EV#${eventId}` },
                UpdateExpression: "set #s = :s",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: { ":s": status }
            }));
            
            return { statusCode: 200, body: JSON.stringify({ message: "Status updated" }) };
        }

        // 4. DELETE
        // Expected Path: /api/events/{id}
        if (method === 'DELETE') {
            const pathParts = path.split('/');
            const eventId = pathParts[pathParts.length - 1];
            
            await docClient.send(new DeleteCommand({ 
                TableName: TABLE_NAME, 
                Key: { PK: 'EVENT', SK: `EV#${eventId}` } 
            }));
            
            return { statusCode: 200, body: JSON.stringify({ message: "Event deleted" }) };
        }

        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };

    } catch (err) {
        console.error("Backend Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};