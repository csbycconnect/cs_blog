import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  UpdateCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

/* ------------------------------------------------ */
/* GET ALL ARTICLES */
/* ------------------------------------------------ */

export async function getAllArticles() {
  const result = await dynamoDb.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  return result.Items || [];
}

/* ------------------------------------------------ */
/* GET ARTICLE BY ID */
/* ------------------------------------------------ */

export async function getArticleById(id) {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": id,
        ":sk": "ARTICLE",
      },
    })
  );

  return result.Items?.[0] || null;
}

/* ------------------------------------------------ */
/* TOGGLE LIKE */
/* ------------------------------------------------ */

export async function toggleLike(id, isLiking) {
  await dynamoDb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
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
      TableName: TABLE_NAME,
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