import { Finding } from '../types';

export type TopicTabId = 
  | 'all' 
  | 'register' 
  | 'assignments' 
  | 'homework' 
  | 'classes' 
  | 'deadlines' 
  | 'decisions' 
  | 'announcements';

export interface TopicTab {
  id: TopicTabId;
  label: string;
  count: number;
}

const TOPIC_CONFIG: Array<{ id: TopicTabId; label: string }> = [
  { id: 'register', label: 'Register' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'homework', label: 'Homework' },
  { id: 'classes', label: 'Classes' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'announcements', label: 'Announcements' },
];

/**
 * Checks if a finding has an established, specific deadline
 */
export function hasEstablishedDeadline(finding: Finding): boolean {
  if (!finding.timingStatus) return false;
  const timing = finding.timingStatus.toLowerCase();
  if (timing.includes('no deadline established') || timing.includes('not establish')) {
    return false;
  }
  return true;
}

/**
 * Determines whether a given finding matches a specific topic tab
 */
export function matchesTopic(finding: Finding, topicId: TopicTabId): boolean {
  if (topicId === 'all') return true;

  const content = [
    finding.title,
    finding.explanation,
    finding.timingStatus || '',
    finding.evidence.rawMessage,
  ].join(' ').toLowerCase();

  switch (topicId) {
    case 'register':
      // Registration, forms, sign-ups, account creations, surveys
      return (
        content.includes('register') ||
        content.includes('registration') ||
        content.includes('sign up') ||
        content.includes('signup') ||
        content.includes('form') ||
        content.includes('survey') ||
        content.includes('fetch.ai') ||
        content.includes('account') ||
        content.includes('attendance') ||
        content.includes('enrollment') ||
        (finding.links?.some((l) => l.kind === 'form' || l.url.includes('forms') || l.url.includes('form')) ?? false)
      );

    case 'assignments':
      // Assignments, tasks, deliverables, code, decks, deliverables
      return (
        content.includes('assignment') ||
        content.includes('homework') ||
        content.includes('hw') ||
        content.includes('deliverable') ||
        content.includes('task') ||
        content.includes('working on it') ||
        content.includes('slide deck') ||
        content.includes('deck') ||
        content.includes('contractor budget') ||
        content.includes('lab 4')
      );

    case 'homework':
      return (
        content.includes('homework') ||
        content.includes('hw') ||
        content.includes('problem set') ||
        content.includes('exercise') ||
        content.includes('reading')
      );

    case 'classes':
      // Classes, lectures, sessions, workshops, office hours, review sessions, meetings
      return (
        content.includes('class') ||
        content.includes('lecture') ||
        content.includes('session') ||
        content.includes('workshop') ||
        content.includes('office hour') ||
        content.includes('meet.google') ||
        content.includes('zoom') ||
        content.includes('review session') ||
        content.includes('presentation') ||
        content.includes('exam')
      );

    case 'deadlines':
      // Items with explicit deadlines or time-bound constraints
      if (hasEstablishedDeadline(finding)) return true;
      // If timingStatus is explicitly 'No deadline established', do not match
      if (finding.timingStatus && (
        finding.timingStatus.toLowerCase().includes('no deadline') ||
        finding.timingStatus.toLowerCase().includes('not establish')
      )) {
        return false;
      }
      return /\b(due by|cutoff|vote by|deadline is|before \d{1,2}(?::\d{2})?\s*(?:am|pm)?|by \d{1,2}(?::\d{2})?\s*(?:am|pm)?|by today|by tomorrow|by friday)\b/i.test(content);

    case 'decisions':
      return (
        !!finding.earlierConflict ||
        content.includes('decision') ||
        content.includes('rescheduled') ||
        content.includes('moved to') ||
        content.includes('postponed') ||
        content.includes('approved')
      );

    case 'announcements':
      return (
        content.includes('announcement') ||
        content.includes('hiring') ||
        content.includes('internship') ||
        content.includes('wi-fi') ||
        content.includes('wifi') ||
        content.includes('monitors') ||
        content.includes('notice') ||
        content.includes('fyi')
      );

    default:
      return true;
  }
}

/**
 * Derives the active list of topic tabs from actual results.
 * Only returns tabs that have at least 1 matching finding, ensuring accurate counts.
 */
export function getTopicTabs(findings: Finding[]): TopicTab[] {
  const tabs: TopicTab[] = [
    {
      id: 'all',
      label: 'All',
      count: findings.length,
    },
  ];

  for (const cfg of TOPIC_CONFIG) {
    const matchingCount = findings.filter((f) => matchesTopic(f, cfg.id)).length;
    if (matchingCount > 0) {
      tabs.push({
        id: cfg.id,
        label: cfg.label,
        count: matchingCount,
      });
    }
  }

  return tabs;
}

/**
 * Filter findings by search keyword across title, explanation, sender, and links
 */
export function filterFindingsBySearch(findings: Finding[], query: string): Finding[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return findings;

  return findings.filter((f) => {
    const searchString = [
      f.title,
      f.explanation,
      f.timingStatus || '',
      f.evidence.sender,
      f.evidence.rawMessage,
      ...(f.links?.map((l) => `${l.label} ${l.url}`) || []),
    ].join(' ').toLowerCase();

    return searchString.includes(trimmed);
  });
}

/**
 * Combined filter: topic tab + search keyword
 */
export function filterFindings(
  findings: Finding[],
  topicId: TopicTabId,
  searchQuery: string
): Finding[] {
  let result = findings;

  if (topicId !== 'all') {
    result = result.filter((f) => matchesTopic(f, topicId));
  }

  if (searchQuery.trim()) {
    result = filterFindingsBySearch(result, searchQuery);
  }

  return result;
}
