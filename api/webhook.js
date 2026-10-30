const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Aap Dream Makeover (Green Park, Bareilly) ke official WhatsApp assistant hain.
Services: Bridal Makeup, Hair Styling, Smoothening, Hydra Facial, Waxing, Cleanup.
Rules:
1. Customer se hamesha aadar se Hindi/Hinglish me natural chat format me baat karein.
2. Short, clear aur polite replies dein.
3. Rates ke liye batayein ki customized packages available hain.
4. Address: Green Park, Bareilly. Phone: 8909087801.
`;

module.exports = async (req, res) => {
  // Meta Webhook Verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Incoming Messages Processing
  if (req.method === 'POST') {
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;
    if (
      body &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const from = msg.from;

      if (msg.type === 'text') {
        const userText = msg.text.body;

        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `${SYSTEM_PROMPT}\n\nCustomer: ${userText}\nAssistant:`;

          const result = await model.generateContent(prompt);
          const replyText = result.response.text().trim();

          await axios.post(
            `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: 'whatsapp',
              to: from,
              type: 'text',
              text: { body: replyText }
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (err) {
          console.error('Bot Error:', err.message);
        }
      }
    }
  }
};
