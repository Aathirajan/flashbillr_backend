import axios from 'axios';

const apiKey = process.env.GUPSHUP_API_KEY;
const source = process.env.GUPSHUP_WHATSAPP_SOURCE; // e.g., '9198xxxxxxxx'
const apiUrl = 'https://api.gupshup.io/sm/api/v1/msg';

if (!apiKey || !source) {
    throw new Error('Gupshup WhatsApp credentials are missing in environment variables.');
}

/**
 * Send a WhatsApp message using Gupshup
 * @param toPhone - Recipient phone number (e.g., +91xxxxxxxxxx)
 * @param message - Message body
 */
export async function sendWhatsAppMessage(toPhone: string, message: string) {
    // Gupshup expects numbers without '+' and with country code
    const normalizedTo = toPhone.replace(/^\+/, '');
    try {
        const response = await axios.post(
            apiUrl,
            null, // POST body is null for simple message API
            {
                params: {
                    channel: 'whatsapp',
                    source,
                    destination: normalizedTo,
                    message,
                    'src.name': source, // Sometimes required for templates
                },
                headers: {
                    'apikey': apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        if (response.data && response.data.status !== 'submitted') {
            throw new Error(`Gupshup API error: ${JSON.stringify(response.data)}`);
        }
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to send WhatsApp message via Gupshup: ${error.message}`);
    }
}
