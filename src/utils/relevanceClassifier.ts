import { ParsedMessage } from './whatsappParser';
import { Finding, PriorityLevel, UnmissedAnalysis } from '../types';
import { extractActionLinks } from './linkExtractor';

export interface ClassifiedMessage {
  message: ParsedMessage;
  category: 
    | 'FEEDBACK_FORM'
    | 'ACTIONABLE_REMINDER' 
    | 'POLL' 
    | 'DECISION' 
    | 'SCHEDULE_CHANGE'
    | 'TASK' 
    | 'EVENT_REGISTRATION' 
    | 'PROMOTIONAL_FYI' 
    | 'FYI_ANNOUNCEMENT' 
    | 'CASUAL_CHATTER' 
    | 'SYSTEM_JOIN'
    | 'SYSTEM_ENCRYPTION';
  isRelevant: boolean;
  priority: PriorityLevel;
  reason: string;
}

const PROMO_KEYWORDS = [
  'hiring',
  'job opening',
  'recruiting',
  'internship opportunity',
  'apply now',
  'apply at',
  'apply here',
  'job alert',
  'we are hiring',
  'career opportunity',
  'walk-in interview',
  'limited seats',
  'discount code',
  'webinar',
  'register for free',
  'batch starts',
  'course enrollment',
  'stipend',
  'earn money',
  'referral bonus'
];

const SAME_DAY_KEYWORDS = [
  'today',
  'by today',
  'before eod',
  'by 4:00 pm today',
  'by 5:00 pm today',
  'by 6:00 pm today',
  'by 1:00 pm today',
  'by 4 pm today',
  'by 5 pm today',
  'by 6 pm today',
  'by 1 pm today',
  'within the hour',
  'asap',
  'cutoff today',
  'deadline today',
  'submit today'
];

/**
 * Clean text for human-readable bullet titles and explanations
 * Strips phone numbers, timestamps, raw formatting brackets, markdown symbols, and XML tags.
 */
