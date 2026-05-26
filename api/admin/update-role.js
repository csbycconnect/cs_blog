// api/admin/update-role.js
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { username, targetRole } = req.body;

        if (!username || !targetRole) {
            return res.status(400).json({ error: "Missing parameters: username or targetRole required." });
        }

        // Validate safe roles
        const validRoles = ['User', 'AL1', 'AL0'];
        if (!validRoles.includes(targetRole)) {
            return res.status(400).json({ error: "Invalid systemic security clearances provided." });
        }

        const cognitoClient = new CognitoIdentityProviderClient({ 
            region: process.env.AWS_REGION || "us-east-1" 
        });

        // Commit the custom:role update straight to Cognito
        const command = new AdminUpdateUserAttributesCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            UserAttributes: [
                { Name: "custom:role", Value: targetRole }
            ]
        });

        await cognitoClient.send(command);
        return res.status(200).json({ success: true, message: `User clearance level mapped to ${targetRole}` });

    } catch (error) {
        console.error("[Role Clearance Modification Failure]:", error);
        return res.status(500).json({ error: "Failed to override administrative role attributes." });
    }
}