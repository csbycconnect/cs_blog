import {
    ScanCommand,
    QueryCommand,
    UpdateCommand,
    GetCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDb } from "../aws/dynamodb.js";
import { TABLES } from "../constants/tables.js";

function normalizeArticlePK(id) {
    if (!id) return null;
    let normalized = id;

    if (normalized.startsWith("ARTICLE#")) {
        return normalized;
    }

    if (normalized.startsWith("ART:")) {
        normalized = normalized.replace("ART:", "ART_");
    } else if (normalized.startsWith("ART#")) {
        normalized = normalized.replace("ART#", "ART_");
    }

    if (!normalized.startsWith("ART_")) {
        normalized = `ART_${normalized}`;
    }

    return `ARTICLE#${normalized}`;
}

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
/* GET ARTICLES BY SPECIFIC AUTHOR (For "Your Blogs") */
/* ------------------------------------------------ */
export async function getArticlesByAuthor(userSubId) {
    if (!userSubId) return [];

    try {
        const result = await dynamoDb.send(
            new QueryCommand({
                TableName: TABLES.ARTICLES || "bb_articles",
                IndexName: "AuthorIndex",
                KeyConditionExpression: "GSI2PK = :gsi2pk",
                ExpressionAttributeValues: {
                    ":gsi2pk": `USER#${userSubId}`
                }
            })
        );

        return result.Items || [];
    } catch (error) {
        console.error("DynamoDB Query AuthorIndex Core Exception:", error);
        return [];
    }
}

/* ------------------------------------------------ */
/* GET ARTICLE BY ID */
/* ------------------------------------------------ */

export async function getArticleById(id) {
    if (!id) return null;

    const normalizedId = normalizeArticlePK(id);
    if (!normalizedId) return null;

    try {
        const result = await dynamoDb.send(new GetCommand({
            TableName: TABLES.ARTICLES || "bb_articles",
            Key: {
                PK: normalizedId,
                SK: "METADATA"
            }
        }));

        return result.Item || null;
    } catch (error) {
        console.error("DynamoDB GetCommand Core Exception:", error);
        throw error; // Propagate down to catch blocks safely
    }
}
/* ------------------------------------------------ */
/* TOGGLE LIKE */
/* ------------------------------------------------ */

export async function toggleLike(id, isLiking) {
    const partitionKey = normalizeArticlePK(id);
    if (!partitionKey) return;

    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: partitionKey,
                SK: "METADATA",
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
    const partitionKey = normalizeArticlePK(id);
    if (!partitionKey) return;

    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: partitionKey,
                SK: "METADATA",
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

/**
 * PRODUCTION GRADE: Instantly fetches pending submissions for a specific club 
 * without doing a slow, table-wide database scan!
 */
export async function getPendingSubmissionsByClub(clubName = "General") {
    const command = new QueryCommand({
        TableName: TABLES.ARTICLES,
        IndexName: "GSI1", // References the secondary index rule built on AWS
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
            ":gsi1pk": `STATUS#pending#CLUB#${clubName}`
        }
    });

    const response = await dynamoDb.send(command);
    return response.Items || [];
}