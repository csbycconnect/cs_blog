// src/lib/authFetch.js
// Sends the signed-in user's Cognito ID token with API calls.
// Uses the Cognito SDK session, so an expired token is refreshed automatically.
import { userPool } from './cognito-config';

export function getIdToken() {
    return new Promise((resolve) => {
        try {
            const cognitoUser = userPool.getCurrentUser();
            if (!cognitoUser) return resolve(null);
            cognitoUser.getSession((err, session) => {
                if (err || !session || !session.isValid()) return resolve(null);
                resolve(session.getIdToken().getJwtToken());
            });
        } catch {
            resolve(null);
        }
    });
}

export async function authFetch(url, options = {}) {
    const token = await getIdToken();
    if (!token) return fetch(url, options);
    return fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
}
