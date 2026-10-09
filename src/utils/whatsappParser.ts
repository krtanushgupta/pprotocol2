export interface ParsedMessage {
  id: string;
  timestamp: string;
  sender: string;
  text: string;
  raw: string;
  index: number;
  isSystemEvent?: boolean;
  systemType?: 'JOIN' | 'ENCRYPTION' | 'SECURITY' | 'OTHER';
}

export interface ParseResult {
  messages: ParsedMessage[];
  totalLines: number;
  detectedFormat: 'whatsapp_bracket' | 'whatsapp_dash' | 'chat_colon' | 'plain_text';
  joinEventsCount: number;
}

// Regex for WhatsApp Bracket format:
// With sender & colon: [12/10/24, 14:32:10] John: Hello
// Handles 1-4 digit day/year, optional seconds, optional AM/PM
const REGEX_BRACKET_MSG = /^\[(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+?):\s+([\s\S]*)$/;
// Without colon (System notifications): [12/10/24, 14:32:10] John joined using this group's invite link
const REGEX_BRACKET_SYS = /^\[(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+)$/;

// Regex for WhatsApp Dash format (supports standard hyphen -, en-dash –, and em-dash —):
// With sender & colon: 12/10/24, 14:32 - John: Hello
const REGEX_DASH_MSG = /^(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+[-–—]\s+([^:]+?):\s+([\s\S]*)$/;
// Without colon (System notifications): 12/10/24, 14:32 - John joined using this group's invite link
const REGEX_DASH_SYS = /^(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+[-–—]\s+([^:]+)$/;

// Regex for simple sender colon: John: Hello or @John: Hello
const REGEX_COLON_MSG = /^(@?[\w\s\.\+\(\)-]{2,35}):\s+([\s\S]*)$/;

// Known system indicator phrases
const JOIN_PHRASES = [
  'joined using this group\'s invite link',
  'joined via invite link',
  'joined using an invite link',
  'joined',
  'was added',
  'added you',
  'added',
  'left',
  'removed'
];

const ENCRYPTION_PHRASES = [
  'messages and calls are end-to-end encrypted',
  'end-to-end encrypted',
  'security code changed',
  'created group',
  'changed the group name',
  'changed the subject to',
  'changed this group\'s icon'
];

export function cleanParserArtifacts(text: string): string {
  if (!text) return '';
  return text
    // Strip invisible Unicode formatting characters that break line matching
    .replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '')
    // Normalize non-breaking spaces
    .replace(/\u00A0/g, ' ')
    // Strip transport and parser tags like <message_history_notice ...>
    .replace(/<message_history_notice[^>]*>/gi, '')
    .replace(/<\/?message_history_notice>/gi, '')
    // Strip omitted media tags
    .replace(/<Media omitted>/gi, '')
    .replace(/<media omitted>/gi, '')
    .replace(/image omitted/gi, '')
    .replace(/video omitted/gi, '')
    .replace(/audio omitted/gi, '')
    .replace(/sticker omitted/gi, '')
    .replace(/document omitted/gi, '')
    .replace(/Contact card omitted/gi, '')
    // Strip deleted message tags
    .replace(/<This message was deleted>/gi, '')
    .replace(/This message was deleted/gi, '')
    .trim();
}

export function parseConversation(rawText: string): ParseResult {
  const sanitized = cleanParserArtifacts(rawText);
  const lines = sanitized.replace(/\r\n/g, '\n').split('\n');
  const messages: ParsedMessage[] = [];
  let detectedFormat: ParseResult['detectedFormat'] = 'plain_text';
  let joinCount = 0;

  let currentMessage: ParsedMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Skip isolated parser XML-like tags
    if (/^<.*>$/.test(line) && /message_history|notice|media|omitted/i.test(line)) {
      continue;
    }

    // 1. WhatsApp Bracket Format with sender: [Date, Time] Sender: Message
    const matchBracketMsg = line.match(REGEX_BRACKET_MSG);
    if (matchBracketMsg) {
      detectedFormat = 'whatsapp_bracket';
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: matchBracketMsg[1].trim(),
        sender: matchBracketMsg[2].trim(),
        text: matchBracketMsg[3].trim(),
        raw: rawLine,
        index: messages.length + 1,
      };
      continue;
    }

    // 2. WhatsApp Bracket System Notification: [Date, Time] +1 234 joined / Encryption
    const matchBracketSys = line.match(REGEX_BRACKET_SYS);
    if (matchBracketSys) {
      detectedFormat = 'whatsapp_bracket';
      const content = matchBracketSys[2].trim();
      const contentLower = content.toLowerCase();

      const isEncryption = ENCRYPTION_PHRASES.some((ep) => contentLower.includes(ep));
      const isJoin = !isEncryption && JOIN_PHRASES.some((jp) => contentLower.includes(jp));
      if (isJoin) joinCount++;

      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: matchBracketSys[1].trim(),
        sender: 'System Notice',
        text: content,
        raw: rawLine,
        index: messages.length + 1,
        isSystemEvent: true,
        systemType: isEncryption ? 'ENCRYPTION' : isJoin ? 'JOIN' : 'OTHER',
      };
      continue;
    }

    // 3. WhatsApp Dash Format with sender: Date, Time - Sender: Message
    const matchDashMsg = line.match(REGEX_DASH_MSG);
    if (matchDashMsg) {
      detectedFormat = 'whatsapp_dash';
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: matchDashMsg[1].trim(),
        sender: matchDashMsg[2].trim(),
        text: matchDashMsg[3].trim(),
        raw: rawLine,
        index: messages.length + 1,
      };
      continue;
    }

    // 4. WhatsApp Dash System Notification: Date, Time - +1 234 joined / Encryption
    const matchDashSys = line.match(REGEX_DASH_SYS);
    if (matchDashSys) {
      detectedFormat = 'whatsapp_dash';
      const content = matchDashSys[2].trim();
      const contentLower = content.toLowerCase();

      const isEncryption = ENCRYPTION_PHRASES.some((ep) => contentLower.includes(ep));
      const isJoin = !isEncryption && JOIN_PHRASES.some((jp) => contentLower.includes(jp));
      if (isJoin) joinCount++;

      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: matchDashSys[1].trim(),
        sender: 'System Notice',
        text: content,
        raw: rawLine,
        index: messages.length + 1,
        isSystemEvent: true,
        systemType: isEncryption ? 'ENCRYPTION' : isJoin ? 'JOIN' : 'OTHER',
      };
      continue;
    }

    // 5. Chat Colon Format: Sender: Message (e.g. John: Hello)
    const matchColonMsg = line.match(REGEX_COLON_MSG);
    if (matchColonMsg && !line.startsWith('http://') && !line.startsWith('https://')) {
      if (detectedFormat === 'plain_text') detectedFormat = 'chat_colon';
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: '',
        sender: matchColonMsg[1].trim(),
        text: matchColonMsg[2].trim(),
        raw: rawLine,
        index: messages.length + 1,
      };
      continue;
    }

    // 6. Check if standalone un-timestamped line is a join or encryption notification
    const lineLower = line.toLowerCase();
    const isStandaloneEncryption = ENCRYPTION_PHRASES.some((ep) => lineLower.includes(ep));
    const isStandaloneJoin = !isStandaloneEncryption && JOIN_PHRASES.some((jp) => lineLower.includes(jp));

    if (isStandaloneEncryption || isStandaloneJoin) {
      if (isStandaloneJoin) joinCount++;
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: '',
        sender: 'System Notice',
        text: line,
        raw: rawLine,
        index: messages.length + 1,
        isSystemEvent: true,
        systemType: isStandaloneEncryption ? 'ENCRYPTION' : 'JOIN',
      };
      continue;
    }

    // 7. Multiline continuation:
    // Only append to the previous message if it exists and is NOT a system event
    if (currentMessage && !currentMessage.isSystemEvent) {
      currentMessage.text += '\n' + rawLine;
      currentMessage.raw += '\n' + rawLine;
    } else {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        id: `m-${messages.length + 1}`,
        timestamp: '',
        sender: 'Message',
        text: line,
        raw: rawLine,
        index: messages.length + 1,
      };
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return {
    messages,
    totalLines: lines.length,
    detectedFormat,
    joinEventsCount: joinCount,
  };
}
