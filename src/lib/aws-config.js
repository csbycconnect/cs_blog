import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const REGION = import.meta.env.VITE_AWS_REGION || "ap-south-1";

const client = new DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
});

export const dynamoDb = DynamoDBDocumentClient.from(client);
export const TABLE_NAME = import.meta.env.VITE_DYNAMODB_TABLE_NAME || "bb_articles";
export const USERS_TABLE_NAME = import.meta.env.VITE_DYNAMODB_USERS_TABLE_NAME || "bb_users";
export const EVENTS_TABLE_NAME = import.meta.env.VITE_DYNAMODB_EVENTS_TABLE_NAME || "bb_gallery_events";
