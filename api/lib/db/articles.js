import {
    ScanCommand,
    QueryCommand,
    UpdateCommand,
    GetCommand,
    TransactWriteCommand,
    BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

import { dynamoDb } from "../aws/dynamodb.js";
import { TABLES } from "../constants/tables.js";

const table = () => TABLES.ARTICLES || "bb_articles";

/* ------------------------------------------------ */
/* SAFETY LIMITS                                    */
/* ------------------------------------------------ */

const MAX_LIST_ITEMS = 500;    // hard cap for any "list everything" call
const MAX_ADMIN_ITEMS = 2000;
const MAX_PAGE_SIZE = 50;

/**
 * Attributes needed to render the public blog list.
 * Deliberately EXCLUDES: content, contentHTML, authorEmail, email.
 * (Full article bodies were being sent to every visitor on every list load,
 *  and DynamoDB bills reads by item size.)
 */
const LIST_FIELDS = [
    "PK", "id", "title", "subtitle", "excerpt",
    "name", "authorName", "authorSub", "authorId",
    "category", "club", "tags", "readTime",
    "createdAt", "updatedAt", "date",
    "views", "likes", "comments", "status",
];
const LIST_PROJECTION = LIST_FIELDS.map((_, i) => `#f${i}`).join(", ");
const LIST_NAMES = Object.fromEntries(LIST_FIELDS.map((f, i) => [`#f${i}`, f]));

const encodeCursor = (key) =>
    key ? Buffer.from(JSON.stringify(key)).toString("base64url") : null;

const decodeCursor = (cursor) => {
    if (!cursor) return undefined;
    try {
        return JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    } catch {
        return undefined;
    }
};

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
        // canonicalize author name to `name`
        name: article.name || article.authorName || article.author || null,
    };

    // remove legacy fields to avoid duplication in API responses
    if (normalized.authorEmail) delete normalized.authorEmail;
    if (normalized.authorName) delete normalized.authorName;

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
/* GET ACCEPTED ARTICLES (public blog list)         */
/* ------------------------------------------------ */

const INDEX_NAMES = ["StatusIndex", "GSI3", "GSI3PK", "StatusGSI"];
let resolvedIndex = null; // remember the index that works: no more probing 4 names per request

const acceptedQuery = (indexName, startKey, limit) =>
    new QueryCommand({
        TableName: table(),
        IndexName: indexName,
        KeyConditionExpression: "GSI3PK = :status AND SK = :sk",
        ExpressionAttributeValues: {
            ":status": "STATUS#accepted",
            ":sk": "METADATA",
        },
        ProjectionExpression: LIST_PROJECTION,
        ExpressionAttributeNames: LIST_NAMES,
        ExclusiveStartKey: startKey,
        Limit: limit,
    });

/**
 * - getAcceptedArticles()                 -> array (all pages, capped at MAX_LIST_ITEMS)
 * - getAcceptedArticles({ limit, cursor }) -> { items, nextCursor }
 *
 * An EMPTY result from a working index is a valid answer and is returned as-is
 * (previously it fell through to a full-table Scan).
 */
export async function getAcceptedArticles({ limit, cursor } = {}) {
    const paged = Number.isInteger(limit) && limit > 0;
    const pageSize = paged ? Math.min(limit, MAX_PAGE_SIZE) : undefined;
    const startKey = decodeCursor(cursor);
    const candidates = resolvedIndex ? [resolvedIndex] : INDEX_NAMES;

    for (const idx of candidates) {
        try {
            if (paged) {
                const r = await dynamoDb.send(acceptedQuery(idx, startKey, pageSize));
                resolvedIndex = idx;
                return {
                    items: normalizeArticles(r.Items || []),
                    nextCursor: encodeCursor(r.LastEvaluatedKey),
                };
            }

            const items = [];
            let key = startKey;
            do {
                const r = await dynamoDb.send(acceptedQuery(idx, key, undefined));
                items.push(...(r.Items || []));
                key = r.LastEvaluatedKey;
            } while (key && items.length < MAX_LIST_ITEMS);

            resolvedIndex = idx;
            return normalizeArticles(items.slice(0, MAX_LIST_ITEMS));
        } catch (err) {
            if (resolvedIndex === idx) resolvedIndex = null; // index vanished: re-probe next time
            console.warn(`Status query with index ${idx} failed:`, err.message || err);
        }
    }

    // Last resort: every index failed (an ERROR, not an empty result).
    // Scan is expensive: it is capped, projected and logged loudly.
    console.error("ALERT: no accepted-articles index worked, falling back to Scan. Create the status GSI.");
    try {
        const items = [];
        let key = startKey;
        do {
            const r = await dynamoDb.send(
                new ScanCommand({
                    TableName: table(),
                    FilterExpression: "(#s = :accepted OR GSI3PK = :gpk) AND SK = :sk",
                    ProjectionExpression: LIST_PROJECTION,
                    ExpressionAttributeNames: { ...LIST_NAMES, "#s": "status" },
                    ExpressionAttributeValues: {
                        ":accepted": "accepted",
                        ":gpk": "STATUS#accepted",
                        ":sk": "METADATA",
                    },
                    ExclusiveStartKey: key,
                })
            );
            items.push(...(r.Items || []));
            key = r.LastEvaluatedKey;
        } while (key && items.length < MAX_LIST_ITEMS);

        const out = normalizeArticles(items.slice(0, MAX_LIST_ITEMS));
        return paged ? { items: out.slice(0, pageSize), nextCursor: null } : out;
    } catch (scanErr) {
        console.error("Failed to fetch accepted articles via Scan fallback:", scanErr);
        throw scanErr; // let the route return 5xx instead of caching an empty list
    }
}

