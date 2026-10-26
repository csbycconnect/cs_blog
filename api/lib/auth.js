// api/lib/auth.js
// Shared Cognito ID-token verification + best-effort rate limiting.
// needs: npm i aws-jwt-verify + env COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
// ENFORCE_AUTH=true turns on the 401/403 checks (same flag as /api/articles).

const ENFORCE_AUTH = process.env.ENFORCE_AUTH === "true";
const ADMIN_GROUP = process.env.ADMIN_GROUP || "admin";

let verifierPromise = null;

function getVerifier() {
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) return null;
    if (!verifierPromise) {
        verifierPromise = import("aws-jwt-verify")
            .then(m => m.CognitoJwtVerifier.create({
                userPoolId: process.env.COGNITO_USER_POOL_ID,
                tokenUse: "id",
                clientId: process.env.COGNITO_CLIENT_ID,
            }))
            .catch(err => {
                console.error("aws-jwt-verify unavailable:", err.message || err);
                return null;
            });
    }
    return verifierPromise;
}

export async function getViewer(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;

    const verifier = await getVerifier();
    if (!verifier) return null;

    try {
        const payload = await verifier.verify(token);
        const groups = payload["cognito:groups"] || [];
        return { sub: payload.sub, email: payload.email || null, isAdmin: groups.includes(ADMIN_GROUP) };
    } catch {
        return null;
    }
}

// Returns true if it already sent a response (caller should `return`).
export function denyUnlessAdmin(viewer, res) {
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

const buckets = new Map();

// Per serverless instance only. Use your host's WAF for a hard limit.
export function rateLimited(req, name, max, windowMs = 60_000) {
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