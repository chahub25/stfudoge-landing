// File: api/chatProxy.js

// This is a Vercel Serverless Function.
// It runs on the server, not in the browser.

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
                // Optional headers recommended by OpenRouter (get URL from request if needed):
                // 'HTTP-Referer': `${YOUR_SITE_URL}`,
                // 'X-Title': `${YOUR_SITE_NAME}`,
            },
            body: JSON.stringify(requestBody), // Forward the client's request body
        });

        // --- Handle OpenRouter Response ---
        const responseData = await openRouterResponse.json();

        if (!openRouterResponse.ok) {
             console.error("OpenRouter API Error:", responseData);
            // Forward the error status and message from OpenRouter if possible
             return response.status(openRouterResponse.status || 500).json({
                 error: `OpenRouter API error: ${responseData.error?.message || openRouterResponse.statusText}`
             });
        }

        // --- Send Success Response Back to Client ---
        // Forward the successful response from OpenRouter
        return response.status(200).json(responseData);

    } catch (error) {
        console.error('Error in chatProxy function:', error);
        return response.status(500).json({ error: 'Internal Server Error in proxy.' });
    }
}
