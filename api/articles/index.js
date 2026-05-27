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

                // Compute read time (minutes) based on 238 words/min and save as "X min read"
                const rawContent = body.content || body.contentHTML || '';
                const wordCount = String(rawContent).trim().split(/\s+/).filter(Boolean).length;
                const minutes = Math.max(1, Math.round(wordCount / 238));
                const readTimeLabel = `${minutes} min read`;

                const itemPayload = {
                    PK: `ARTICLE#${articleId}`,
                    SK: "METADATA",
                    id: articleId,

                    // Required schema fields (exact names)
                    title: body.title ? String(body.title).trim() : "Untitled Dispatch",
                    subtitle: body.subtitle ? String(body.subtitle).trim() : (body.excerpt ? String(body.excerpt).trim() : ""),
                    content: body.content || body.contentHTML || "",
                    authorName: body.authorName || body.name || "Anonymous",
                    authorEmail: body.authorEmail || body.email || null,
                    status: "pending",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    views: 0,
                    likes: 0,

                    // Additional fields useful for the app (kept alongside required schema)
                    contentHTML: body.contentHTML || body.content || "",
                    club: body.club || "General",
                    category: body.category || "Article",
                    tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : []),
                    authorId: body.authorId || body.authorSub || "GUEST",
                    authorSub: body.authorSub || body.authorId || null,
                    readTime: body.readTime || readTimeLabel,

                    // GSI helpers
                    GSI1PK: `STATUS#pending#CLUB#${body.club || "General"}`,
                    GSI1SK: timestamp,
                    GSI2PK: body.authorSub ? `USER#${body.authorSub}` : null,
                    GSI2SK: `DATE#${timestamp}`
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

                const partitionKey = body.id.startsWith("ARTICLE#") ? body.id : (body.id.startsWith("ART#") ? body.id.replace("ART#", "ARTICLE#") : `ARTICLE#${body.id}`);

                // Fetch article to get actual title and author details
                let article = null;
                try {
                    article = await getArticleById(body.id);
                    console.log("[Status Action] Fetched article:", { id: body.id, title: article?.title, authorName: article?.authorName });
                } catch (fetchErr) {
                    console.warn("[Status Action] Failed to fetch article for email context:", fetchErr.message);
                }

                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLES.ARTICLES || "bb_articles",
                    Key: { PK: partitionKey, SK: "METADATA" },
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":s": body.status,
                        ":gpk": `STATUS#${body.status}`
                    }
                }));

                // Handle Author success/reject routing with data from DB
                const recipientEmail = body.email || body.authorEmail || article?.authorEmail;
                const recipientName = body.authorName || body.name || article?.authorName || "Contributor";
                const articleTitle = body.title || article?.title || "Your Submission";
                console.log("[Status Action] Email payload:", { recipientEmail, recipientName, articleTitle });

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
                                        postTitle: articleTitle,
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
                const { id, status, rejectionReason } = body;
                if (!id || !status) return res.status(400).json({ error: "Missing parameter elements" });

                const partitionKey = id.startsWith("ARTICLE#") ? id : (id.startsWith("ART#") ? id.replace("ART#", "ARTICLE#") : `ARTICLE#${id}`);

                // Fetch article to get actual title and author details from DB
                let article = null;
                try {
                    article = await getArticleById(id);
                    console.log("[UpdateStatus Action] Fetched article:", { id, title: article?.title, authorName: article?.authorName });
                } catch (fetchErr) {
                    console.warn("[UpdateStatus Action] Failed to fetch article for email context:", fetchErr.message);
                }

                // Ensure rejectionReason is never undefined
                const sanitizedRejectionReason = typeof rejectionReason === 'undefined' ? null : (rejectionReason === '' ? null : String(rejectionReason).trim());

                // Compute TTL only for rejected/declined states, otherwise null
                const ttl = (status === 'rejected' || status === 'declined') ? Math.floor(Date.now() / 1000) + 518400 : null;

                // Log core debug payload for troubleshooting malformed IDs / payloads
                console.log('[UpdateStatus Action] Preparing update', { partitionKey, id, status, rejectionReason: sanitizedRejectionReason, ttl });

                // Build UpdateExpression and values dynamically to avoid sending undefined values
                // Alias both reserved attributes (status and ttl) to avoid reserved word conflicts
                const expressionNames = { '#s': 'status', '#t': 'ttl' };
                const expressionValues = {
                    ':s': status,
                    ':gpk': `STATUS#${status}`,
                    ':updatedAt': new Date().toISOString()
                };

                const setParts = ['#s = :s', 'GSI3PK = :gpk', 'updatedAt = :updatedAt'];

                if (sanitizedRejectionReason !== null) {
                    setParts.push('rejectionReason = :rr');
                    expressionValues[':rr'] = sanitizedRejectionReason;
                }

                if (ttl !== null) {
                    // Use alias #t for ttl and :t for the value
                    setParts.push('#t = :t');
                    expressionValues[':t'] = ttl;
                }

                const updateExpression = `SET ${setParts.join(', ')}`;

                // 1. Save state update directly to DynamoDB (wrap in try/catch for clearer logging)
                try {
                    await dynamoDb.send(new UpdateCommand({
                        TableName: TABLES.ARTICLES || 'bb_articles',
                        Key: { PK: partitionKey, SK: 'METADATA' },
                        UpdateExpression: updateExpression,
                        ExpressionAttributeNames: expressionNames,
                        ExpressionAttributeValues: expressionValues
                    }));
                } catch (dbErr) {
                    console.error('[UpdateStatus] DynamoDB UpdateCommand failed:', dbErr.message || dbErr);
                    return res.status(500).json({ error: 'Failed to update article status', detail: dbErr.message || String(dbErr) });
                }

                // 2. Dispatch submission status update via your template updates
                const recipientEmail = body.email || body.authorEmail || article?.authorEmail;
                const recipientName = body.authorName || body.name || article?.authorName || "Contributor";
                const articleTitle = body.title || article?.title || "Your Submission";
                console.log("[UpdateStatus Action] Email payload:", { recipientEmail, recipientName, articleTitle });

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
                                        postTitle: articleTitle,
                                        authorName: recipientName,
                                        rejectionReason: rejectionReason || null
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