import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDb = DynamoDBDocumentClient.from(client);

export default async function handler(req, res) {
  try {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME,
      })
    );

    res.status(200).json(result.Items || []);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
}