/* ------------------------------------------------ */
/* GET ALL ARTICLES (admin)                         */
/* ------------------------------------------------ */

export async function getAllArticles() {
    const items = [];
    let key;
    do {
        const result = await dynamoDb.send(
            new ScanCommand({
                TableName: table(),
                FilterExpression: "SK = :sk",
                ExpressionAttributeValues: { ":sk": "METADATA" },
                ExclusiveStartKey: key,
            })
        );
        items.push(...(result.Items || []));
        key = result.LastEvaluatedKey;
    } while (key && items.length < MAX_ADMIN_ITEMS);

    return normalizeArticles(items);
}

/* ------------------------------------------------ */
/* GET ARTICLES BY SPECIFIC AUTHOR (For "Your Blogs") */
/* ------------------------------------------------ */
export async function getArticlesByAuthor(userSubId) {
    if (!userSubId) return [];

    const authorKey = `USER#${userSubId}`;

    try {
        const items = [];
        let key;
        do {
            const result = await dynamoDb.send(
                new QueryCommand({
                    TableName: table(),
                    IndexName: "AuthorIndex",
                    KeyConditionExpression: "GSI2PK = :gsi2pk AND SK = :sk",
                    ExpressionAttributeValues: {
                        ":gsi2pk": authorKey,
                        ":sk": "METADATA",
                    },
                    ExclusiveStartKey: key,
                })
            );
            items.push(...(result.Items || []));
            key = result.LastEvaluatedKey;
        } while (key && items.length < MAX_LIST_ITEMS);

        // A user with zero articles is a valid result: do NOT fall through to a table Scan.
        return normalizeArticles(items);
    } catch (error) {
        console.warn("DynamoDB Query AuthorIndex failed, falling back to scan:", error.message || error);
    }

    try {
        const items = [];
        let key;
        do {
            const scanResult = await dynamoDb.send(
                new ScanCommand({
                    TableName: table(),
                    FilterExpression: "(authorSub = :sub OR authorId = :sub) AND SK = :sk",
                    ExpressionAttributeValues: {
                        ":sub": userSubId,
                        ":sk": "METADATA",
                    },
                    ExclusiveStartKey: key,
                })
            );
            items.push(...(scanResult.Items || []));
            key = scanResult.LastEvaluatedKey;
        } while (key && items.length < MAX_ADMIN_ITEMS);

        return normalizeArticles(items);
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
            TableName: table(),
            Key: {
                PK: normalizedId,
                SK: "METADATA"
            }
            // IMPORTANT: Do not include a ProjectionExpression here unless you
            // specifically list authorEmail. Returning the full item ensures the
            // email address is available for notification dispatch.
        }));

        return normalizeArticle(result.Item || null);
    } catch (error) {
        console.error("DynamoDB GetCommand Core Exception:", error);
        throw error; // Propagate down to catch blocks safely
    }
}

/* ------------------------------------------------ */
/* TOGGLE LIKE                                      */
/* ------------------------------------------------ */

/**
 * toggleLike(id, isLiking, userSub)
 *
 * With userSub (verified from the auth token in the route):
 *   one LIKE item per (article, user): PK=ARTICLE#..., SK=LIKE#<sub>.
 *   The item and the counter change in ONE transaction, so a user can't like
 *   twice, can't unlike something they never liked, and the count can't drift
 *   or go negative. No unbounded likedBy array on the article item.
 *
 * Without userSub (legacy callers): old behaviour, but the count can't go below 0.
 *
 * Returns { changed: boolean }.
 */
