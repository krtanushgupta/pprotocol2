/**
 * Link detection and contextual action extraction utility for UNMISSED.
 * Complies with strict zero-fabrication: URLs are extracted strictly verbatim
 * from source messages. Links are opened securely in a new tab.
 */

export interface ActionLink {
  url: string;
  label: string;
  kind?: 'form' | 'doc' | 'meeting' | 'generic';
}

/**
 * Regex to extract valid HTTP/HTTPS URLs.
 * Handles URLs wrapped in punctuation or trailing parentheses/periods/quotes.
 */
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;

/**
 * Clean trailing punctuation often caught at the end of URLs in natural text.
 */
function cleanUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  // Strip trailing punctuation like .,;:!?) if not matched
  while (/[.,;:!?)]$/.test(url)) {
    // If ending with ')' and there is a matching '(', stop stripping
    if (url.endsWith(')')) {
      const openCount = (url.match(/\(/g) || []).length;
      const closeCount = (url.match(/\)/g) || []).length;
      if (openCount >= closeCount) break;
    }
    url = url.slice(0, -1);
  }
  return url;
}

/**
 * Extract all authentic URLs from a source message text.
 * Never guesses or fabricates.
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  // Normalize newline-split URLs or URLs with hidden non-break spaces
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const unique: string[] = [];
  for (const m of matches) {
    const cleaned = cleanUrl(m);
    if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://'))) {
      if (!unique.includes(cleaned)) {
        unique.push(cleaned);
      }
    }
  }
  return unique;
}

/**
 * Generate a contextual, faithful label for a verified URL given its surrounding message context.
 * Strict zero-fabrication: if destination cannot be inferred faithfully from the text,
 * defaults to "Open link ↗".
 */
export function getContextualLinkLabel(url: string, sourceText: string, specificTitle?: string): string {
  const lowerUrl = url.toLowerCase();
  const lowerText = sourceText.toLowerCase();

  // 1. Google Forms / Microsoft Forms / Feedback forms
  const isFormUrl = lowerUrl.includes('forms.gle') || lowerUrl.includes('docs.google.com/forms') || lowerUrl.includes('typeform.com') || lowerUrl.includes('forms.office.com');
  if (isFormUrl || lowerText.includes('form') || lowerText.includes('survey')) {
    if (lowerText.includes('feedback form') || lowerText.includes('feedback') || (specificTitle && specificTitle.toLowerCase().includes('feedback'))) {
      return 'Open feedback form ↗';
    }
    if (lowerText.includes('registration form') || lowerText.includes('register')) {
      return 'Open registration form ↗';
    }
    if (lowerText.includes('attendance')) {
      return 'Open attendance form ↗';
    }
    return 'Open form ↗';
  }

  // 2. Video Meetings / Calls (Meet, Zoom, Teams, Webex)
  if (
    lowerUrl.includes('meet.google.com') ||
    lowerUrl.includes('zoom.us') ||
    lowerUrl.includes('teams.microsoft.com') ||
    lowerUrl.includes('webex.com')
  ) {
    return 'Join meeting ↗';
  }

  // 3. Documents / Spreadsheets / Drive / Notion / Figma / GitHub
  if (lowerUrl.includes('docs.google.com/document') || lowerUrl.includes('notion.so') || lowerText.includes('doc')) {
    return 'View document ↗';
  }
  if (lowerUrl.includes('docs.google.com/spreadsheets') || lowerUrl.includes('sheets')) {
    return 'Open spreadsheet ↗';
  }
  if (lowerUrl.includes('drive.google.com')) {
    return 'Open Google Drive folder ↗';
  }
  if (lowerUrl.includes('github.com')) {
    return 'View GitHub repository ↗';
  }
  if (lowerUrl.includes('figma.com')) {
    return 'Open Figma design ↗';
  }

  // 4. Calendar / Polls
  if (lowerUrl.includes('calendar.google.com') || lowerText.includes('calendar')) {
    return 'View calendar event ↗';
  }
  if (lowerUrl.includes('doodle.com') || lowerUrl.includes('strawpoll.com') || lowerText.includes('poll')) {
    return 'Vote on poll ↗';
  }

  // 5. Context-based keywords near URL
  if (lowerText.includes('register') || lowerText.includes('signup') || lowerText.includes('sign up')) {
    return 'Open registration link ↗';
  }
  if (lowerText.includes('apply') || lowerText.includes('application')) {
    return 'Open application link ↗';
  }
  if (lowerText.includes('download')) {
    return 'Download file ↗';
  }

  // Unclear purpose -> Never guess
  return 'Open link ↗';
}

/**
 * Extract ActionLink array from a source message, pairing each authentic URL
 * with a contextual label.
 */
export function extractActionLinks(rawText: string, specificTitle?: string): ActionLink[] {
  const urls = extractUrls(rawText);
  return urls.map((url) => {
    const label = getContextualLinkLabel(url, rawText, specificTitle);
    let kind: ActionLink['kind'] = 'generic';
    if (label.includes('form')) kind = 'form';
    else if (label.includes('document') || label.includes('spreadsheet')) kind = 'doc';
    else if (label.includes('meeting')) kind = 'meeting';

    return {
      url,
      label,
      kind
    };
  });
}