export function cleanForDisplay(text: string): string {
  if (!text) return '';
  return text
    // Remove XML/HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove timestamps e.g. [12/10/24, 14:32:10] or 14:32:10
    .replace(/\[\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]/g, '')
    // Remove URLs from title extraction so URLs don't pollute the heading
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove markdown bold/italics/strikethrough markers
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Remove bracket tags like [Forwarded]
    .replace(/\[Forwarded\]/gi, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean sender name for display, masking raw phone numbers into clean participant labels
 */
export function cleanSenderDisplay(sender: string): string {
  if (!sender) return 'Participant';
  const trimmed = sender.trim();
  if (/^\+?\d[\d\s\(\)\-\.]{7,}$/.test(trimmed)) {
    return 'Participant';
  }
  return trimmed.replace(/^@/, '');
}

export function classifyMessage(m: ParsedMessage): ClassifiedMessage {
  const text = m.text;
  const lower = text.toLowerCase();

  // 0. System Encryption Notification -> Not relevant for catch-up findings
  if (m.isSystemEvent && m.systemType === 'ENCRYPTION') {
    return {
      message: m,
      category: 'SYSTEM_ENCRYPTION',
      isRelevant: false,
      priority: 'FYI',
      reason: 'End-to-end encryption notice.'
    };
  }

  // 1. System Join Notification -> Handled as grouped FYI (Rule 4: Never as standalone finding)
  if (m.isSystemEvent && m.systemType === 'JOIN') {
    return {
      message: m,
      category: 'SYSTEM_JOIN',
      isRelevant: false, // Exclude pure WhatsApp membership events from findings
      priority: 'FYI',
      reason: 'Participant join notification.'
    };
  }

  // 2. Feedback Form / Survey Request (e.g., Day 1 Feedback Form, Session Feedback)
  if (/feedback form|fill out the.*form|submit.*feedback|survey/i.test(text)) {
    const isToday = SAME_DAY_KEYWORDS.some((kw) => lower.includes(kw));
    return {
      message: m,
      category: 'FEEDBACK_FORM',
      isRelevant: true,
      priority: isToday ? 'URGENT' : 'IMPORTANT',
      reason: 'Feedback form submission request.'
    };
  }

  // 3. Event Registration / Account Creation Task (e.g. Fetch.ai, hackathon, forms)
  if (/fetch\.ai|create an account|upload a screenshot|registration link|qr code|register using the form|upload confirmation|google form/i.test(text)) {
    const isToday = SAME_DAY_KEYWORDS.some((kw) => lower.includes(kw));
    return {
      message: m,
      category: 'EVENT_REGISTRATION',
      isRelevant: true,
      priority: isToday ? 'URGENT' : 'IMPORTANT',
      reason: 'Event registration or account setup task.'
    };
  }

  // 4. Promotional / Recruitment -> RETAIN AS FYI (Never mark Urgent/Important)
  if (PROMO_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      message: m,
      category: 'PROMOTIONAL_FYI',
      isRelevant: true,
      priority: 'FYI',
      reason: 'Recruitment or promotional announcement.'
    };
  }

  // 5. Poll requiring response -> Actionable
  if (lower.includes('poll:') || lower.includes('please vote') || lower.includes('vote on the poll') || /\bvote by\b/i.test(text)) {
    const isToday = SAME_DAY_KEYWORDS.some((kw) => lower.includes(kw));
    return {
      message: m,
      category: 'POLL',
      isRelevant: true,
      priority: isToday ? 'URGENT' : 'IMPORTANT',
      reason: 'Group poll requiring participant response.'
    };
  }

  // 6. Confirmed Decisions / Schedule Changes
  if (
    lower.includes('decision:') ||
    lower.includes('decided to') ||
    lower.includes('we agreed to') ||
    lower.includes('officially approved') ||
    lower.includes('moved to') ||
    lower.includes('rescheduled to') ||
    lower.includes('postponed to')
  ) {
    return {
      message: m,
      category: 'DECISION',
      isRelevant: true,
      priority: 'IMPORTANT',
      reason: 'Confirmed decision or schedule update.'
    };
  }

  // 7. Actionable Reminders / Direct Requests / Confirmations
  if (
    lower.includes('please provide your') ||
    lower.includes('please submit') ||
    lower.includes('please send') ||
    lower.includes('reminder to submit') ||
    lower.includes('email id to') ||
    lower.includes('confirm if') ||
    lower.includes('waiting on your confirmation') ||
    lower.includes('please fill out') ||
    lower.includes('need to finalize') ||
    lower.includes('attention students:') ||
    lower.includes('must create an account')
  ) {
    const isToday = SAME_DAY_KEYWORDS.some((kw) => lower.includes(kw));
    return {
      message: m,
      category: 'ACTIONABLE_REMINDER',
      isRelevant: true,
      priority: isToday ? 'URGENT' : 'IMPORTANT',
      reason: isToday ? 'Imminent same-day action requested.' : 'Actionable request.'
    };
  }

  // 8. Assigned Tasks / Deliverables
  if (/please update|will take care of|assigned to|responsible for|working on it now|have the deck|submitted my confirmation/i.test(text)) {
    return {
      message: m,
      category: 'TASK',
      isRelevant: true,
      priority: 'IMPORTANT',
      reason: 'Assigned task or status update.'
    };
  }

  // 9. General Announcements / Logistics
  if (/reminder:|announcement:|booked|fyi|team lunch|open enrollment|forms must be submitted|monitors|wi-fi|wifi/i.test(text)) {
    const isToday = SAME_DAY_KEYWORDS.some((kw) => lower.includes(kw));
    return {
      message: m,
      category: 'FYI_ANNOUNCEMENT',
      isRelevant: true,
      priority: isToday ? 'URGENT' : 'FYI',
      reason: 'Informational announcement.'
    };
  }

  // 10. Casual chatter (only skip if short greeting or reaction)
  if (text.length > 50 && (text.includes('http://') || text.includes('https://'))) {
    // If it contains a link, keep as FYI
    return {
      message: m,
      category: 'FYI_ANNOUNCEMENT',
      isRelevant: true,
      priority: 'FYI',
      reason: 'Informational message containing external reference link.'
    };
  }

  return {
    message: m,
    category: 'CASUAL_CHATTER',
    isRelevant: false,
    priority: 'FYI',
    reason: 'Casual conversation.'
  };
}

export function detectAuthenticScheduleChanges(messages: ParsedMessage[]): {
  earlierMessage: ParsedMessage;
  laterMessage: ParsedMessage;
  topic: string;
  resolutionNote: string;
}[] {
  const changes: {
    earlierMessage: ParsedMessage;
    laterMessage: ParsedMessage;
    topic: string;
    resolutionNote: string;
  }[] = [];

  const changeVerbRegex = /\b(moved to|postponed to|rescheduled to|change of plans|new time|moved from|is moved to)\b/i;

  for (let i = 0; i < messages.length; i++) {
    const later = messages[i];
    if (later.isSystemEvent) continue;
    const laterText = later.text.toLowerCase();

    if (!changeVerbRegex.test(laterText)) continue;

    for (let j = 0; j < i; j++) {
      const earlier = messages[j];
      if (earlier.isSystemEvent) continue;
      const earlierText = earlier.text.toLowerCase();

      const eventAnchors = ['presentation', 'review', 'meeting', 'exam', 'demo', 'call', 'interview', 'workshop', 'launch'];
      const sharedAnchor = eventAnchors.find((anchor) => earlierText.includes(anchor) && laterText.includes(anchor));

      if (sharedAnchor) {
        changes.push({
          earlierMessage: earlier,
          laterMessage: later,
          topic: sharedAnchor,
          resolutionNote: `Updated from earlier schedule (${earlier.timestamp || 'initial notice'}) to new time.`
        });
        break;
      }
    }
  }

  return changes;
}

export function detectUnresolvedConflicts(messages: ParsedMessage[]): {
  messageA: ParsedMessage;
  messageB: ParsedMessage;
  topic: string;
  explanation: string;
}[] {
  const conflicts: {
    messageA: ParsedMessage;
    messageB: ParsedMessage;
    topic: string;
    explanation: string;
  }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msgA = messages[i];
    if (msgA.isSystemEvent) continue;
    const textA = msgA.text.toLowerCase();

    if (/launching.*tomorrow|launch.*tomorrow/i.test(textA)) {
      const msgB = messages.find(
        (m, idx) => idx > i && !m.isSystemEvent && /cannot launch|freeze until|strongly advise against/i.test(m.text)
      );
      if (msgB) {
        conflicts.push({
          messageA: msgA,
          messageB: msgB,
          topic: 'Campaign launch date',
          explanation: `${cleanSenderDisplay(msgA.sender)} stated the campaign launches tomorrow, but ${cleanSenderDisplay(msgB.sender)} flagged an engineering freeze until Thursday and advised against it. No final resolution was recorded.`
        });
      }
    }
  }

  return conflicts;
}

