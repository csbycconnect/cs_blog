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
    // If the lookup ID doesn't start with the prefix, fix it dynamically
    const partitionKey = id.startsWith("ART#") ? id : `ART#${id}`;

    const result = await dynamoDb.send(new GetCommand({
        TableName: TABLES.ARTICLES,
        Key: {
            PK: partitionKey,
            SK: "ARTICLE"
        }
    }));
    return result.Item;
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