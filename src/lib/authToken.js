// src/lib/authToken.js
import { userPool } from './cognito-config';

// Resolves the current signed-in user's raw Cognito ID token (JWT string),
// refreshing it via the SDK's session cache if needed, or null if nobody is
// signed in. Used to attach "Authorization: Bearer <token>" to requests
// against API routes that now verify the caller server-side.
export function getIdToken() {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) return resolve(null);
        cognitoUser.getSession((err, session) => {
            if (err || !session || !session.isValid()) return resolve(null);
            resolve(session.getIdToken().getJwtToken());
        });
    });
}

export async function authHeaders(extra = {}) {
    const token = await getIdToken();
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}
