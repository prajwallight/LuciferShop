exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    
    try {
        const data = JSON.parse(event.body);
        const { name, email, message, orderId } = data;
        
        console.log('Contact message received:', { name, email, message, orderId });
        
        // In production, you'd send an email or save to database
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Message received successfully',
                messageId: Date.now()
            })
        };
    } catch (error) {
        console.error('Error in contact function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send message' })
        };
    }
};