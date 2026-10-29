// api/admin/users.js
// Admin-only user directory. Returns each user's `groups` so the Users tab can show roles.
import { ListUsersCommand, ListUsersInGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito, USER_POOL_ID, ROLE_GROUPS } from "../lib/aws/cognito.js";
import { getViewer, requireAdmin, rateLimited } from "../lib/auth.js";

const MAX_PAGES = 20;

async function listAllUsers() {
    const users = [];
    let PaginationToken;
    for (let page = 0; page < MAX_PAGES; page++) {
        const r = await cognito.send(new ListUsersCommand({ UserPoolId: VITE_COGNITO_USER_POOL_ID, Limit: 60, PaginationToken }));
        users.push(...(r.Users || []));
        PaginationToken = r.PaginationToken;
        if (!PaginationToken) break;
    }
    return users;
}

// username -> ["AL1", ...]
async function groupMap() {
    const map = new Map();
    for (const group of ROLE_GROUPS) {
        let NextToken;
        try {
            for (let page = 0; page < MAX_PAGES; page++) {
                const r = await cognito.send(new ListUsersInGroupCommand({
                    UserPoolId: USER_POOL_ID, GroupName: group, Limit: 60, NextToken,
                }));
                for (const u of r.Users || []) {
                    map.set(u.Username, [...(map.get(u.Username) || []), group]);
                }
                NextToken = r.NextToken;
                if (!NextToken) break;
            }
        } catch (err) {
            // e.g. the group doesn't exist in the pool yet
            console.error(`[admin/users] could not list group ${group}:`, err.name, err.message);
        }
    }
    return map;
}

export default async function handler(req, res) {
    if (process.env.ALLOWED_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    try {
        const viewer = await getViewer(req);
        if (requireAdmin(viewer, res)) return;
        if (rateLimited(req, "admin-users", 30)) return res.status(429).json({ error: "Too many requests" });
        if (!USER_POOL_ID) return res.status(500).json({ error: "Server is missing VITE_COGNITO_USER_POOL_ID." });

        const [cognitoUsers, groups] = await Promise.all([listAllUsers(), groupMap()]);

        const formatted = cognitoUsers.map(user => {
            const a = {};
            user.Attributes?.forEach(attr => { a[attr.Name] = attr.Value; });
            const g = groups.get(user.Username) || [];
            return {
                username: user.Username,
                id: a.sub || user.Username,
                email: a.email || "N/A",
                name: a.name || "Anonymous User",
                groups: g,
                role: g[0] || "User",
                status: user.UserStatus,
                createdAt: user.UserCreateDate,
            };
        });

        // Contains every user's email: must never be cached by a CDN
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).json(formatted);
    } catch (error) {
        console.error("[admin/users]", error.name, error.message);
        return res.status(500).json({ error: "Failed to load users." });
    }
}