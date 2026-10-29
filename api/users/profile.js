// api/users/profile.js
import { dynamoDb } from "../lib/aws/dynamodb.js";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getViewer, denyUnlessSignedIn, ENFORCE_AUTH, rateLimited } from "../lib/auth.js";

const MAX_BIO_CHARS = 1000;
const SUB_PATTERN = /^[\w.:@-]{1,128}$/;

export default async function handler(req, res) {
    const tableName = process.env.DYNAMODB_USERS_TABLE_NAME || "bb_users";

    // GET: public bio lookup
    if (req.method === "GET") {
        const sub = String(req.query?.sub || "");
        if (!SUB_PATTERN.test(sub)) return res.status(400).json({ error: "Missing or invalid user sub ID" });

        try {
            const result = await dynamoDb.send(new GetCommand({
                TableName: tableName,
                Key: { PK: `USER#${sub}`, SK: "PROFILE" },
            }));
            if (!result.Item) return res.status(200).json({ sub, bio: "" });
            // Only the public fields
            return res.status(200).json({ sub, bio: result.Item.bio || "", updatedAt: result.Item.updatedAt });
        } catch (error) {
            console.error("FETCH PROFILE ERROR:", error.name, error.message);
            return res.status(500).json({ error: "Failed to fetch user profile" });
        }
    }

    // POST: update your OWN bio
    if (req.method === "POST") {
        const viewer = await getViewer(req);
        if (denyUnlessSignedIn(viewer, res)) return;
        if (rateLimited(req, "profile-write", 20)) return res.status(429).json({ error: "Too many requests" });

        const { sub, bio } = req.body || {};
        if (!SUB_PATTERN.test(String(sub || ""))) return res.status(400).json({ error: "Missing or invalid user sub ID" });
        if (typeof bio !== "undefined" && typeof bio !== "string") return res.status(400).json({ error: "Bio must be text" });
        if ((bio || "").length > MAX_BIO_CHARS) return res.status(413).json({ error: "Bio is too long" });

        // A signed-in user can only edit their own profile (the sub comes from the verified token)
        if (viewer && viewer.sub !== sub) return res.status(403).json({ error: "You can only edit your own profile" });

        try {
            await dynamoDb.send(new UpdateCommand({
                TableName: tableName,
                Key: { PK: `USER#${sub}`, SK: "PROFILE" },
                UpdateExpression: "SET #sub = :sub, bio = :bio, updatedAt = :u",
                ExpressionAttributeNames: { "#sub": "sub" },
                ExpressionAttributeValues: { ":sub": sub, ":bio": bio || "", ":u": new Date().toISOString() },
            }));
            return res.status(200).json({ success: true, bio: bio || "" });
        } catch (error) {
            console.error("UPSERT BIO ERROR:", error.name, error.message);
            return res.status(500).json({ error: "Failed to update profile bio" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}