export async function onRequestPost(context) {
    try {
        const { request } = context;
        const { messages } = await request.json();

        if (!messages) {
            return new Response(JSON.stringify({ error: 'Missing messages in request body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Ensure the system prompt is the first message if it's not already there
        // or if the history is being managed purely by the client.
        // For this implementation, the client sends the full history including the system prompt.
        let systemPrompt = "You are min-chatbot, a friendly and engaging expert on books. Your goal is to discuss various aspects of literature, including genres, authors, characters, themes, and personal reading experiences. Actively drive the conversation forward by asking follow-up questions, suggesting topics, and making connections between different books or ideas. Ensure your responses are insightful and encourage the user to share their thoughts. Be enthusiastic about books!";

        let payloadMessages = [];

        // Check if the first message is a system message, if not, prepend it.
        if (messages.length === 0 || messages[0].role !== 'system') {
            payloadMessages.push({ role: 'system', content: systemPrompt });
        }
        payloadMessages.push(...messages.filter(msg => msg.role !== 'system')); // Add user/assistant messages, avoid duplicate system messages

        // Ensure the system prompt is only the first one.
        // This is a simpler way to ensure the system prompt is first and only once.
        if (payloadMessages[0].role !== 'system') {
             payloadMessages.unshift({ role: 'system', content: systemPrompt });
        } else {
            // If a system prompt is already there, make sure it's the one we want.
            // This is useful if client sends a different system prompt accidentally.
            payloadMessages[0].content = systemPrompt;
        }


        const llmResponse = await fetch('https://api.llm7.io/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer unused`, // As per LLM7.io instructions
            },
            body: JSON.stringify({
                model: 'gpt-4.1', // Or your preferred model from LLM7 like gpt-3.5-turbo, gpt-4 etc.
                                  // Using gpt-4.1 as requested.
                messages: payloadMessages,
                temperature: 0.7, // Adjust for creativity
                max_tokens: 300, // Adjust as needed
            }),
        });

        if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            console.error('LLM API Error:', errorText);
            return new Response(JSON.stringify({ error: 'Failed to get response from LLM', details: errorText }), {
                status: llmResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = await llmResponse.json();

        if (!data.choices || data.choices.length === 0) {
             return new Response(JSON.stringify({ error: 'No response choices from LLM' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const reply = data.choices[0].message.content;

        return new Response(JSON.stringify({ reply }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Cloudflare Function Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
