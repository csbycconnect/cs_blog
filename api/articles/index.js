// api/articles/index.js
import { dynamoDb } from "../lib/aws/dynamodb.js";
import { PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import {
    getAcceptedArticles,
    getAllArticles,
    getArticleById,
    getArticlesByAuthor,
    toggleLike,
    incrementViews,
    getLikedArticleIds
} from "../lib/db/articles.js";
import { TABLES } from "../lib/constants/tables.js";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */

// Flip ENFORCE_AUTH=true in your env ONLY after the frontend sends the Cognito
// ID token (Authorization: Bearer ...). Until then admin routes stay open (as before).
const ENFORCE_AUTH = process.env.ENFORCE_AUTH === "true";
const ADMIN_GROUPS = (process.env.ADMIN_GROUP || "AL0,AL1,AL2").split(",").map(s => s.trim()).filter(Boolean);

const ALLOWED_STATUSES = ["draft", "pending", "accepted", "rejected", "declined", "archived"];
const MAX_CONTENT_CHARS = 200_000;
const MAX_TITLE_CHARS = 300;

const TABLE = () => TABLES.ARTICLES || "bb_articl   es";

/* ------------------------------------------------------------------ */
/* AUTH (Cognito ID token)                                             */
/* needs: npm i aws-jwt-verify + env VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID */
/* ------------------------------------------------------------------ */

let verifierPromise = null;

function getVerifier() {
    if (!process.env.VITE_COGNITO_USER_POOL_ID || !process.env.VITE_COGNITO_CLIENT_ID) return null;
    if (!verifierPromise) {
        verifierPromise = import("aws-jwt-verify")
            .then(m => m.CognitoJwtVerifier.create({
                userPoolId: process.env.VITE_COGNITO_USER_POOL_ID,
                tokenUse: "id",
                clientId: process.env.VITE_COGNITO_CLIENT_ID,
            }))
            .catch(err => {
                console.error("aws-jwt-verify unavailable:", err.message || err);
                return null;
            });
    }
    return verifierPromise;
}

async function getViewer(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    const verifier = await getVerifier();
    if (!verifier) return null;

    try {
        const payload = await verifier.verify(token);
        const groups = payload["cognito:groups"] || [];
        return {
            sub: payload.sub,
            email: payload.email || null,
            isAdmin: groups.some(g => ADMIN_GROUPS.includes(g)),
        };
    } catch {
        return null;
    }
}

function denyUnlessSignedIn(viewer, res) {
    if (!ENFORCE_AUTH || viewer) return false;
    res.status(401).json({ error: "Sign in required" });
    return true;
}

function denyUnlessAdmin(viewer, res) {
    if (!ENFORCE_AUTH) return false;
    if (!viewer) {
        res.status(401).json({ error: "Sign in required" });
        return true;
    }
    if (!viewer.isAdmin) {
        res.status(403).json({ error: "Admins only" });
        return true;
    }
    return false;
}

/* ------------------------------------------------------------------ */
/* RATE LIMIT (best effort, per serverless instance)                   */
/* For a hard guarantee also enable your host's WAF / rate limiting.   */
/* ------------------------------------------------------------------ */

const buckets = new Map();

function rateLimited(req, name, max, windowMs = 60_000) {
    const ip =
        String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        "unknown";
    const key = `${name}:${ip}`;
    const now = Date.now();

    if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }

    const bucket = buckets.get(key);
    if (!bucket || now > bucket.reset) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return false;
    }
    bucket.count += 1;
    return bucket.count > max;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const toPartitionKey = (id) =>
    id.startsWith("ARTICLE#") ? id : (id.startsWith("ART#") ? id.replace("ART#", "ARTICLE#") : `ARTICLE#${id}`);

function validateText(body) {
    const content = String(body.content || body.contentHTML || "");
    const contentHTML = String(body.contentHTML || body.content || "");
    if (content.length > MAX_CONTENT_CHARS || contentHTML.length > MAX_CONTENT_CHARS) {
        return "Article is too long";
    }
    if (String(body.title || "").length > MAX_TITLE_CHARS) return "Title is too long";
    return null;
}

