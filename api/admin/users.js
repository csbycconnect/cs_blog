// api/admin/users.js
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    try {
        const cognitoClient = new CognitoIdentityProviderClient({ 
            region: process.env.AWS_REGION || "us-east-1" 
        });

        const command = new ListUsersCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID
        });

        const cognitoData = await cognitoClient.send(command);
        
        const formattedUsers = (cognitoData.Users || []).map(user => {
            const attributes = {};
            user.Attributes?.forEach(attr => {
                attributes[attr.Name] = attr.Value;
            });

            return {
                username: user.Username,
                id: attributes['sub'] || user.Username,
                email: attributes['email'] || 'N/A',
                name: attributes['name'] || 'Anonymous User',
                role: attributes['custom:role'] || attributes['role'] || 'User',
                status: user.UserStatus,
                createdAt: user.UserCreateDate
            };
        });

        // Cache the response on Vercel's Edge CDN network for extra safety
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        return res.status(200).json(formattedUsers);

    } catch (error) {
        console.error("[Admin API Error]:", error);
        return res.status(500).json({ error: "Failed to map user directory index." });
    }
}