export async function toggleLike(id, isLiking, userSub = null) {
    const partitionKey = normalizeArticlePK(id);
    if (!partitionKey) return { changed: false };

    const TableName = table();
    const articleKey = { PK: partitionKey, SK: "METADATA" };

    if (!userSub) {
        try {
            await dynamoDb.send(
                new UpdateCommand({
                    TableName,
                    Key: articleKey,
                    UpdateExpression: "ADD #l :inc",
                    ...(isLiking ? {} : { ConditionExpression: "#l > :zero" }),
                    ExpressionAttributeNames: { "#l": "likes" },
                    ExpressionAttributeValues: isLiking
                        ? { ":inc": 1 }
                        : { ":inc": -1, ":zero": 0 },
                })
            );
            return { changed: true };
        } catch (err) {
            if (err.name === "ConditionalCheckFailedException") return { changed: false };
            throw err;
        }
    }

    const likeKey = { PK: partitionKey, SK: `LIKE#${userSub}` };

    try {
        await dynamoDb.send(
            new TransactWriteCommand({
                TransactItems: [
                    isLiking
                        ? {
                            Put: {
                                TableName,
                                Item: { ...likeKey, likedAt: new Date().toISOString() },
                                ConditionExpression: "attribute_not_exists(PK)",
                            },
                        }
                        : {
                            Delete: {
                                TableName,
                                Key: likeKey,
                                ConditionExpression: "attribute_exists(PK)",
                            },
                        },
                    {
                        Update: {
                            TableName,
                            Key: articleKey,
                            UpdateExpression: "ADD #l :inc",
                            ConditionExpression: "attribute_exists(PK)",
                            ExpressionAttributeNames: { "#l": "likes" },
                            ExpressionAttributeValues: { ":inc": isLiking ? 1 : -1 },
                        },
                    },
                ],
            })
        );
        return { changed: true };
    } catch (err) {
        // already liked / not liked / article missing: nothing was written
        if (err.name === "TransactionCanceledException") return { changed: false };
        throw err;
    }
}

/**
 * Which of these articles has this user liked?  One BatchGet (max 100 keys),
 * so the route can attach `likedBy: [userSub]` to ONLY the caller's own likes
 * instead of exposing every liker's id to the public.
 */
export async function getLikedArticleIds(userSub, articleIds = []) {
    if (!userSub || articleIds.length === 0) return new Set();

    const keys = [...new Set(articleIds)]
        .slice(0, 100)
        .map(id => ({ PK: normalizeArticlePK(id), SK: `LIKE#${userSub}` }));

    const TableName = table();
    const res = await dynamoDb.send(
        new BatchGetCommand({
            RequestItems: {
                [TableName]: { Keys: keys, ProjectionExpression: "PK" },
            },
        })
    );

    return new Set(
        (res.Responses?.[TableName] || []).map(item => extractArticleId(item.PK))
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
            TableName: table(),
            Key: {
                PK: partitionKey,
                SK: "METADATA",
            },
            UpdateExpression: "ADD #v :inc",
            ConditionExpression: "attribute_exists(PK)", // never create ghost items for random ids
            ExpressionAttributeNames: {
                "#v": "views",
            },
            ExpressionAttributeValues: {
                ":inc": 1,
            },
        })
    ).catch(err => {
        if (err.name !== "ConditionalCheckFailedException") throw err;
    });
}

/**
 * PRODUCTION GRADE: Instantly fetches pending submissions for a specific club
 * without doing a slow, table-wide database scan!
 */
export async function getPendingSubmissionsByClub(clubName = "General") {
    const items = [];
    let key;
    do {
        const response = await dynamoDb.send(
            new QueryCommand({
                TableName: table(),
                IndexName: "GSI1", // References the secondary index rule built on AWS
                KeyConditionExpression: "GSI1PK = :gsi1pk AND SK = :sk",
                ExpressionAttributeValues: {
                    ":gsi1pk": `STATUS#pending#CLUB#${clubName}`,
                    ":sk": "METADATA"
                },
                ExclusiveStartKey: key,
            })
        );
        items.push(...(response.Items || []));
        key = response.LastEvaluatedKey;
    } while (key && items.length < MAX_ADMIN_ITEMS);

    return normalizeArticles(items);
}