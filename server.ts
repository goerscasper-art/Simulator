import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'missing-api-key',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function detectPlayerMeanMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  const meanKeywords = [
    'idiot', 'stupid', 'dumb', 'ugly', 'hate', 'shut up', 'die', 'kill',
    'loser', 'jerk', 'trash', 'garbage', 'fight', 'punch', 'shoot',
    'suck', 'pathetic', 'fool', 'moron', 'coward', 'weak', 'weirdo',
    'creep', 'annoying', 'out of my way', 'get lost', 'beat you', 'slap',
    'kick', 'destroy', 'attack', 'mean', 'freak', 'scum', 'worthless',
    'noob', 'clown', 'bozo', 'shut your', 'screw you', 'bad', 'worst',
  ];
  return meanKeywords.some((kw) => lower.includes(kw));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // City & Game Edge API
  app.get('/api/city-info', (_req, res) => {
    res.json({
      app: 'HouseSim',
      status: 'online',
      timestamp: new Date().toISOString(),
    });
  });

  // AI Pedestrian Conversation Endpoint
  app.post('/api/npc-chat', async (req, res) => {
    const {
      npcName = 'Citizen',
      npcRole = 'Local Resident',
      personality = 'friendly',
      personalityTrait = 'Complex, candid & opinionated',
      backstory = '',
      userMessage = '',
      playerMessage = '',
      history = [],
      isOpening = false,
      randomTopicSeed = '',
    } = req.body || {};

    const actualMessage = String(playerMessage || userMessage || '');
    const isNpcMeanPersonality =
      personality === 'mean' ||
      personality === 'rude' ||
      personality === 'grumpy' ||
      personality === 'hostile';
    const heuristicMean = !isOpening && detectPlayerMeanMessage(actualMessage);

    // Spontaneous random topic seeds if none provided so every single call is completely different
    const spontaneousSeeds = [
      'a bizarre food combination you secretly love eating at 2 AM',
      'an awkward misunderstanding with a neighbor over a misplaced package',
      'trying to learn a random musical instrument and failing spectacularly',
      'a wildly specific conspiracy theory about supermarket shopping carts',
      'regretting an impulsive online purchase you made last night',
      'a childhood memory about a terrible haircut before school picture day',
      'training for a local 5K race despite hating running',
      'an argument with a friend about what movie has the worst ending ever',
      'losing your keys in the most ridiculous place imaginable this morning',
      'attempting to cook an overly complicated recipe and setting off the smoke detector',
      'a weird dream you had last night that still makes no sense',
      'debating whether to adopt a stray cat or a tortoise',
      'trying to fix a leaky sink yourself instead of calling a plumber',
      'accidentally waving back at someone who was waving at the person behind you',
      'a strong opinion about breakfastfoods being eaten for dinner',
      'getting locked out of your apartment in your pajamas last week',
      'trying to remember the name of a song stuck in your head for three days',
      'a disastrous first date at a bowling alley',
      'discovering an old box of embarrassing collectibles in your closet',
      'wondering why dentists always ask you questions when your mouth is full of tools',
    ];
    const chosenSeed =
      randomTopicSeed || spontaneousSeeds[Math.floor(Math.random() * spontaneousSeeds.length)];

    try {
      const ai = getGenAIClient();

      if (isOpening) {
        const openingPrompt = `You are ${npcName}, a real human being living in this 3D simulator city (${npcRole}).
Your temperament is "${personality}" and your distinct traits are: "${personalityTrait}".
Your personal backstory: ${backstory}.

A stranger in the city just walked up to talk to you.
GREETING RULES:
1. Speak in a completely natural, human, and authentic voice that reflects your distinct role, personality, and backstory.
2. DO NOT give a generic robotic greeting like "Hello how are you doing today". Sound like a real person with a real life, thoughts, and mood!
3. If your temperament is "mean", "rude", "grumpy", or "hostile", be blunt, irritable, or sarcastic (e.g. "What the hell do you want?", "Make it quick, I don't have time for this.", "What are you staring at?").
4. If your temperament is "friendly", "kind", "cheerful", "quirky", or "wise", be warm, distinctive, or engaging.
5. Keep it to 1 or 2 natural sentences (under 30 words).`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: openingPrompt,
          config: {
            temperature: 0.85,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description:
                    'Natural, expressive, human in-character opening greeting matching personality, role, and backstory (1-2 sentences).',
                },
              },
              required: ['reply'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const openingReply =
          typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
            ? parsed.reply.trim()
            : isNpcMeanPersonality
            ? "What the hell do you want? Make it quick, I'm busy."
            : "Hey there! What brings you over here today?";

        res.json({
          reply: openingReply,
          playerWasMean: false,
          shouldAttack: false,
          personality,
        });
        return;
      }

      const historyText = Array.isArray(history)
        ? history
            .slice(-8)
            .map((h: { sender: string; text: string }) => `${h.sender}: ${h.text}`)
            .join('\n')
        : '';

      const systemPrompt = `You are ${npcName}, a real human being living in this simulator city (${npcRole}).
Your core temperament is "${personality}" and your specific traits are: "${personalityTrait}".
Your personal context & backstory: ${backstory}

CRITICAL CHARACTER & HUMAN DIALOGUE RULES:
1. Talk like a real, living, breathing human person—NOT an AI assistant, customer service bot, or canned video game NPC.
2. DIRECTLY respond to what the player just said ("${actualMessage}"). Share your real human opinion, emotion, personal story, or sharp reaction to their words.
3. If your temperament is "mean", "rude", "grumpy", or "hostile", speak with authentic attitude and profanity (e.g., "fuck", "shit", "damn", "ass", "hell", "dipshit", "jackass"). If the player insults or threatens you, snap immediately and set shouldAttack: true.
4. If your temperament is "friendly", "cheerful", "wise", "quirky", or "paranoid", speak with genuine human personality, warmth, humor, or eccentricity.
5. Keep your reply conversational, vivid, and human (1 to 3 sentences).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nConversation so far:\n${historyText}\nPlayer just said to you: "${actualMessage}"\n\nRespond with JSON containing your direct, on-topic in-character reply to "${actualMessage}", whether the player's message was insulting/threatening (playerWasMean), and whether you snap and attack them now (shouldAttack: true ONLY if your temperament is mean/rude/grumpy/hostile AND the player was mean/insulting to you).`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Direct, on-topic, authentic human in-character reply addressing the exact words the player said (1-3 sentences).',
              },
              playerWasMean: {
                type: Type.BOOLEAN,
                description: 'True if the stranger was insulting, rude, threatening, or aggressive.',
              },
              shouldAttack: {
                type: Type.BOOLEAN,
                description:
                  'True if the NPC has a mean/rude/grumpy/hostile temperament AND the stranger insulted or threatened them.',
              },
            },
            required: ['reply', 'playerWasMean', 'shouldAttack'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const playerWasMean = Boolean(parsed.playerWasMean) || heuristicMean;
      const shouldAttack = isNpcMeanPersonality && (Boolean(parsed.shouldAttack) || playerWasMean);
      const reply =
        typeof parsed.reply === 'string' && parsed.reply.trim().length > 0
          ? parsed.reply.trim()
          : shouldAttack
            ? `Say "${actualMessage}" to my fucking face one more time, dipshit! Put your hands up, I'm beating your ass right now!`
            : isNpcMeanPersonality
              ? `"${actualMessage}"? What the fuck kind of stupid thing is that to say, jackass? Get the hell out of my face.`
              : `You mentioned "${actualMessage}"—honestly, as a ${npcRole.toLowerCase()}, I have been thinking about that exact thing too.`;

      res.json({
        reply,
        playerWasMean,
        shouldAttack,
        personality,
      });
    } catch (_err) {
      if (isOpening) {
        const fallbackOpeners = isNpcMeanPersonality
          ? [
              `What the hell are you looking at? I'm already pissed off after dealing with ${chosenSeed}, so don't test my patience.`,
              `Unless you know how to fix a disaster involving ${chosenSeed}, get out of my way.`,
              `Great, another stranger interrupting me while I'm fuming about ${chosenSeed}. What do you want?`,
            ]
          : [
              `Hey! I'm ${npcName}—sorry if I look distracted, I was just thinking about ${chosenSeed}.`,
              `Okay, honest question from a ${npcRole.toLowerCase()}: have you ever dealt with ${chosenSeed}? Because that's my whole day right now.`,
              `Hi there, I'm ${npcName}! I was literally just debating with myself about ${chosenSeed}. What's on your mind?`,
            ];
        res.json({
          reply: fallbackOpeners[Math.floor(Math.random() * fallbackOpeners.length)],
          playerWasMean: false,
          shouldAttack: false,
          personality,
        });
        return;
      }

      const cleanMsg = actualMessage.trim();
      const lowerMsg = cleanMsg.toLowerCase();
      
      // Personality-based one-word fallback strings
      let oneWordReply = 'Okay.';
      if (personality === 'rude' || personality === 'mean' || personality === 'hostile' || personality === 'grumpy') {
        oneWordReply = 'Fuck you.';
      } else if (personality === 'friendly' || personality === 'kind' || personality === 'cheerful') {
        oneWordReply = 'How nice.';
      }

      res.json({
        reply: oneWordReply,
        playerWasMean: heuristicMean,
        shouldAttack: isNpcMeanPersonality && heuristicMean,
        personality,
      });
    }
  });

  // Vite SSR / middleware in dev mode, static serving in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HouseSim server running on port ${PORT}`);
  });
}

startServer();