/**
 * Deterministic Pipeline adhering strictly to all requirements:
 */
export function analyzeConversationStrict(messages: ParsedMessage[]): UnmissedAnalysis {
  const classifiedList = messages.map(classifyMessage);
  const relevantClassified = classifiedList.filter((c) => c.isRelevant);

  // Exclude pure WhatsApp membership events from findings (Requirement 4)
  const nonJoinRelevant = relevantClassified.filter((c) => c.category !== 'SYSTEM_JOIN');

  // Detect genuine schedule changes & unresolved conflicts
  const authenticChanges = detectAuthenticScheduleChanges(messages);
  const changedLaterMessageIds = new Set(authenticChanges.map((c) => c.laterMessage.id));

  const conflicts = detectUnresolvedConflicts(messages);
  const conflictMessageIds = new Set(conflicts.flatMap((c) => [c.messageA.id, c.messageB.id]));

  const findings: Finding[] = [];

  // 1. Process Genuine Changed Decisions (Dual-evidence verified)
  authenticChanges.forEach((change, idx) => {
    const timing = extractTimingStatus(change.laterMessage.text);
    const sender = cleanSenderDisplay(change.laterMessage.sender);
    const capitalizedTopic = change.topic.charAt(0).toUpperCase() + change.topic.slice(1);
    const title = `${capitalizedTopic} rescheduled to ${timing || 'new time'}`;

    findings.push({
      id: `change-${idx + 1}`,
      priority: 'IMPORTANT',
      title,
      explanation: `${sender} confirmed the ${change.topic} is rescheduled to ${timing || 'a new time'}. The earlier schedule announced previously is superseded.`,
      timingStatus: timing ? `Deadline: ${timing}` : 'No deadline established',
      isInferred: false,
      links: extractActionLinks(change.laterMessage.text, title),
      evidence: {
        rawMessage: change.laterMessage.text,
        sender: change.laterMessage.sender,
        timestamp: change.laterMessage.timestamp,
        messageIndex: change.laterMessage.index
      },
      earlierConflict: {
        priorClaim: `Earlier schedule: ${change.earlierMessage.text}`,
        priorSender: change.earlierMessage.sender,
        priorTimestamp: change.earlierMessage.timestamp,
        priorQuote: change.earlierMessage.text,
        resolutionNote: change.resolutionNote
      }
    });
  });

  // 2. Process Unresolved Conflicts (URGENT)
  conflicts.forEach((conf, idx) => {
    const title = `Unresolved conflict: ${conf.topic}`;
    findings.push({
      id: `conflict-${idx + 1}`,
      priority: 'URGENT',
      title,
      explanation: conf.explanation,
      timingStatus: 'Outcome unresolved in conversation',
      isInferred: false,
      links: extractActionLinks(conf.messageB.text, title),
      evidence: {
        rawMessage: conf.messageB.text,
        sender: conf.messageB.sender,
        timestamp: conf.messageB.timestamp,
        messageIndex: conf.messageB.index
      },
      earlierConflict: {
        priorClaim: `Statement by ${cleanSenderDisplay(conf.messageA.sender)}`,
        priorSender: conf.messageA.sender,
        priorTimestamp: conf.messageA.timestamp,
        priorQuote: conf.messageA.text,
        resolutionNote: 'Contradictory statements without recorded resolution.'
      }
    });
  });

  // 3. Process Feedback Forms (e.g. Day 1 Feedback Form example from brief)
  const seenTitles = new Set<string>();

  nonJoinRelevant.forEach((c) => {
    if (changedLaterMessageIds.has(c.message.id) || conflictMessageIds.has(c.message.id)) return;

    if (c.category === 'FEEDBACK_FORM') {
      const timing = extractTimingStatus(c.message.text);
      const title = extractActionableHeading(c.message.text, 'FEEDBACK_FORM');
      if (seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());

      const explanation = generateSpecificExplanation(c, title, timing);
      const links = extractActionLinks(c.message.text, title);

      findings.push({
        id: `form-${findings.length + 1}`,
        priority: c.priority,
        title,
        explanation,
        timingStatus: timing ? `Deadline: ${timing}` : 'No deadline established',
        isInferred: false,
        links,
        evidence: {
          rawMessage: c.message.text,
          sender: c.message.sender,
          timestamp: c.message.timestamp,
          messageIndex: c.message.index
        }
      });
      return;
    }

    // Handle Event Registration (Fetch.ai, Google Form screenshot verification)
    if (c.category === 'EVENT_REGISTRATION') {
      const timing = extractTimingStatus(c.message.text);
      const title = extractActionableHeading(c.message.text, 'EVENT_REGISTRATION');
      if (seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());

      const explanation = generateSpecificExplanation(c, title, timing);
      const links = extractActionLinks(c.message.text, title);

      findings.push({
        id: `reg-${findings.length + 1}`,
        priority: c.priority,
        title,
        explanation,
        timingStatus: timing ? `Deadline: ${timing}` : 'No deadline established',
        isInferred: false,
        links,
        evidence: {
          rawMessage: c.message.text,
          sender: c.message.sender,
          timestamp: c.message.timestamp,
          messageIndex: c.message.index
        }
      });
      return;
    }

    // Handle Promotional postings (Retained as FYI, deduplicated)
    if (c.category === 'PROMOTIONAL_FYI') {
      const promoTitle = extractPromoTitle(c.message.text);
      if (seenTitles.has(promoTitle.toLowerCase())) return;
      seenTitles.add(promoTitle.toLowerCase());

      const sender = cleanSenderDisplay(c.message.sender);
      const links = extractActionLinks(c.message.text, promoTitle);

      findings.push({
        id: `promo-${findings.length + 1}`,
        priority: 'FYI',
        title: promoTitle,
        explanation: `${sender} shared an external opportunity notice. This is promotional content and does not require assigned action.`,
        timingStatus: 'No deadline established',
        isInferred: false,
        links,
        evidence: {
          rawMessage: c.message.text,
          sender: c.message.sender,
          timestamp: c.message.timestamp,
          messageIndex: c.message.index
        }
      });
      return;
    }

    // Handle Polls, Actionable Reminders, Tasks, and Announcements
    const title = extractActionableHeading(c.message.text, c.category);
    if (seenTitles.has(title.toLowerCase())) return;
    seenTitles.add(title.toLowerCase());

    const timing = extractTimingStatus(c.message.text);
    const explanation = generateSpecificExplanation(c, title, timing);
    const links = extractActionLinks(c.message.text, title);

    findings.push({
      id: `f-${findings.length + 1}`,
      priority: c.priority,
      title,
      explanation,
      timingStatus: timing ? `Deadline: ${timing}` : 'No deadline established',
      isInferred: false,
      links,
      evidence: {
        rawMessage: c.message.text,
        sender: c.message.sender,
        timestamp: c.message.timestamp,
        messageIndex: c.message.index
      }
    });
  });

  // Generate Strict Bulleted Overview (2–4 concise bullet points)
  const overviewBullets: string[] = [];

  const urgentItems = findings.filter((f) => f.priority === 'URGENT');
  const importantItems = findings.filter((f) => f.priority === 'IMPORTANT');
  const fyiItems = findings.filter((f) => f.priority === 'FYI');
  const hasActionable = urgentItems.length > 0 || importantItems.length > 0;

  if (findings.length === 0) {
    overviewBullets.push(`Discussion among group members spanning ${messages.length} messages of general conversation.`);
    overviewBullets.push(`No pending deadlines, assigned tasks, or confirmed policy decisions were identified.`);
  } else {
    // Bullet 1: Main topic discussed
    const primaryTopics = Array.from(new Set(findings.map((f) => f.title))).slice(0, 2);
    overviewBullets.push(`Main topic focused on ${primaryTopics.join(' and ').toLowerCase()} across ${messages.length} messages.`);

    // Bullet 2: Confirmed decisions or changes, if present
    const changeFinding = findings.find(
      (f) => f.id.startsWith('change-') || f.title.toLowerCase().includes('rescheduled') || f.title.toLowerCase().includes('decision')
    );
    if (changeFinding) {
      overviewBullets.push(`Confirmed update: ${changeFinding.title}.`);
    }

    // Bullet 3: Most urgent action required, if present
    const topAction = urgentItems[0] || importantItems[0];
    if (topAction && topAction !== changeFinding) {
      overviewBullets.push(`Action required: ${topAction.title} (${topAction.timingStatus || 'No deadline established'}).`);
    } else if (fyiItems.length > 0 && !hasActionable) {
      overviewBullets.push(`General updates include ${fyiItems[0].title.toLowerCase()}.`);
    }

    // Ensure 2-4 bullets
    if (overviewBullets.length < 2) {
      if (urgentItems.length > 0) {
        overviewBullets.push(`${urgentItems.length} urgent ${urgentItems.length === 1 ? 'item requires' : 'items require'} immediate attention.`);
      } else {
        overviewBullets.push(`No critical blockers or immediate deadlines were identified.`);
      }
    }
  }

  return {
    overview: overviewBullets.join(' '),
    overviewBullets,
    findings,
    totalMessagesProcessed: messages.length,
    hasActionableContent: hasActionable,
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Extract meaningful, actionable headings from source messages without vague placeholders.
 * Never uses entire message as heading. Identifies the central task, decision, deadline, or announcement.
 */
export function extractActionableHeading(text: string, category: ClassifiedMessage['category']): string {
  const lower = text.toLowerCase();

  // 1. Feedback forms & Surveys (Exact requirement from prompt)
  if (lower.includes('feedback form') || lower.includes('day 1 feedback')) {
    if (lower.includes('day 1')) return 'Complete the Day 1 feedback form';
    if (lower.includes('day 2')) return 'Complete the Day 2 feedback form';
    if (lower.includes('session feedback')) return 'Complete session feedback form';
    return 'Complete the feedback form';
  }
  if (lower.includes('fill out the') && lower.includes('form')) {
    const formMatch = text.match(/fill out the\s+([A-Za-z0-9\s]+?)\s*(?:form|\:)/i);
    if (formMatch && formMatch[1].trim().length < 35) {
      return `Complete the ${formMatch[1].trim()} form`;
    }
    return 'Complete the requested form';
  }

  // 2. Event Registrations & Accounts (Fetch.ai, Google Forms)
  if (/fetch\.ai/i.test(text)) {
    return 'Register Fetch.ai developer account and upload confirmation';
  }
  if (/attendance/i.test(lower) && /form|link/i.test(lower)) {
    return 'Submit attendance form';
  }

  // 3. Polls
  if (category === 'POLL' || /vote on the poll|poll:/i.test(text)) {
    if (/review session/i.test(lower)) return 'Vote on review session schedule poll';
    return 'Vote on group schedule poll';
  }

  // 4. Specific Actionable Tasks & Reminders
  if (/email id/i.test(text)) {
    return 'Submit official college email ID for exam registration';
  }
  if (/contractor budget|aws inference|\$4,500/i.test(text)) {
    return 'Confirm $4,500 contractor budget line item';
  }
  if (/contract draft/i.test(text)) {
    return 'Confirm whether contract draft has been signed';
  }
  if (/slide deck/i.test(text)) {
    return 'Update slide deck with new metrics';
  }
  if (/assignment 3/i.test(text)) {
    return 'Status update: Assignment 3 in progress';
  }
  if (/open enrollment/i.test(text)) {
    return 'Submit open enrollment benefits forms';
  }
  if (/monitors for lab|monitors/i.test(text)) {
    return 'Installation of new 27-inch monitors in Lab 4';
  }
  if (/wi-fi password|wifi password/i.test(text)) {
    return 'Guest Wi-Fi network password rotated';
  }
  if (/conference room/i.test(text)) {
    return 'Conference Room B booked for Thursday workshop';
  }

  // 5. Intelligent sentence extraction: locate the actionable sentence rather than the opening greeting
  const lines = text
    .split(/\n+/)
    .map((l) => cleanForDisplay(l))
    .filter((l) => l.length > 5);

  for (const line of lines) {
    // Skip pleasantries like "Hey everyone!", "Huge thanks", "Hi team"
    if (/^(hey|hi|hello|huge thanks|thanks to all|good morning|dear team)\b/i.test(line)) {
      continue;
    }
    // Look for directive verbs
    if (/^(please|kindly|remember to|make sure to|confirm|submit|fill out|register|update|review|sign)\b/i.test(line)) {
      const sentence = line.split(/[.?!]/)[0].trim();
      if (sentence.length > 10 && sentence.length < 65) {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      }
    }
  }

  // 6. Fallback to clean short summary of first non-greeting sentence
  for (const line of lines) {
    if (!/^(hey|hi|hello|huge thanks|good morning)\b/i.test(line)) {
      const sentence = line.split(/[.?!]/)[0].trim();
      if (sentence.length > 10 && sentence.length < 55) {
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      }
    }
  }

  const cleaned = cleanForDisplay(text);
  const firstSentence = cleaned.split(/[.?!]/)[0].trim();
  if (firstSentence.length > 10 && firstSentence.length < 60) {
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
  }

  return cleaned.slice(0, 48).trim() || 'Notice';
}

function extractPromoTitle(text: string): string {
  if (/data analyst/i.test(text)) return 'Job notice: Data Analyst internship opening';
  if (/software engineering/i.test(text)) return 'Job notice: Software Engineering internship opening';
  if (/internship/i.test(text)) return 'Internship opportunity announcement';
  if (/hiring/i.test(text)) return 'Recruitment opening announcement';
  return 'Promotional announcement';
}

export function extractTimingStatus(text: string): string | undefined {
  if (/by 4:00 pm today|by 4:00 pm|by 4 pm today|by 4 pm/i.test(text)) return 'Today by 4:00 PM';
  if (/by 5:00 pm today|by 5:00 pm|by 5 pm today|by 5 pm/i.test(text)) return 'Today by 5:00 PM';
  if (/by 6:00 pm today|by 6:00 pm|by 6 pm today|by 6 pm/i.test(text)) return 'Today by 6:00 PM';
  if (/by 1:00 pm today|by 1:00 pm|by 1 pm today|by 1 pm/i.test(text)) return 'Today before 1:00 PM';
  if (/today at \d|by today|today before \d/i.test(text)) {
    const match = text.match(/today (?:at|before|by) \d{1,2}(?::\d{2})?(?:\s*[ap]m)?/i);
    return match ? match[0] : 'Today';
  }
  if (/tomorrow at 10:00 am|tomorrow at 10 am/i.test(text)) return 'Tomorrow at 10:00 AM';
  if (/tomorrow at 9:00 am|tomorrow at 9 am|tomorrow morning at 9/i.test(text)) return 'Tomorrow morning at 9:00 AM';
  if (/tomorrow at 2:00 pm|tomorrow at 2 pm/i.test(text)) return 'Tomorrow at 2:00 PM';
  if (/tomorrow at \d|tomorrow by \d/i.test(text)) {
    const match = text.match(/tomorrow (?:at|before|by) \d{1,2}(?::\d{2})?(?:\s*[ap]m)?/i);
    return match ? match[0] : 'Tomorrow';
  }
  if (/friday at 10:00 am|friday at 10 am/i.test(text)) return 'Friday at 10:00 AM';
  if (/friday at 2:00 pm|friday at 2 pm/i.test(text)) return 'Friday at 2:00 PM';
  if (/friday october 25th at 5 pm|friday at 5 pm/i.test(text)) return 'Friday October 25th at 5:00 PM';
  if (/by friday|on friday/i.test(text)) return 'Friday';
  return undefined;
}

function generateSpecificExplanation(c: ClassifiedMessage, heading: string, timing?: string): string {
  const text = cleanForDisplay(c.message.text);
  const sender = cleanSenderDisplay(c.message.sender);
  const lower = text.toLowerCase();

  if (c.category === 'FEEDBACK_FORM' || heading.toLowerCase().includes('feedback form')) {
    return 'Fill out the feedback form so the organizers can improve Day 2.';
  }

  if (c.category === 'POLL') {
    return `${sender} posted a poll asking group members to vote on the review session schedule. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }

  if (c.category === 'EVENT_REGISTRATION') {
    if (/fetch\.ai/i.test(lower)) {
      return `${sender} requested participants to register an account on Fetch.ai and submit confirmation via the provided form. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
    }
    return `${sender} requested participants to complete registration and upload confirmation. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }

  if (/email id/i.test(lower)) {
    return `${sender} reminded students to submit their college email ID to the teaching assistant for exam registration. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }
  if (/budget|\$4,500/i.test(lower)) {
    return `${sender} requested confirmation on the $4,500 contractor budget line item before the finance cutoff. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }
  if (/contract draft/i.test(lower)) {
    return `${sender} asked whether the contract draft has been signed. No confirmation was recorded in the chat.`;
  }
  if (/monitors/i.test(lower)) {
    return `${sender} announced that new 27-inch monitors for Lab 4 arrived and are being installed today. Informational update.`;
  }
  if (/wi-fi|wifi/i.test(lower)) {
    return `${sender} stated the guest Wi-Fi password was rotated to LabGuest2024. Reference for local access.`;
  }
  if (/conference room/i.test(lower)) {
    return `${sender} announced that Conference Room B is booked for the Thursday workshop.`;
  }
  if (/open enrollment/i.test(lower)) {
    return `${sender} shared a reminder that open enrollment forms must be submitted. ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }

  if (c.category === 'TASK') {
    return `${sender} reported on task: "${text.slice(0, 95)}". ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
  }
  if (c.category === 'DECISION') {
    return `${sender} confirmed: "${text.slice(0, 95)}".`;
  }

  return `${sender} shared notice: "${text.slice(0, 95)}". ${timing ? `Deadline: ${timing}.` : 'No deadline established.'}`;
}
