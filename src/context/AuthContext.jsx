import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    AuthenticationDetails,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserSession,
    CognitoIdToken,
    CognitoAccessToken,
    CognitoRefreshToken
} from 'amazon-cognito-identity-js';
import { userPool } from '../lib/cognito-config';
import { UserService as UserAPI } from '../services/user'; // ✅ Pointed to your Vercel service layer

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /**
     * parse `#` hash returned by Cognito hosted UI and, if we see
     * tokens, create a session object so the SDK can later pick up the
     * signed‑in user.  After handling the hash we clear it from the URL.
     */
    useEffect(() => {
        const handleOAuthRedirect = async () => {
            if (window.location.hash) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const idToken = params.get('id_token');
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (idToken && accessToken) {
                    // create a fake "username" by decoding the idToken
                    const payload = JSON.parse(atob(idToken.split('.')[1]));
                    const username = payload['cognito:username'] || payload.sub;

                    const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });
                    const session = new CognitoUserSession({
                        IdToken: new CognitoIdToken({ IdToken: idToken }),
                        AccessToken: new CognitoAccessToken({ AccessToken: accessToken }),
                        RefreshToken: new CognitoRefreshToken({ RefreshToken: refreshToken || '' }),
                    });
                    cognitoUser.setSignInUserSession(session);
                    // store the user in local storage the same way the SDK would
                    userPool.storage.setItem(
                        `CognitoIdentityServiceProvider.${import.meta.env.VITE_COGNITO_CLIENT_ID}.LastAuthUser`,
                        username
                    );
                    // an immediate state update will follow below when we query the user
                }

                // clear the hash so it doesn't hang around after reloads
                window.history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        };

        const loadCurrentUser = async () => {
            const cognitoUser = userPool.getCurrentUser();
            if (!cognitoUser) {
                setLoading(false);
                return;
            }

            cognitoUser.getSession(async (err, session) => {
                if (err) {
                    setLoading(false);
                    return;
                }
                const idToken = session.getIdToken().decodePayload();
                const groups = idToken['cognito:groups'] || [];

                cognitoUser.getUserAttributes(async (err, attributes) => {
                    if (err) {
                        setLoading(false);
                        return;
                    }
                    const attributesMap = {};
                    for (let attribute of attributes) {
                        attributesMap[attribute.getName()] = attribute.getValue();
                    }
                    // fetch profile bio if available
                    let bio = '';
                    try {
                        const profile = await UserAPI.fetchProfile(attributesMap.sub);
                        bio = profile?.bio || '';
                    } catch (e) {
                        console.warn('error fetching profile bio', e);
                    }

                    setUser({
                        name: attributesMap.name || 'User',
                        email: attributesMap.email,
                        sub: attributesMap.sub,
                        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${attributesMap.name || 'U'}&backgroundColor=0A192F&textColor=f7d000`,
                        role: groups.length > 0 ? groups[0] : 'student',
                        groups: groups,
                        bio
                    });
                    setLoading(false);
                });
            });
        };

        // kick off both steps sequentially
        handleOAuthRedirect().then(loadCurrentUser);
    }, []);

    const register = async (email, password, name) => {
        return new Promise((resolve, reject) => {
            const attributeList = [
                new CognitoUserAttribute({ Name: 'email', Value: email }),
                new CognitoUserAttribute({ Name: 'name', Value: name }),
            ];
            
            userPool.signUp(email, password, attributeList, null, async (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    // create an empty profile record so user can later add bio
                    try {
                        if (result && result.userSub) {
                            await UserAPI.upsertBio(result.userSub, '');
                        }
                    } catch (e) {
                        console.warn('failed to init profile record', e);
                    }
                    resolve({ result });
                }
            });
        });
    };

    const confirmRegistration = (email, code) => {
        return new Promise((resolve, reject) => {
            const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
            
            cognitoUser.confirmRegistration(code, true, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };

    const login = async (email, password) => {
        return new Promise((resolve, reject) => {
            const authParams = {
                Username: email,
                Password: password,
            };

            const authenticationDetails = new AuthenticationDetails(authParams);

            const cognitoUser = new CognitoUser({
                Username: email,
                Pool: userPool
            });

            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: async (result) => {
                    const idToken = result.getIdToken().decodePayload();
                    const groups = idToken['cognito:groups'] || [];

                    cognitoUser.getUserAttributes(async (err, attributes) => {
                        if (err) { reject(err); return; }
                        const attributesMap = {};
                        for (let attribute of attributes) {
                            attributesMap[attribute.getName()] = attribute.getValue();
                        }
                        let bio = '';
                        try {
                            const profile = await UserAPI.fetchProfile(attributesMap.sub);
                            bio = profile?.bio || '';
                        } catch (e) {
                            console.warn('error fetching profile bio', e);
                        }
                        setUser({
                            name: attributesMap.name || 'User',
                            email: attributesMap.email,
                            sub: attributesMap.sub,
                            avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${attributesMap.name || 'U'}&backgroundColor=0A192F&textColor=f7d000`,
                            role: groups.length > 0 ? groups[0] : 'student',
                            groups: groups,
                            bio
                        });
                        resolve(result);
                    });
                },
                onFailure: (err) => reject(err),
            });
        });
    };

    const logout = () => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        setUser(null);
    };

    /**
     * Persist a new biography string for the currently signed-in user.
     * Updates both DynamoDB and our in‑memory `user` object so the
     * UI can refresh immediately.
     */
    const updateBio = async (newBio) => {
        if (!user?.sub) return;
        try {
            await UserAPI.upsertBio(user.sub, newBio);
            setUser(u => ({ ...u, bio: newBio }));
        } catch (e) {
            console.error('failed to update bio', e);
            throw e;
        }
    };

    /**
     * Redirects the browser to the Cognito hosted UI with the given
     * identity provider (Google, Facebook, LoginWithAmazon, Apple, etc.).
     */
    const signInWithProvider = (provider) => {
        const domain = import.meta.env.VITE_COGNITO_DOMAIN;
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
        const redirect = encodeURIComponent(window.location.origin + '/login');
        const scope = encodeURIComponent('email openid profile');
        const url = `${domain}/oauth2/authorize?identity_provider=${provider}&redirect_uri=${redirect}&response_type=token&client_id=${clientId}&scope=${scope}`;
        window.location.href = url;
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, confirmRegistration, login, logout, signInWithProvider, updateBio }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}