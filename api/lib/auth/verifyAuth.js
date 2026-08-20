// api/lib/auth/verifyAuth.js
// Server-side verification for the Cognito ID token the frontend sends as
// "Authorization: Bearer <idToken>". Every mutating/admin API route must
// call requireAuth (and isAdmin/isSelfOrAdmin where relevant) before
// touching the database — the frontend AdminRoute check is UI-only and
// gives no protection on its own.
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID
    ? CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "id",
        clientId: process.env.COGNITO_CLIENT_ID,
    })
    : null;

// Verifies the bearer token and returns the decoded claims, or sends a 401
// and returns null. Callers must `return` immediately when this returns null.
export async function requireAuth(req, res) {
    if (!verifier) {
        console.error("[auth] COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID not configured on the server");
        res.status(500).json({ error: "Auth is not configured on the server" });
        return null;
    }

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Missing bearer token" });
        return null;
    }

    try {
        return await verifier.verify(token);
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
        return null;
    }
}

// A caller is treated as admin/editorial staff if they belong to a
// Cognito group named AL0/AL1/AL2, or any group matching /admin/i —
// mirrors the client-side rule in src/components/shared/AdminRoute.jsx.
export function isAdmin(claims) {
    const raw = claims?.["cognito:groups"];
    const groups = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return groups.some(g => /^AL[0-2]$/i.test(g) || /admin/i.test(g));
}

// True if the token belongs to the given sub, or the caller is an admin.
export function isSelfOrAdmin(claims, sub) {
    return claims?.sub === sub || isAdmin(claims);
}

// Shared-secret check for trusted server-to-server calls made from inside
// this Vercel deployment (e.g. api/articles/index.js notifying
// api/send-email after a status change) — these have no end-user session
// to attach a bearer token to.
export function isInternalRequest(req) {
    const key = req.headers["x-internal-api-key"];
    return !!process.env.INTERNAL_API_SECRET && key === process.env.INTERNAL_API_SECRET;
}
