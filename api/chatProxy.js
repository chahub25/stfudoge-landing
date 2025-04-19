// File: api/chatProxy.js
// Purpose: Securely handles OpenRouter API calls using server-side API key.

export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // Get the API key from Vercel Environment Variables
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error("OpenRouter API Key is missing in Vercel environment variables.");
        return response.status(500).json({ error: 'API key configuration error on server.' });
    }

    try {
        const requestBody = request.body; // Get the messages payload from the client

        // --- Call OpenRouter ---
        const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

        const openRouterResponse = await fetch(openRouterUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody), // Forward the client's request body
        });

        // --- Handle OpenRouter Response ---
        const responseData = await openRouterResponse.json();

        if (!openRouterResponse.ok) {
             console.error("OpenRouter API Error:", responseData);
             return response.status(openRouterResponse.status || 500).json({
                 error: `OpenRouter API error: ${responseData.error?.message || openRouterResponse.statusText}`
             });
        }

        // --- Send Success Response Back to Client ---
        return response.status(200).json(responseData);

    } catch (error) {
        console.error('Error in chatProxy function:', error);
        return response.status(500).json({ error: 'Internal Server Error in proxy.' });
    }
}
