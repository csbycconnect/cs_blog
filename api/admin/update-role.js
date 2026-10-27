// api/admin/update-role.js
// Roles are Cognito GROUPS (AL0 / AL1 / AL2). "User" = member of none of them.
// Only a signed-in super admin (AL0) may call this.
import {
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminListGroupsForUserCommand,
    ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito, USER_POOL_ID, ROLE_GROUPS } from "../lib/aws/cognito.js";
import { getViewer, requireSuperAdmin, rateLimited } from "../lib/auth.js";

const VALID_ROLES = ["User", ...ROLE_GROUPS];
const UUID = /^[0-9a-fA-F-]{36}$/;

// The UI sends the user's sub. Admin APIs need the real Cognito Username,
// which is NOT always the sub, so look it up.
async function resolveUser(id) {
    if (!UUID.test(id)) return { username: id, sub: null };
    const r = await cognito.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `sub = "${id}"`,
        Limit: 1,
    }));
    const u = r.Users?.[0];
    return u ? { username: u.Username, sub: id } : null;
}

export default async function handler(req, res) {
    // Same-origin calls need no CORS. Only open it to an origin you name.
    if (process.env.ALLOWED_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const viewer = await getViewer(req);
        if (requireSuperAdmin(viewer, res)) return;
        if (rateLimited(req, "update-role", 20)) return res.status(429).json({ error: "Too many requests" });

        const body = req.body || {};
        const id = String(body.userId || body.username || "").trim();
        const targetRole = body.targetRole;

        if (!id || !targetRole) return res.status(400).json({ error: "userId and targetRole are required." });
        if (!VALID_ROLES.includes(targetRole)) return res.status(400).json({ error: "Invalid role." });
        if (!USER_POOL_ID) return res.status(500).json({ error: "Server is missing COGNITO_USER_POOL_ID." });

        const user = await resolveUser(id);
        if (!user) return res.status(404).json({ error: "User not found." });

        // Stops an admin locking themselves (and possibly everyone) out
        if (id === viewer.sub || user.sub === viewer.sub) {
            return res.status(400).json({ error: "You can't change your own role." });
        }

        const current = await cognito.send(new AdminListGroupsForUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: user.username,
        }));
        const has = (current.Groups || []).map(g => g.GroupName).filter(g => ROLE_GROUPS.includes(g));

        // Remove every role group except the target, then add the target
        for (const group of has) {
            if (group === targetRole) continue;
            await cognito.send(new AdminRemoveUserFromGroupCommand({
                UserPoolId: USER_POOL_ID, Username: user.username, GroupName: group,
            }));
        }
        if (targetRole !== "User" && !has.includes(targetRole)) {
            await cognito.send(new AdminAddUserToGroupCommand({
                UserPoolId: USER_POOL_ID, Username: user.username, GroupName: targetRole,
            }));
        }

        return res.status(200).json({
            success: true,
            role: targetRole,
            groups: targetRole === "User" ? [] : [targetRole],
        });
    } catch (error) {
        // Name + message show up in your Vercel function logs (e.g. AccessDeniedException)
        console.error("[update-role]", error.name, error.message);
        return res.status(500).json({ error: "Failed to update role." });
    }
}