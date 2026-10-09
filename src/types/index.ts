export type PriorityLevel = 'URGENT' | 'IMPORTANT' | 'FYI';

export interface SourceEvidence {
  rawMessage: string;
  sender: string;
  timestamp: string;
  messageIndex?: number;
}

export interface FindingActionLink {
  url: string;
  label: string;
  kind?: 'form' | 'doc' | 'meeting' | 'generic';
}

export interface Finding {
  id: string;
  priority: PriorityLevel;
  title: string;
  explanation: string;
  evidence: SourceEvidence;
  links?: FindingActionLink[];
  earlierConflict?: {
    priorClaim: string;
    priorSender: string;
    priorTimestamp: string;
    priorQuote: string;
    resolutionNote: string;
  };
  isInferred?: boolean;
  timingStatus?: string;
}

export interface UnmissedAnalysis {
  overview: string; // Plain summary string if needed
  overviewBullets: string[]; // Strict bullet points describing main topic, decisions, actions
  findings: Finding[];
  totalMessagesProcessed: number;
  hasActionableContent: boolean;
  limitationsNote?: string;
  analyzedAt: string;
  processingMode?: 'local_on_device' | 'cloud_gemini';
}

export interface SyntheticSample {
  id: string;
  name: string;
  scenarioTag: string;
  description: string;
  transcript: string;
}
