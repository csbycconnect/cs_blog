// api/lib/db/events.js
import { dynamoDb } from "../aws/dynamodb.js";
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { TABLES } from "../constants/tables.js";

const TABLE_NAME = TABLES.EVENTS || "bb_gallery_events";

// 1. Fetch all events
export async function getEvents() {
    const params = {
        TableName: TABLE_NAME,
        // Assuming you want all items where PK starts with EVENT#
        // If you have a FilterExpression, it's safer for scans
        FilterExpression: "begins_with(PK, :prefix)",
        ExpressionAttributeValues: {
            ":prefix": "EVENT#"
        }
    };
    const result = await dynamoDb.send(new ScanCommand(params));
    return result.Items || [];
}

// 2. Create a new event
export async function createEvent(eventData) {
    const eventId = `EVENT#${crypto.randomUUID()}`; // Generates a clean ID
    const item = {
        PK: eventId,
        SK: "METADATA",
        ...eventData,
        createdAt: new Date().toISOString()
    };
    await dynamoDb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
    }));
    return item;
}

// 3. Update an existing event
export async function updateEvent(eventData) {
    // Dynamically build update expression
    const { id, ...updates } = eventData;
    const UpdateExpression = "SET " + Object.keys(updates).map(k => `#${k} = :${k}`).join(", ");
    const ExpressionAttributeNames = Object.keys(updates).reduce((acc, k) => ({ ...acc, [`#${k}`]: k }), {});
    const ExpressionAttributeValues = Object.keys(updates).reduce((acc, k) => ({ ...acc, [`:${k}`]: updates[k] }), {});

    await dynamoDb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: id, SK: "METADATA" },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    }));
}

// 4. Delete an event
export async function deleteEvent(id) {
    await dynamoDb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: id, SK: "METADATA" }
    }));
}