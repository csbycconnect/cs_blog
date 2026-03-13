import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    // if you're using a Cognito app client with a secret, provide it here
    ...(import.meta.env.VITE_COGNITO_CLIENT_SECRET && { ClientSecret: import.meta.env.VITE_COGNITO_CLIENT_SECRET })
};

export const userPool = new CognitoUserPool(poolData);

// Secret handling removed: A Public App Client should be used for web applications.