const stripPrivate = ({ email, authorEmail, ...safe }) => safe;

function appBaseUrl(req) {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    const protocol = req.headers["x-forwarded-proto"] || "https";
    return `${protocol}://${req.headers.host}`;
}

/* ------------------------------------------------------------------ */
/* HANDLER                                                             */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
    // Same-origin calls need no CORS. Only open it to an origin you name.
    // (The old "*" + Allow-Credentials combination is rejected by browsers anyway.)
    if (process.env.ALLOWED_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Authorization, X-Requested-With, Accept, Content-Type"
        );
    }

    if (req.method === "OPTIONS") return res.status(200).end();

    const urlParts = req.url.split("?")[0].split("/");
    const routeAction = urlParts[urlParts.length - 1];
    const viewer = await getViewer(req);

    // ─── 1. HANDLE POST METHODS ───────────────────────────────────────────
    if (req.method === "POST") {
        try {
            const body = req.body || {};
            const action = body.action || routeAction;

            // View Counter Actions
            if (action === "views") {
                if (!body.id) return res.status(400).json({ error: "Missing ID" });
                if (rateLimited(req, "views", 60)) return res.status(429).json({ error: "Too many requests" });
                await incrementViews(body.id);
                return res.status(200).json({ success: true });
            }

            // Like Interaction Actions
            if (action === "like") {
                if (!body.id) return res.status(400).json({ error: "Missing ID" });
                if (denyUnlessSignedIn(viewer, res)) return;
                if (rateLimited(req, "like", 30)) return res.status(429).json({ error: "Too many requests" });
                const checkLiking = typeof body.isLiking === "boolean" ? body.isLiking : true;
                // userSub comes ONLY from the verified token, never from the request body
                const result = await toggleLike(body.id, checkLiking, viewer?.sub || null);
                return res.status(200).json({ success: true, changed: result?.changed ?? true });
            }

            // Submit Draft Dispatches (Write For Us workflow)
            if (action === "create") {
                if (denyUnlessSignedIn(viewer, res)) return;
                if (rateLimited(req, "write", 10)) return res.status(429).json({ error: "Too many requests" });
                const invalid = validateText(body);
                if (invalid) return res.status(413).json({ error: invalid });

                const authorSub = viewer?.sub || body.authorSub || body.authorId || null;
                const uniqueShortId = Math.random().toString(36).substring(2, 11).toUpperCase();
                // reuse existing id when converting a saved draft into a real submission
                const articleId = body.id || `ART_${uniqueShortId}`;
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
                    authorEmail: body.authorEmail || body.email || viewer?.email || null,
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
                    authorId: authorSub || "GUEST",
                    authorSub: authorSub,
                    readTime: body.readTime || readTimeLabel,

                    // GSI helpers
                    GSI1PK: `STATUS#pending#CLUB#${body.club || "General"}`,
                    GSI1SK: timestamp,
                    GSI3PK: "STATUS#pending",
                    GSI3SK: `DATE#${timestamp}`,
                    GSI2SK: `DATE#${timestamp}`
                };
                // a null value on a GSI key attribute makes DynamoDB reject the write
                if (authorSub) itemPayload.GSI2PK = `USER#${authorSub}`;

                const putParams = { TableName: TABLE(), Item: itemPayload };

                if (!body.id) {
                    putParams.ConditionExpression = "attribute_not_exists(PK)";
                } else {
                    // converting a saved draft: only an existing DRAFT (owned by the caller)
                    // may be overwritten. Previously any article id could be replaced.
                    putParams.ConditionExpression = viewer?.sub
                        ? "attribute_exists(PK) AND #s = :draft AND authorSub = :me"
                        : "attribute_exists(PK) AND #s = :draft";
                    putParams.ExpressionAttributeNames = { "#s": "status" };
                    putParams.ExpressionAttributeValues = viewer?.sub
                        ? { ":draft": "draft", ":me": viewer.sub }
                        : { ":draft": "draft" };
                }

                try {
                    await dynamoDb.send(new PutCommand(putParams));
                } catch (err) {
                    if (err.name === "ConditionalCheckFailedException") {
                        return res.status(409).json({ error: "This article can't be overwritten" });
                    }
                    throw err;
                }

                return res.status(201).json(stripPrivate(itemPayload));
            }

            // Save Draft (Write For Us workflow) — persists to bb_articles with status "draft"
            if (action === "draft") {
                if (denyUnlessSignedIn(viewer, res)) return;
                if (rateLimited(req, "write", 10)) return res.status(429).json({ error: "Too many requests" });
                const invalid = validateText(body);
                if (invalid) return res.status(413).json({ error: invalid });

                const authorSub = viewer?.sub || body.authorSub || body.authorId || "GUEST";
                const articleId = body.id || `ART_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
                const timestamp = new Date().toISOString();
                const rawContent = body.content || body.contentHTML || '';
                const wordCount = String(rawContent).trim().split(/\s+/).filter(Boolean).length;
                const minutes = Math.max(1, Math.round(wordCount / 238));

                const itemPayload = {
                    PK: `ARTICLE#${articleId}`,
                    SK: "METADATA",
                    id: articleId,

                    title: body.title ? String(body.title).trim() : "Untitled Draft",
                    subtitle: body.subtitle ? String(body.subtitle).trim() : (body.excerpt ? String(body.excerpt).trim() : ""),
                    content: body.content || body.contentHTML || "",
                    contentHTML: body.contentHTML || body.content || "",
                    authorName: body.authorName || body.name || "Anonymous",
                    authorEmail: body.authorEmail || body.email || viewer?.email || null,
                    club: body.club || "General",
                    category: body.category || "",
                    tags: Array.isArray(body.tags) ? body.tags : (body.tags ? [body.tags] : []),
                    authorId: authorSub,
                    authorSub: authorSub,
                    readTime: `${minutes} min read`,

                    status: "draft",
                    createdAt: body.createdAt || timestamp,
                    updatedAt: timestamp,
                    views: 0,
                    likes: 0,

                    GSI1PK: `STATUS#draft#CLUB#${body.club || "General"}`,
                    GSI1SK: timestamp,
                    GSI2PK: `USER#${authorSub}`,
                    GSI2SK: `DATE#${timestamp}`,
                    GSI3PK: "STATUS#draft",
                    GSI3SK: `DATE#${timestamp}`
                };

                // Upsert is still allowed, but ONLY over a brand-new id or the caller's own draft.
                // (It used to overwrite ANY article, e.g. flip a published post back to "draft".)
                const putParams = {
                    TableName: TABLE(),
                    Item: itemPayload,
                    ConditionExpression: viewer?.sub
                        ? "attribute_not_exists(PK) OR (#s = :draft AND authorSub = :me)"
                        : "attribute_not_exists(PK) OR #s = :draft",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: viewer?.sub
                        ? { ":draft": "draft", ":me": viewer.sub }
                        : { ":draft": "draft" },
                };

                try {
                    await dynamoDb.send(new PutCommand(putParams));
                } catch (err) {
                    if (err.name === "ConditionalCheckFailedException") {
                        return res.status(409).json({ error: "This article can't be overwritten" });
                    }
                    throw err;
                }

                return res.status(200).json(stripPrivate(itemPayload));
            }

            // ─── ACTION 1: QUICK STATUS CHANGE WITH COGNITO BROADCASTS ───
            if (action === "status") {
                if (denyUnlessAdmin(viewer, res)) return;
                if (!body.id || !body.status) return res.status(400).json({ error: "Missing required parameters id or status" });
                if (!ALLOWED_STATUSES.includes(body.status)) return res.status(400).json({ error: "Invalid status" });

                const partitionKey = toPartitionKey(body.id);

                // Fetch article to get actual title and author details
                let article = null;
                try {
                    article = await getArticleById(body.id);
                } catch (fetchErr) {
                    console.warn("[Status Action] Failed to fetch article for email context:", fetchErr.message);
                }

                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLE(),
                    Key: { PK: partitionKey, SK: "METADATA" },
                    UpdateExpression: "SET #s = :s, GSI3PK = :gpk",
                    ExpressionAttributeNames: { "#s": "status" },
                    ExpressionAttributeValues: {
                        ":s": body.status,
                        ":gpk": `STATUS#${body.status}`
                    }
                }));

                // Handle Author success/reject routing with data from DB
                const recipientEmail = body.email || body.authorEmail || article?.authorEmail || article?.email;
                const recipientName = body.authorName || body.name || article?.authorName || article?.name || "Contributor";
                const articleTitle = body.title || article?.title || "Your Submission";

                if (recipientEmail) {
                    let authorTemplate = null;
                    if (body.status === "accepted") authorTemplate = "submission_success";
                    if (body.status === "rejected" || body.status === "declined") authorTemplate = "submission_reject";

                    if (authorTemplate) {
                        try {
                            await fetch(`${appBaseUrl(req)}/api/send-email`, {
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
                if (denyUnlessAdmin(viewer, res)) return;
                if (!body.id) return res.status(400).json({ error: "Missing required parameter id" });
                const partitionKey = toPartitionKey(body.id);

                await dynamoDb.send(new DeleteCommand({
                    TableName: TABLE(),
                    Key: {
                        PK: partitionKey,
                        SK: "METADATA"
                    }
                }));

                return res.status(200).json({ success: true, deletedId: partitionKey });
            }

            // ─── ACTION 3: ADMINISTRATIVE STATUS SELECTION FOR MANAGEMENT PANEL ───
            if (action === "updateStatus") {
                if (denyUnlessAdmin(viewer, res)) return;
                const { id, status, rejectionReason } = body;
                if (!id || !status) return res.status(400).json({ error: "Missing parameter elements" });
                if (!ALLOWED_STATUSES.includes(String(status).toLowerCase())) {
                    return res.status(400).json({ error: "Invalid status" });
                }

                const partitionKey = toPartitionKey(id);

                // Fetch article to get actual title and author details from DB
                let article = null;
                try {
                    article = await getArticleById(id);
                } catch (fetchErr) {
                    console.warn("[UpdateStatus Action] Failed to fetch article for email context:", fetchErr.message);
                }

                // Ensure rejectionReason is never undefined
                const sanitizedRejectionReason = typeof rejectionReason === 'undefined' ? null : (rejectionReason === '' ? null : String(rejectionReason).trim());

                // Compute TTL only for rejected/declined states, otherwise null
                const ttl = (status === 'rejected' || status === 'declined') ? Math.floor(Date.now() / 1000) + 518400 : null;

                // Build a single UpdateExpression that aliases BOTH 'status' AND 'ttl'
                const updateExpression = 'SET #s = :s, rejectionReason = :rr, #t = :t, GSI3PK = :gpk, updatedAt = :updatedAt';

                const expressionNames = {
                    '#s': 'status',
                    '#t': 'ttl'
                };

                const expressionValues = {
                    ':s': status,
                    ':rr': sanitizedRejectionReason,
                    ':t': ttl,
                    ':gpk': `STATUS#${status}`,
                    ':updatedAt': new Date().toISOString()
                };

                try {
                    await dynamoDb.send(new UpdateCommand({
                        TableName: TABLE(),
                        Key: { PK: partitionKey, SK: 'METADATA' },
                        UpdateExpression: updateExpression,
                        ExpressionAttributeNames: expressionNames,
                        ExpressionAttributeValues: expressionValues
                    }));
                } catch (dbErr) {
                    console.error('[UpdateStatus] DynamoDB UpdateCommand failed:', dbErr.message || dbErr);
                    return res.status(500).json({ error: 'Failed to update article status' });
                }

                // Dispatch submission status update via your template updates
                const articleTitle = body.title || article?.title || "Your Submission";
                const recipientEmail = article?.authorEmail || article?.email || 'noreply.phdcs.managment@gmail.com';
                const recipientName = article?.authorName || article?.name || 'Contributor';

                const statusLower = String(status).toLowerCase();
                let targetTemplate = null;

                if (statusLower === "accepted") {
                    targetTemplate = "submission_success";
                } else if (statusLower === "rejected" || statusLower === "declined") {
                    targetTemplate = "submission_reject";
                }

                if (!recipientEmail || recipientEmail === 'undefined') {
                    console.error("[ERROR] Email dispatch aborted: recipientEmail is invalid.");
                } else if (targetTemplate) {
                    const templateData = {
                        postTitle: articleTitle,
                        authorName: recipientName,
                        rejectionReason: sanitizedRejectionReason || null
                    };

                    try {
                        const emailRes = await fetch(`${appBaseUrl(req)}/api/send-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                templateType: targetTemplate,
                                toEmail: recipientEmail,
                                templateData: templateData
                            })
                        });

                        if (!emailRes.ok) {
                            console.error(`[UpdateStatus Action] Email microservice returned status ${emailRes.status}: ${await emailRes.text()}`);
                        }
                    } catch (emailErr) {
                        console.error("[UpdateStatus Action] Failed to pass communication sequence over to the send-email route wrapper:", emailErr.message || emailErr);
                    }
                }

                return res.status(200).json({ success: true, id: partitionKey, status });
            }

            return res.status(404).json({ error: "Action route target not supported" });
        } catch (error) {
            console.error("POST HANDLER ERROR:", error);
            return res.status(500).json({ error: "Internal Server error" });
        }
    }

    // ─── 2. HANDLE GET METHODS ────────────────────────────────────────────
    if (req.method === "GET") {
        try {
            const { status, id, author, limit, cursor, myLikes } = req.query;

            // Which of these articles did the signed-in user like? (never cached, never public)
            if (myLikes) {
                if (!viewer) return res.status(401).json({ error: "Sign in required" });
                const ids = String(myLikes).split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
                const liked = await getLikedArticleIds(viewer.sub, ids);
                res.setHeader("Cache-Control", "private, no-store");
                return res.status(200).json([...liked]);
            }

            // Single article
            if (id || routeAction === "details") {
                const targetId = id || req.query.id;
                if (!targetId) return res.status(400).json({ error: "Missing ID parameter" });
                const article = await getArticleById(targetId);
                if (!article) return res.status(404).json({ error: "Article not found" });

                if (article.status === "accepted") {
                    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
                    return res.status(200).json(stripPrivate(article));
                }

                // pending / draft / rejected: only the author or an admin may read them
                const isOwner = viewer && (article.authorSub === viewer.sub || article.authorId === viewer.sub);
                if (ENFORCE_AUTH && !(viewer?.isAdmin || isOwner)) {
                    return res.status(404).json({ error: "Article not found" });
                }
                res.setHeader("Cache-Control", "private, no-store");
                return res.status(200).json(article);
            }

            // Articles by author ("Your Blogs")
            if (author) {
                if (ENFORCE_AUTH && !(viewer?.isAdmin || viewer?.sub === author)) {
                    return res.status(viewer ? 403 : 401).json({ error: "Not allowed" });
                }
                const articles = await getArticlesByAuthor(author);
                res.setHeader("Cache-Control", "private, no-store");
                if (status) {
                    return res.status(200).json(articles.filter(a => a.status === status));
                }
                return res.status(200).json(articles);
            }

            // Admin views: pending / rejected / draft / all_admin  (full Scan: keep admin-only)
            if (status && status !== "accepted") {
                if (denyUnlessAdmin(viewer, res)) return;
                const allArticles = await getAllArticles();
                res.setHeader("Cache-Control", "private, no-store");
                if (status === "all_admin") {
                    // previously this branch filtered on status === "all_admin" and returned []
                    return res.status(200).json(allArticles);
                }
                const filtered = allArticles.filter(item => item.status === status || item.GSI3PK === `STATUS#${status}`);
                return res.status(200).json(filtered);
            }

            // ── PUBLIC BLOG LIST (no status, or status=accepted) ──
            // Cheap Query on the status index with a trimmed projection, CDN-cached.
            const lim = Number.parseInt(limit, 10);
            const result = await getAcceptedArticles(
                Number.isInteger(lim) && lim > 0 ? { limit: lim, cursor } : {}
            );

            res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
            return res.status(200).json(result);
        } catch (error) {
            console.error("GET CONTROLLER EXCEPTION:", error);
            return res.status(500).json({ error: "Failed to process target directory records" });
        }
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}