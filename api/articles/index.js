// api/articles/index.js
import { dynamoDb } from "../lib/aws/dynamodb.js";
import { PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
    getAcceptedArticles,
    getAllArticles,
    getArticleById,
    getArticlesByAuthor,
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
                const uniqueShortId = Math.random().toString(36).substring(2, 11).toUpperCase();
                const articleId = `ART_${uniqueShortId}`;
                const timestamp = new Date().toISOString();

                const itemPayload = {
                    PK: `ARTICLE#${articleId}`,
                    SK: "METADATA",
                    id: articleId,
                    title: body.title ? body.title.trim() : "Untitled Dispatch",
                    subtitle: body.subtitle ? body.subtitle.trim() : "",
                    content: body.content || "",
                    club: body.club || "General",
                    category: body.category || "Article",
                    tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : []),
                    authorName: body.authorName || "Anonymous",
                    authorId: body.authorId || body.authorSub || "GUEST",
                    authorSub: body.authorSub || "GUEST",
                    authorEmail: body.authorEmail || null,
                    readTime: body.readTime || 5,
                    status: "pending",

                    GSI1PK: `STATUS#pending#CLUB#${body.club || "General"}`,
                    GSI1SK: timestamp,
                    GSI2PK: body.authorSub ? `USER#${body.authorSub}` : null,
                    GSI2SK: `DATE#${timestamp}`,

                    views: 0,
                    likes: 0,
                    createdAt: timestamp,
                    updatedAt: timestamp
                };

                await dynamoDb.send(new PutCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Item: itemPayload,
                    ConditionExpression: "attribute_not_exists(PK)"
                }));

                return res.status(201).json(itemPayload);
            }

            // ─── ACTION 1: QUICK STATUS CHANGE WITH COGNITO BROADCASTS ───
            if (action === "status") {
                if (!body.id || !body.status) return res.status(400).json({ error: "Missing required parameters id or status" });

                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: { PK: body.id, SK: "METADATA" }, // Cleaned partition schema alignment
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":s": body.status,
                        ":gpk": `STATUS#${body.status}`
                    }
                }));

                // Handle Author success/reject routing automatically alongside public list blasts
                const recipientEmail = body.authorEmail || body.email;
                const recipientName = body.authorName || body.name || "Contributor";

                if (recipientEmail) {
                    let authorTemplate = null;
                    if (body.status === "accepted") authorTemplate = "submission_success";
                    if (body.status === "rejected" || body.status === "declined") authorTemplate = "submission_reject";

                    if (authorTemplate) {
                        try {
                            await fetch(`${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/send-email`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    templateType: authorTemplate,
                                    toEmail: recipientEmail,
                                    templateData: {
                                        postTitle: body.title || "Your Submission",
                                        authorName: recipientName
                                    }
                                })
                            });
                        } catch (emailErr) {
                            console.error("Failed to process status email notification loop:", emailErr);
                        }
                    }
                }

                return res.status(200).json({ success: true });
            }

            // ─── ACTION 2: ARTICLE REMOVAL ENGINE ───
            if (action === "delete") {
                if (!body.id) return res.status(400).json({ error: "Missing required parameter id" });
                const partitionKey = body.id.startsWith("ARTICLE#") ? body.id : (body.id.startsWith("ART#") ? body.id.replace("ART#", "ARTICLE#") : `ARTICLE#${body.id}`);

                await dynamoDb.send(new DeleteCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: {
                        PK: partitionKey,
                        SK: "METADATA"
                    }
                }));

                return res.status(200).json({ success: true, deletedId: partitionKey });
            }

            // ─── ACTION 3: ADMINISTRATIVE STATUS SELECTION FOR MANAGEMENT PANEL ───
            if (action === "updateStatus") {
                const { id, status } = body;
                if (!id || !status) return res.status(400).json({ error: "Missing parameter elements" });

                const partitionKey = id.startsWith("ARTICLE#") ? id : (id.startsWith("ART#") ? id.replace("ART#", "ARTICLE#") : `ARTICLE#${id}`);

                // 1. Save state update directly to DynamoDB
                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: { PK: partitionKey, SK: "METADATA" },
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {    
                        ":s": status,
                        ":gpk": `STATUS#${status}`
                    }
                }));

                // 2. Dispatch submission status update via your template updates
                const recipientEmail = body.authorEmail || body.email;
                const recipientName = body.authorName || body.name || "Contributor";

                if (recipientEmail) {
                    let targetTemplate = null;
                    if (status === "accepted") {
                        targetTemplate = "submission_success";
                    } else if (status === "rejected" || status === "declined") {
                        targetTemplate = "submission_reject";
                    }

                    if (targetTemplate) {
                        try {
                            await fetch(`${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/send-email`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    templateType: targetTemplate,
                                    toEmail: recipientEmail,
                                    templateData: {
                                        postTitle: body.title || "Your Submission",
                                        authorName: recipientName
                                    }
                                })
                            });
                            console.log(`Successfully passed operational task [${targetTemplate}] to mail microservice.`);
                        } catch (emailErr) {
                            console.error("Failed to pass communication sequence over to the send-email route wrapper:", emailErr);
                        }
                    }
                } else {
                    console.warn("Skipping email task forwarding: Missing email mapping references inside payload.");
                }

                return res.status(200).json({ success: true, id: partitionKey, status });
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
            const { status, id, author } = req.query;

            if (id || routeAction === "details") {
                const targetId = id || req.query.id;
                if (!targetId) return res.status(400).json({ error: "Missing ID parameter" });
                const article = await getArticleById(targetId);
                if (!article) return res.status(404).json({ error: "Article not found" });
                return res.status(200).json(article);
            }

            if (author) {
                const articles = await getArticlesByAuthor(author);
                return res.status(200).json(articles);
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