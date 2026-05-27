import {
    ScanCommand,
    QueryCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDb } from "../aws/dynamodb.js";
import { TABLES } from "../constants/tables.js";

/* ------------------------------------------------ */
/* GET ALL ACCEPTED ARTICLES */
/* ------------------------------------------------ */

export async function getAcceptedArticles() {
    const result = await dynamoDb.send(
        new QueryCommand({
            TableName: TABLES.ARTICLES,
            IndexName: "StatusIndex",
            KeyConditionExpression: "GSI3PK = :status",
            ExpressionAttributeValues: {
                ":status": "STATUS#accepted",
            },
        })
    );

    return result.Items || [];
}

/* ------------------------------------------------ */
/* GET ALL ARTICLES */
/* ------------------------------------------------ */

export async function getAllArticles() {
    const result = await dynamoDb.send(
        new ScanCommand({
            TableName: TABLES.ARTICLES,
        })
    );

    return result.Items || [];
}

/* ------------------------------------------------ */
/* GET ARTICLE BY ID */
/* ------------------------------------------------ */

export async function getArticleById(id) {
    if (!id) return null;

    // 1. Clean up any weird URL/colon formatting issues coming from the client
    // This turns "ART:1" into "ART#1" dynamically
    let normalizedId = id.replace("ART:", "ART#");

    // 2. If it's a raw numeric string or string without prefix, ensure it matches the database pattern
    if (!normalizedId.startsWith("ART#")) {
        normalizedId = `ART#${normalizedId}`;
    }

    try {
        const result = await dynamoDb.send(new GetCommand({
            TableName: TABLES.ARTICLES || "bb_articles",
            Key: {
                PK: normalizedId,
                SK: "ARTICLE"
            }
        }));

        return result.Item || null;
    } catch (error) {
        console.error("DynamoDB GetCommand Core Exception:", error);
        throw new Error(`Database read execution failed for ID: ${normalizedId}`);
    }
}
/* ------------------------------------------------ */
/* TOGGLE LIKE */
/* ------------------------------------------------ */

export async function toggleLike(id, isLiking) {
    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: id,
                SK: "ARTICLE",
            },
            UpdateExpression: "ADD #l :inc",
            ExpressionAttributeNames: {
                "#l": "likes",
            },
            ExpressionAttributeValues: {
                ":inc": isLiking ? 1 : -1,
            },
        })
    );
}

/* ------------------------------------------------ */
/* INCREMENT VIEWS */
/* ------------------------------------------------ */

export async function incrementViews(id) {
    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: id,
                SK: "ARTICLE",
            },
            UpdateExpression: "ADD #v :inc",
            ExpressionAttributeNames: {
                "#v": "views",
            },
            ExpressionAttributeValues: {
                ":inc": 1,
            },
        })
    );
}