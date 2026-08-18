require('dotenv').config();
const bedrock = require('bedrock-protocol');
const { Groq } = require('groq-sdk');
const express = require('express');

// Railway ની હેલ્થ ચેક માટે નાનું Web Server
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Agent Ton is running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Groq Client Setup
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Minecraft Bedrock Server Credentials
const SERVER_HOST = process.env.SERVER_HOST; // e.g. "xxxx.aternos.me"
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '19132');
const BOT_USERNAME = process.env.BOT_NAME || 'Agent_Ton';

function startBot() {
  console.log(`Connecting ${BOT_USERNAME} to ${SERVER_HOST}:${SERVER_PORT}...`);

  const client = bedrock.createClient({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: BOT_USERNAME,
    offline: true // Aternos cracked mode માટે true
  });

  client.on('join', () => {
    console.log(`${BOT_USERNAME} successfully joined the server!`);
  });

  // ઇન-ગેમ ચેટ સાંભળવી અને Groq AI વડે જવાબ આપવો
  client.on('text', async (packet) => {
    // માત્ર પ્લેયર મેસેજ ફિલ્ટર કરવા
    if (packet.type === 'chat' || packet.type === 'translation') {
      const message = packet.message;
      const sourceName = packet.source_name;

      // બોટ પોતે મોકલેલા મેસેજ ઇગ્નોર કરવા
      if (sourceName === BOT_USERNAME) return;

      console.log(`[Chat] ${sourceName}: ${message}`);

      // જો કોઈ 'Ton' અથવા બોટનું નામ લઈને વાત કરે તો જવાબ આપવો
      if (message.toLowerCase().includes('ton') || message.toLowerCase().includes(BOT_USERNAME.toLowerCase())) {
        try {
          const aiResponse = await getGroqResponse(message, sourceName);
          
          // ગેમમાં મેસેજ મોકલવો
          client.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: BOT_USERNAME,
            xuid: '',
            platform_chat_id: '',
            message: aiResponse
          });
        } catch (err) {
          console.error('Groq Error:', err);
        }
      }
    }
  });

  client.on('disconnect', (packet) => {
    console.log('Disconnected from server:', packet.reason);
    console.log('Reconnecting in 15 seconds...');
    setTimeout(startBot, 15000);
  });

  client.on('error', (err) => {
    console.error('Bot Error:', err);
  });
}

// Groq API દ્વારા ટૂંકો અને મજેદાર જવાબ મેળવવો
async function getGroqResponse(userText, username) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are Agent Ton, a helpful AI playing in a Minecraft Bedrock server. Keep your responses very short (1-2 sentences max) so it fits in Minecraft chat.'
      },
      {
        role: 'user',
        content: `${username} says: ${userText}`
      }
    ],
    model: 'llama-3.3-70b-versatile',
  });

  return chatCompletion.choices[0]?.message?.content || 'I am listening!';
}

startBot();
