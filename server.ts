import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { parseConversation, ParsedMessage } from './src/utils/whatsappParser.ts';
import { analyzeConversationStrict } from './src/utils/relevanceClassifier.ts';
import { extractActionLinks } from './src/utils/linkExtractor.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = process.env.PORT || 3000;

// Initialize Google Gen AI client if key exists
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
}

// POST /api/analyze — UNMISSED core intelligence endpoint
app.post('/api/analyze', async (req, res) => {
  const { transcript, useCloud } = req.body;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Empty transcript provided. Please paste or upload a conversation.'
    });
  }

  // 1. Strictly parse WhatsApp / chat messages into structured evidence records
  const parseResult = parseConversation(transcript);
  const messages: ParsedMessage[] = parseResult.messages;

  if (messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Could not parse any messages from the input. Please check the formatting.'
    });
  }

  // If Gemini API is available and user didn't disable cloud processing, run Gemini with strict Rules
  if (useCloud !== false && aiClient && geminiApiKey) {
    try {
      const prompt = `You are the intelligence engine behind UNMISSED, an application that answers: "What did I miss?"
Your highest priority is accuracy, simplicity, and evidence. NEVER invent, assume, or bluff data.

SOURCE MESSAGES TO ANALYZE (${messages.length} messages):
"""
${messages.map((m, idx) => `[#${idx + 1}] [${m.timestamp || 'No timestamp'}] ${m.sender}: ${m.text}`).join('\n')}
"""

NON-NEGOTIABLE RULES:

RULE 1 — ALWAYS USE BULLET POINTS:
- The conversation overview MUST be an array of 2 to 4 bullet points ("overviewBullets"). NEVER return a single paragraph.
- Every priority section must contain bulleted findings.
- Each bullet must communicate exactly one finding, max 2 sentences.

RULE 2 — EXTRACT MEANINGFUL ACTIONABLE HEADINGS (NO VAGUE TITLES):
- Turn important messages into meaningful, specific headings. Never use an entire raw message as a heading.
- Bad: "Hey everyone! 👋 Huge thanks to all of you for participating..."
- Bad: "Reminder or task from +91..."
- Good: "Complete the Day 1 feedback form"
- Good: "Confirm $4,500 contractor budget line item"
- Good: "Register Fetch.ai developer account and upload confirmation"
- If there is no actionable item, use a descriptive information heading rather than inventing a task.
- Detect valid HTTP/HTTPS URLs from the source message and include them in "links" with faithful labels: "Open feedback form ↗", "View document ↗", "Join meeting ↗", or "Open link ↗". NEVER guess, fabricate, or rewrite URLs.
- Every bullet must answer what happened, who is involved, what action is required, and the explicit deadline (or state "No deadline established").
- Never classify as URGENT purely due to emojis, greetings, or exclamation marks. Urgency must be supported by content and timing.

RULE 3 — ONE FINDING PER BULLET:
Never combine multiple distinct topics into one summary point.
If a conversation contains a deadline, a budget discussion, and a lunch plan, each must be a separate bullet point with its own priority level and source message.

RULE 4 — NO RAW TEXT IN OVERVIEWS:
The overview and priority findings must be clear, human-readable summaries.
- Never dump raw WhatsApp export text directly into the summary or title.
- Strip timestamps, phone numbers, and formatting brackets from the finding titles and explanations (they belong in the expandable source message view).
- Fix raw artifacts like <message_history_notice>, <Media omitted>, etc.

RULE 5 — DEDUPLICATE REPETITIVE NOTIFICATIONS:
WhatsApp exports often contain consecutive system notifications (e.g. "X joined using this group's invite link").
Do NOT generate a separate finding for each join notification.
Group them into at most ONE informational bullet under FYI or omit pure join noise.

RULE 6 — STRICT PRIORITY CRITERIA:
- "URGENT": Immediate action required by a specific, imminent deadline (e.g. today, within hours), blockers, or critical escalations.
- "IMPORTANT": Confirmed decisions and policy changes, future deliverables, assigned tasks, feedback forms, and questions or polls awaiting answers.
- "FYI": General informational announcements, reference links, and relevant promotional or opportunity notices.
(Do NOT create additional priority levels or numeric scores. If a category has no items, return an empty array for that category).

Respond in strict JSON with the following structure:
{
  "overviewBullets": [
    "Bullet 1: Main topic discussed across the messages",
    "Bullet 2: Confirmed decisions, if any (or state none)",
    "Bullet 3: Most urgent action required, if any"
  ],
  "overview": "Combined text of overview bullets",
  "hasActionableContent": true,
  "findings": [
    {
      "id": "f-1",
      "priority": "URGENT" | "IMPORTANT" | "FYI",
      "title": "Short descriptive title (5-8 words, specific actionable task or decision)",
      "explanation": "Specific 1-2 sentence explanation answering what, who, action, and deadline.",
      "timingStatus": "e.g. Today by 4:00 PM or Friday at 10:00 AM or No deadline established",
      "isInferred": false,
      "links": [
        {
          "url": "Exact HTTP/HTTPS URL from source message",
          "label": "e.g. Open feedback form ↗"
        }
      ],
      "evidence": {
        "rawMessage": "Exact verbatim quote from the source message",
        "sender": "Exact sender name",
        "timestamp": "Exact timestamp from message if present",
        "messageIndex": 1
      },
      "earlierConflict": {
        "priorClaim": "Earlier plan explicitly stated in previous message",
        "priorSender": "Sender name",
        "priorTimestamp": "Timestamp",
        "priorQuote": "Exact quote from earlier message",
        "resolutionNote": "Why it changed"
      }
    }
  ],
  "limitationsNote": "Optional note on filtered promotional noise or missing timing"
}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      const overviewBullets = Array.isArray(parsed.overviewBullets) && parsed.overviewBullets.length > 0
        ? parsed.overviewBullets
        : (parsed.overview ? parsed.overview.split(/(?<=[.?!])\s+/).filter(Boolean) : []);

      // Ensure every finding has timingStatus, valid links, and action links extracted from evidence
      const validatedFindings = (parsed.findings || [])
        .filter((f: any) => {
          // Never include pure WhatsApp membership system events in findings (Requirement 4)
          const titleLower = (f.title || '').toLowerCase();
          const rawLower = (f.evidence?.rawMessage || '').toLowerCase();
          if (titleLower.includes('joined using') || titleLower.includes('left the group')) return false;
          if (rawLower.includes('joined using this group\'s invite link') && !f.links?.length) return false;
          return true;
        })
        .map((f: any) => {
          const rawText = f.evidence?.rawMessage || '';
          const detectedLinks = extractActionLinks(rawText, f.title);
          return {
            ...f,
            links: f.links && f.links.length > 0 ? f.links : detectedLinks,
            timingStatus: f.timingStatus || 'No deadline established'
          };
        });

      return res.json({
        success: true,
        data: {
          overview: overviewBullets.join(' ') || parsed.overview || 'Overview of conversation.',
          overviewBullets: overviewBullets.length > 0 ? overviewBullets : ['Conversation messages reviewed.'],
          findings: validatedFindings,
          totalMessagesProcessed: messages.length,
          hasActionableContent: parsed.hasActionableContent ?? (validatedFindings.length > 0),
          limitationsNote: parsed.limitationsNote,
          analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          processingMode: 'cloud_gemini'
        },
        engine: 'gemini-3.8-flash'
      });
    } catch (err: any) {
      console.warn('Gemini API call error, falling back to strict relevance classifier:', err?.message);
    }
  }

  // Deterministic local extraction based strictly on relevance filter & genuine change verification
  const localAnalysis = analyzeConversationStrict(messages);
  localAnalysis.processingMode = 'local_on_device';
  return res.json({
    success: true,
    data: localAnalysis,
    engine: 'deterministic-relevance-engine'
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`UNMISSED server running on port ${port}`);
  });
}

startServer();
