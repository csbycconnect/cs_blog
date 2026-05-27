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

/**
 * Extract the clean ID from a PK (removes "ARTICLE#" prefix)
 * E.g., "ARTICLE#ART_NTAF3RDTT" -> "ART_NTAF3RDTT"
 */
function extractArticleId(pk) {
    if (!pk) return null;
    if (pk.startsWith("ARTICLE#")) {
        return pk.replace("ARTICLE#", "");
    }
    return pk;
}

/**
 * Normalize an article object to ensure it has a clean 'id' field
 * If article already has 'id', keep it; otherwise extract from PK
 */
function normalizeArticle(article) {
    if (!article) return article;
    const normalized = {
        ...article,
        id: article.id || extractArticleId(article.PK),
        // canonicalize email from legacy authorEmail if present
        email: article.email || article.authorEmail || null,
    };

    // remove legacy field to avoid duplication in API responses
    if (normalized.authorEmail) delete normalized.authorEmail;

    return normalized;
}

/**
 * Normalize an array of articles
 */
function normalizeArticles(articles) {
    if (!Array.isArray(articles)) return articles;
    return articles.map(normalizeArticle);
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

    return normalizeArticles(result.Items || []);
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

    return normalizeArticles(result.Items || []);
}

/* ------------------------------------------------ */
/* GET ARTICLES BY SPECIFIC AUTHOR (For "Your Blogs") */
/* ------------------------------------------------ */
export async function getArticlesByAuthor(userSubId) {
    if (!userSubId) return [];

    const authorKey = `USER#${userSubId}`;

    try {
        const result = await dynamoDb.send(
            new QueryCommand({
                TableName: TABLES.ARTICLES || "bb_articles",
                IndexName: "AuthorIndex",
                KeyConditionExpression: "GSI2PK = :gsi2pk",
                ExpressionAttributeValues: {
                    ":gsi2pk": authorKey
                }
            })
        );

        if (result.Items && result.Items.length > 0) {
            return normalizeArticles(result.Items);
        }
    } catch (error) {
        console.warn("DynamoDB Query AuthorIndex failed, falling back to scan:", error.message || error);
    }

    try {
        const scanResult = await dynamoDb.send(
            new ScanCommand({
                TableName: TABLES.ARTICLES || "bb_articles",
                FilterExpression: "authorSub = :sub OR authorId = :sub",
                ExpressionAttributeValues: {
                    ":sub": userSubId
                }
            })
        );
        return normalizeArticles(scanResult.Items || []);
    } catch (fallbackError) {
        console.error("DynamoDB Scan fallback for author query failed:", fallbackError);
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

        return normalizeArticle(result.Item || null);
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
    return normalizeArticles(response.Items || []);
}