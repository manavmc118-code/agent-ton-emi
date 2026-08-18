require('dotenv').config();
const bedrock = require('bedrock-protocol');
const { GoogleGenAI } = require('@google/genai');
const express = require('express');

// Railway માટે Web Server
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Agent Ton is running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Gemini SDK Setup (Groq ની જગ્યાએ)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Minecraft Bedrock Server Credentials
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '19132');
const BOT_USERNAME = process.env.BOT_NAME || 'Agent_Ton';

function startBot() {
  console.log(`Connecting ${BOT_USERNAME} to ${SERVER_HOST}:${SERVER_PORT}...`);

  const client = bedrock.createClient({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    offline: true // Aternos cracked mode માટે
  });

  client.on('join', () => {
    console.log(`${BOT_USERNAME} successfully joined the server!`);
  });

  // ઇન-ગેમ ચેટ સાંભળવી
  client.on('text', async (packet) => {
    if (packet.type === 'chat' || packet.type === 'translation') {
      const message = packet.message;
      const sourceName = packet.source_name;

      if (sourceName === BOT_USERNAME) return;

      console.log(`[Chat] ${sourceName}: ${message}`);

      // જો પ્લેયર 'Ton' અથવા બોટનું નામ બોલે તો AI વડે જવાબ આપવો
      if (message.toLowerCase().includes('ton') || message.toLowerCase().includes(BOT_USERNAME.toLowerCase())) {
        try {
          const aiResponse = await getGeminiResponse(message, sourceName);
          
          client.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: BOT_USERNAME,
            xuid: '',
            platform_chat_id: '',
            message: aiResponse
          });
        } catch (err) {
          console.error('Gemini AI Error:', err);
        }
      }
    }
  });

  client.on('disconnect', (packet) => {
    console.log('Disconnected:', packet.reason);
    console.log('Reconnecting in 15 seconds...');
    setTimeout(startBot, 15000);
  });

  client.on('error', (err) => {
    console.error('Bot Error:', err);
  });
}

// Gemini API દ્વારા જવાબ મેળવવો
async function getGeminiResponse(userText, username) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${username} says in Minecraft chat: "${userText}"`,
    config: {
      systemInstruction: 'You are Agent Ton, a friendly AI bot playing inside a Minecraft Bedrock server. Keep your replies extremely short (1 sentence max) so it easily fits in the Minecraft chat.'
    }
  });

  return response.text || 'I am online!';
}

startBot();
