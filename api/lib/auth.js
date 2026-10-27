// api/lib/auth.js
// Shared Cognito ID-token verification + best-effort rate limiting.
// needs: npm i aws-jwt-verify + env COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
//
// Your roles are Cognito GROUPS: AL0 (super admin), AL1 (editorial), AL2 (moderator).
//   ADMIN_GROUP        comma list of groups that count as admin   (default "AL0,AL1,AL2")
//   SUPER_ADMIN_GROUP  the group allowed to change roles          (default "AL0")
//   ENFORCE_AUTH=true  turns on the flag-based checks (denyUnlessAdmin / denyUnlessSignedIn)
// requireAdmin / requireSuperAdmin ALWAYS enforce, whatever ENFORCE_AUTH says.

export const ENFORCE_AUTH = process.env.ENFORCE_AUTH === "true";
const ADMIN_GROUPS = (process.env.ADMIN_GROUP || "AL0,AL1,AL2").split(",").map(s => s.trim()).filter(Boolean);
const SUPER_ADMIN_GROUP = (process.env.SUPER_ADMIN_GROUP || "AL0").trim();

let verifierPromise = null;

function getVerifier() {
    if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
        console.error("[auth] COGNITO_USER_POOL_ID and/or COGNITO_CLIENT_ID is not set on the server");
        return null;
    }
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
    if (!token) return null; // no Authorization header at all: the browser didn't send a token

    const verifier = await getVerifier();
    if (!verifier) return null;

    try {
        const payload = await verifier.verify(token);
        const groups = payload["cognito:groups"] || [];
        return {
            sub: payload.sub,
            email: payload.email || null,
            groups,
            isAdmin: groups.some(g => ADMIN_GROUPS.includes(g)),
            isSuperAdmin: groups.includes(SUPER_ADMIN_GROUP),
        };
    } catch (err) {
        // Tells you WHY a token was refused (expired, wrong client id, wrong pool...)
        console.error("[auth] token rejected:", err.name, err.message);
        return null;
    }
}

function deny(res, status, error) {
    res.status(status).json({ error });
    return true;
}

// Always enforced (use for anything that exposes user data or changes roles)
export function requireAdmin(viewer, res) {
    if (!viewer) return deny(res, 401, "Sign in required");
    if (!viewer.isAdmin) return deny(res, 403, "Admins only");
    return false;
}

export function requireSuperAdmin(viewer, res) {
    if (!viewer) return deny(res, 401, "Sign in required");
    if (!viewer.isSuperAdmin) return deny(res, 403, "Super admins only");
    return false;
}

// Flag-based (only enforced once ENFORCE_AUTH=true)
export function denyUnlessAdmin(viewer, res) {
    return ENFORCE_AUTH ? requireAdmin(viewer, res) : false;
}

export function denyUnlessSignedIn(viewer, res) {
    if (!ENFORCE_AUTH || viewer) return false;
    return deny(res, 401, "Sign in required");
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