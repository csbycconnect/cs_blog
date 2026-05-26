import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb, TABLE_NAME, USERS_TABLE_NAME, EVENTS_TABLE_NAME } from './aws-config';

/**
 * Article Database Schematic
 * 
 * Partition Key (PK): id (String) - Unique UUID
 * 
 * Global Secondary Indexes:
 * 1. CategoryIndex
 *    - GSI1PK: `CATEGORY#<category_name>`
 *    - GSI1SK: `DATE#<iso_date>`
 * 2. AuthorIndex
 *    - GSI2PK: `AUTHOR#<author_name>`
 *    - GSI2SK: `DATE#<iso_date>`
 * 3. StatusIndex
 *    - GSI3PK: `STATUS#<status>` (e.g., pending, accepted)
 *    - GSI3SK: `DATE#<iso_date>`
 */

export const ArticleAPI = {
    /**
     * Submits a new article to DynamoDB.
     * Automatically generates IDs and required Index schema keys.
     */
    submitArticle: async (formData, wordCount) => {
        const dateStr = new Date().toISOString();
        const id = crypto.randomUUID();
        // normalize article fields; prefer HTML content if provided
        const article = {
            PK: id,
            SK: "ARTICLE",
            id: id,
            // spread formData first (will include title, category, tags, name, etc.)
            ...formData,
            // make sure we always have a contentHTML field for display
            contentHTML: formData.contentHTML || formData.content || '',
            // keep raw markdown/plain content for backwards compatibility
            content: formData.content || '',
            status: 'pending',
            date: dateStr,
            createdAt: dateStr, // alias for consistency with external schemas
            readTime: Math.max(1, Math.round(wordCount / 220)) + ' min read',
            views: 0,
            likes: 0,
            comments: 0,
            
            // Global Secondary Index Keys schema population
            GSI1PK: `CATEGORY#${(formData.category || 'Uncategorized').trim().toUpperCase()}`,
            GSI1SK: `DATE#${dateStr}`,
            GSI2PK: `AUTHOR#${formData.name || 'Anonymous'}`,
            GSI2SK: `DATE#${dateStr}`,
            GSI3PK: `STATUS#pending`,
            GSI3SK: `DATE#${dateStr}`
        };

        await dynamoDb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: article
        }));
        return article;
    },

    /**
     * Fetches a specific article by ID
     */
    fetchArticleById: async (id) => {
        const result = await dynamoDb.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND SK = :sk",
            ExpressionAttributeValues: { ":pk": id, ":sk": "ARTICLE" }
        }));
        return result.Items?.[0] || null;
    },

    /**
     * Fetches articles by an author's name using the AuthorIndex.
     */
    fetchByAuthor: async (authorName) => {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'AuthorIndex',
            KeyConditionExpression: "GSI2PK = :authorVal",
            ExpressionAttributeValues: { ":authorVal": `AUTHOR#${authorName}` },
        };
        const result = await dynamoDb.send(new QueryCommand(params));
        return (result.Items || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    },

    /**
     * Fetches articles by their review status using the StatusIndex.
     */
    fetchByStatus: async (status) => {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'StatusIndex',
            KeyConditionExpression: "GSI3PK = :statusVal",
            ExpressionAttributeValues: { ":statusVal": `STATUS#${status}` },
        };
        const result = await dynamoDb.send(new QueryCommand(params));
        // Sort so newest are first
        return (result.Items || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    },

    /**
     * Accepts an article by updating its status and GSI keys.
     */
    acceptArticle: async (id) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: id, SK: "ARTICLE" },
            UpdateExpression: "SET #st = :statusVal, GSI3PK = :gsi3pk",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":statusVal": "accepted",
                ":gsi3pk": "STATUS#accepted"
            }
        }));
    },

    /**
     * Increments the view count for an article.
     */
    incrementViews: async (id) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: id, SK: "ARTICLE" },
            UpdateExpression: "ADD #v :inc",
            ExpressionAttributeNames: { "#v": "views" },
            ExpressionAttributeValues: { ":inc": 1 }
        }));
    },

    /**
     * Increments or decrements the likes count for an article.
     */
    toggleLike: async (id, isLiking) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: id, SK: "ARTICLE" },
            UpdateExpression: "ADD #l :inc",
            ExpressionAttributeNames: { "#l": "likes" },
            ExpressionAttributeValues: { ":inc": isLiking ? 1 : -1 }
        }));
    },

    /**
     * Soft-deletes an article by changing its status to 'deleted'.
     */
    softDeleteArticle: async (id) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: id, SK: "ARTICLE" },
            UpdateExpression: "SET #st = :statusVal, GSI3PK = :gsi3pk",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":statusVal": "deleted",
                ":gsi3pk": "STATUS#deleted"
            }
        }));
    },

    /**
     * Rejects (completely deletes) an article from DynamoDB. (Alias)
     */
    hardDeleteArticle: async (id) => {
        await ArticleAPI.rejectArticle(id);
    },

    /**
     * Rejects (deletes) an article completely from DynamoDB.
     */
    rejectArticle: async (id) => {
        await dynamoDb.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: id, SK: "ARTICLE" }
        }));
    },
    
    /**
     * Inserts a new record into the bb_gallery_events table.
     */
    createEvent: async (eventData) => {
        const id = crypto.randomUUID();
        const item = {
            PK: `EVENT#${id}`,
            SK: "METADATA",
            id: id,
            ...eventData
        };

        await dynamoDb.send(new PutCommand({
            TableName: EVENTS_TABLE_NAME,
            Item: item
        }));
        return item;
    },

    /**
     * Fetches all events from the bb_gallery_events table.
     */
    fetchAllEvents: async () => {
        const result = await dynamoDb.send(new ScanCommand({
            TableName: EVENTS_TABLE_NAME
        }));
        // Sort events chronologically by date
        return (result.Items || []).sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    /**
     * Updates media links on a specific event.
     */
    updateEventMedia: async (id, { posterUrl, galleryUrls, geoTagUrls }) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: EVENTS_TABLE_NAME,
            Key: {
                PK: `EVENT#${id}`,
                SK: "METADATA"
            },
            UpdateExpression: "SET posterUrl = :p, galleryUrls = :g, geoTagUrls = :geo",
            ExpressionAttributeValues: {
                ":p": posterUrl || '',
                ":g": galleryUrls || '',
                ":geo": geoTagUrls || ''
            }
        }));
    }
};

