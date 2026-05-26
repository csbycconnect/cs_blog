// api/users/profile.js
import { dynamoDb } from "../lib/aws/dynamodb.js"; // ✅ Corrected path to climb out of api/users/
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export default async function handler(req, res) {
    const tableName = process.env.DYNAMODB_USERS_TABLE_NAME || "bb_users";

    // ─── HANDLE FETCH PROFILE (GET) ──────────────────────────────────────────
    if (req.method === "GET") {
        const { sub } = req.query;
        if (!sub) {
            return res.status(400).json({ error: "Missing user sub ID" });
        }

        try {
            const result = await dynamoDb.send(new GetCommand({
                TableName: tableName,
                Key: {
                    PK: `USER#${sub}`,
                    SK: "PROFILE"
                }
            }));

            if (!result.Item) {
                // If no profile exists yet in DB, return an empty bio cleanly
                return res.status(200).json({ sub, bio: "" });
            }

            return res.status(200).json(result.Item);
        } catch (error) {
            console.error("FETCH PROFILE BACKEND ERROR:", error);
            return res.status(500).json({ error: "Failed to fetch user profile" });
        }
    }

    // ─── HANDLE UPDATE/UPSERT BIO (POST) ─────────────────────────────────────
    if (req.method === "POST") {
        const { sub, bio } = req.body;
        if (!sub) {
            return res.status(400).json({ error: "Missing user sub ID" });
        }

        try {
            await dynamoDb.send(new PutCommand({
                TableName: tableName,
                Item: {
                    PK: `USER#${sub}`,
                    SK: "PROFILE",
                    sub: sub,
                    bio: bio || "",
                    updatedAt: new Date().toISOString()
                }
            }));

            return res.status(200).json({ success: true, bio });
        } catch (error) {
            console.error("UPSERT BIO BACKEND ERROR:", error);
            return res.status(500).json({ error: "Failed to update profile bio" });
        }
    }

    // If any other method comes in
    return res.status(405).json({ error: "Method not allowed" });
}