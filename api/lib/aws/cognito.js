// api/lib/aws/cognito.js
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.VITE_COGNITO_USER_POOL_ID || "";

// The pool's region is the part of its ID before the "_" (e.g. "eu-north-1_AbC123"),
// so we never guess it wrong.
const region = USER_POOL_ID.includes("_") ? USER_POOL_ID.split("_")[0] : process.env.AWS_REGION;

export const cognito = new CognitoIdentityProviderClient({
    region,
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && {
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    }),
});

// The role groups the app manages. Everyone in none of them is a plain "User".
export const ROLE_GROUPS = ["AL0", "AL1", "AL2"];