import {
    ScanCommand,
    QueryCommand,
    UpdateCommand,
    GetCommand,
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

    // Normalize potential ID string variations safely
    let normalizedId = id.replace("ART:", "ART#");

    // Only apply standard 'ART#' prefixing logic if it isn't an explicit system UUID string format
    if (!normalizedId.startsWith("ART#") && !normalizedId.includes("-")) {
        normalizedId = `ART#${normalizedId}`;
    }

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
    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: id,
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
    await dynamoDb.send(
        new UpdateCommand({
            TableName: TABLES.ARTICLES,
            Key: {
                PK: id,
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