// -----------------------------------------------------------------------------
// user profile helper API
// -----------------------------------------------------------------------------
export const UserAPI = {
    /**
     * Fetches the profile record for a given Cognito user sub from bb_users.
     * Assumes the Partition Key is "id".
     */
    fetchProfile: async (sub) => {
        const result = await dynamoDb.send(new GetCommand({
            TableName: USERS_TABLE_NAME,
            Key: {
                PK: `USER#${sub}`,
                SK: "PROFILE"
            }
        }));
        return result.Item || null;
    },

    /**
     * Create or update the bio text for a given user using UpdateCommand.
     * It uses the Cognito 'sub' hash as the Partition Key (id).
     */
    upsertBio: async (sub, bio) => {
        await dynamoDb.send(new UpdateCommand({
            TableName: USERS_TABLE_NAME,
            Key: {
                PK: `USER#${sub}`,
                SK: "PROFILE"
            },
            UpdateExpression: "SET bio = :bioVal",
            ExpressionAttributeValues: {
                ":bioVal": bio || ''
            }
        }));
    },

    /**
     * Fetches all user profiles from bb_users using a Scan.
     * Use cautiously if table grows large.
     */
    fetchAllUsers: async () => {
        const result = await dynamoDb.send(new ScanCommand({
            TableName: USERS_TABLE_NAME
        }));
        return result.Items || [];
    }
};