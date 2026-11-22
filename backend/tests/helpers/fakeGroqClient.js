/**
 * Udawany klient Groq do aiService.setClient(). Zwraca podane punkty jako odpowiedź modelu
 * albo rzuca podany błąd; zapamiętuje wysłane zapytania w `requests`.
 */
const createFakeGroqClient = ({ waypoints = [], rawContent, error } = {}) => {
    const requests = [];
    return {
        requests,
        chat: {
            completions: {
                create: async (request) => {
                    requests.push(request);
                    if (error) throw error;
                    const content = rawContent ?? JSON.stringify({ waypoints });
                    return { choices: [{ message: { content } }] };
                },
            },
        },
    };
};

/**
 * Prompt wysłany do modelu w ostatnim zapytaniu
 */
const lastPrompt = (client) => client.requests[client.requests.length - 1]?.messages
    .find(message => message.role === 'user')?.content;

module.exports = { createFakeGroqClient, lastPrompt };
