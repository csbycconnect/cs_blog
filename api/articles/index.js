// api/articles/index.js
import { dynamoDb } from "../lib/aws/dynamodb.js";
import { PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
    getAcceptedArticles,
    getAllArticles,
    getArticleById,
    toggleLike,
    incrementViews
} from "../lib/db/articles.js";
import { TABLES } from "../lib/constants/tables.js";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") return res.status(200).end();

    const urlParts = req.url.split("?")[0].split("/");
    const routeAction = urlParts[urlParts.length - 1];

    // ─── 1. HANDLE POST METHODS ───────────────────────────────────────────
    if (req.method === "POST") {
        try {
            const body = req.body || {};
            const action = body.action || routeAction;

            // View Counter Actions
            if (action === "views") {
                if (!body.id) return res.status(400).json({ error: "Missing ID" });
                await incrementViews(body.id);
                return res.status(200).json({ success: true });
            }

            // Like Interaction Actions
            if (action === "like") {
                if (!body.id) return res.status(400).json({ error: "Missing ID" });
                const checkLiking = typeof body.isLiking === "boolean" ? body.isLiking : true;
                await toggleLike(body.id, checkLiking);
                return res.status(200).json({ success: true });
            }

            // Submit Draft Dispatches (Write For Us workflow)
            if (action === "create") {
                const articleId = `ART#${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
                const timestamp = new Date().toISOString();

                const itemPayload = {
                    PK: articleId,
                    SK: "ARTICLE",
                    id: articleId,
                    title: body.title,
                    subtitle: body.subtitle || "",
                    content: body.content,
                    club: body.club,
                    authorName: body.authorName || "Anonymous",
                    authorSub: body.authorSub,
                    status: "pending",
                    GSI3PK: "STATUS#pending",
                    GSI3SK: timestamp,
                    views: 0,
                    likes: 0,
                    createdAt: timestamp
                };

                await dynamoDb.send(new PutCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Item: itemPayload
                }));

                return res.status(201).json(itemPayload);
            }

            if (action === "status") {
                if (!body.id || !body.status) return res.status(400).json({ error: "Missing required parameters id or status" });

                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: { PK: body.id, SK: "ARTICLE" },
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":s": body.status,
                        ":gpk": `STATUS#${body.status}`
                    }
                }));

                if (body.status === "accepted") {
                    try {
                        const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION});
                        const listUsersCmd = new ListUsersCommand({
                            UserPoolId: process.env.COGNITO_USER_POOL_ID
                        });
                        const cognitoData = await cognitoClient.send(listUsersCmd);
                        const subscriberEmails = [];

                        if (cognitoData.Users) {
                            for (const user of cognitoData.Users) {
                                const attributes = {};
                                user.Attributes?.forEach(attr => {
                                    attributes[attr.Name] = attr.Value;
                                });

                                if (attributes['custom:dispatchAlerts'] !== 'false' && attributes['email']) {
                                    subscriberEmails.push(attributes['email']);
                                }
                            }
                        }

                        if (subscriberEmails.length > 0) {
                            await fetch(`${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/send-email`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    templateType: 'dispatch_alert',
                                    toEmail: subscriberEmails,
                                    templateData: {
                                        postTitle: body.title || "New Technical Manual",
                                        authorName: body.authorName || "Community Contributor",
                                        blogUrl: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/blog/${body.id}`
                                    }
                                })
                            });
                        }
                    } catch (broadcastError) {
                        console.error("Mailing loop error bypassed to prevent blocking DB status update:", broadcastError);
                    }
                }

                return res.status(200).json({ success: true });
            }

            if (action === "delete") {
                if (!body.id) return res.status(400).json({ error: "Missing required parameter id" });

                // If the ID coming from the frontend does not already have the explicit "ART#" database partition format prefix, wrap it.
                const partitionKey = body.id.startsWith("ART#") ? body.id : `ART#${body.id}`;

                await dynamoDb.send(new DeleteCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: {
                        PK: partitionKey,
                        SK: "ARTICLE"
                    }
                }));

                return res.status(200).json({ success: true, deletedId: partitionKey });
            }

            // Administrative Moderation Actions (Approve/Reject/Archive)
            if (action === "updateStatus") {
                const { id, status } = body;
                if (!id || !status) return res.status(400).json({ error: "Missing parameter elements" });

                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: { PK: id, SK: "ARTICLE" },
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":s": status,
                        ":gpk": `STATUS#${status}`
                    }
                }));

                return res.status(200).json({ success: true, id, status });
            }

            return res.status(404).json({ error: "Action route target not supported" });
        } catch (error) {
            console.error("POST HANDLER ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal Server error" });
        }
    }

    // ─── 2. HANDLE GET METHODS ────────────────────────────────────────────
    if (req.method === "GET") {
        try {
            const { status, id } = req.query;

            if (id || routeAction === "details") {
                const targetId = id || req.query.id;
                if (!targetId) return res.status(400).json({ error: "Missing ID parameter" });
                const article = await getArticleById(targetId);
                if (!article) return res.status(404).json({ error: "Article not found" });
                return res.status(200).json(article);
            }

            if (status) {
                const allArticles = await getAllArticles();
                const filtered = allArticles.filter(item => item.status === status || item.GSI3PK === `STATUS#${status}`);
                return res.status(200).json(filtered);
            }

            const articles = await getAcceptedArticles();
            return res.status(200).json(articles);
        } catch (error) {
            console.error("GET CONTROLLER EXCEPTION:", error);
            return res.status(500).json({ error: "Failed to process target directory records" });
        }
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}