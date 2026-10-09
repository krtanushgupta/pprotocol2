import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Clock, 
  Terminal, 
  User,
  GitCompare,
  ExternalLink,
  Flame,
  AlertTriangle,
  Info,
  Search,
  X,
  ArrowUp,
  Layers,
  CheckCheck
} from 'lucide-react';
import { UnmissedAnalysis, Finding, PriorityLevel } from '../types';
import { 
  TopicTabId, 
  getTopicTabs, 
  filterFindings 
} from '../utils/filterTopics';

interface ResultsScreenProps {
  analysis: UnmissedAnalysis;
  onReset: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  analysis,
  onReset,
}) => {
  // Navigation & filter states
  const [selectedTopic, setSelectedTopic] = useState<TopicTabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [viewDensity, setViewDensity] = useState<'detailed' | 'compact'>('detailed');
  
  // Section collapsible states
  const [collapsedSections, setCollapsedSections] = useState<Record<PriorityLevel, boolean>>({
    URGENT: false,
    IMPORTANT: false,
    FYI: false,
  });

  // Scroll to top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Calculate dynamic topic tabs derived from actual results
  const topicTabs = useMemo(() => {
    return getTopicTabs(analysis.findings);
  }, [analysis.findings]);

  // If the active tab no longer exists after changes, fallback to 'all'
  useEffect(() => {
    if (selectedTopic !== 'all' && !topicTabs.some((t) => t.id === selectedTopic)) {
      setSelectedTopic('all');
    }
  }, [topicTabs, selectedTopic]);

  // 2. Filter findings based on active tab and search query
  const filteredFindings = useMemo(() => {
    return filterFindings(analysis.findings, selectedTopic, searchQuery);
  }, [analysis.findings, selectedTopic, searchQuery]);

  // 3. Group filtered findings into exactly three categories
  const urgentFindings = useMemo(
    () => filteredFindings.filter((f) => f.priority === 'URGENT'),
    [filteredFindings]
  );
  const importantFindings = useMemo(
    () => filteredFindings.filter((f) => f.priority === 'IMPORTANT'),
    [filteredFindings]
  );
  const fyiFindings = useMemo(
    () => filteredFindings.filter((f) => f.priority === 'FYI'),
    [filteredFindings]
  );

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const allIds: Record<string, boolean> = {};
    filteredFindings.forEach((f) => {
      allIds[f.id] = true;
    });
    setExpandedFindings(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedFindings({});
  };

  const toggleSectionCollapse = (section: PriorityLevel) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCopyQuote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllFindings = () => {
    const formatted = filteredFindings.map((f, i) => {
      const timing = f.timingStatus ? ` [${f.timingStatus}]` : '';
      return `${i + 1}. [${f.priority}] ${f.title}${timing}\n   ${f.explanation}\n   Source (${f.evidence.sender}): "${f.evidence.rawMessage.trim()}"`;
    }).join('\n\n');

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const allExpanded = 
    filteredFindings.length > 0 && 
    filteredFindings.every((f) => expandedFindings[f.id]);

  // Ensure overview is rendered as strict bullet points (2–4 bullets)
  const overviewBullets = useMemo(() => {
    if (analysis.overviewBullets && analysis.overviewBullets.length > 0) {
      return analysis.overviewBullets;
    }
    if (analysis.overview) {
      return analysis.overview
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15);
    }
    return [
      'Conversation overview processed.',
      'No critical blockers or immediate deadlines were identified.'
    ];
  }, [analysis]);

  const hasActiveFilters = selectedTopic !== 'all' || searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedTopic('all');
    setSearchQuery('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-7 animate-in fade-in duration-150 pb-20 px-4 sm:px-6 pt-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[#303139] pb-4">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#B7BBC4] hover:text-[#FF5260] transition-colors cursor-pointer group font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#FF2638]" />
          <span>Analyze another conversation</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-[#9AA0AA] font-mono">
          <span className="text-[#F4F5F7]">{analysis.totalMessagesProcessed} messages</span>
          <span className="text-[#303139]">/</span>
          <span>{analysis.analyzedAt}</span>
        </div>
      </div>

      {/* 1. Bulleted Conversation Overview */}
      <section className="bg-[#121419] border border-[#303139] rounded-xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.35)] space-y-3 relative overflow-hidden">
        {/* Subtle top crimson rule */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF2638] to-transparent opacity-75" />

        <div className="flex items-center gap-2 text-xs font-semibold text-[#FF2638] tracking-widest uppercase font-mono">
          <Terminal className="w-3.5 h-3.5 text-[#FF2638]" />
          <span>Conversation Overview</span>
        </div>

        <ul className="space-y-2.5 text-xs sm:text-sm text-[#F4F5F7] leading-relaxed">
          {overviewBullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-none rotate-45 bg-[#FF2638] mt-2 shrink-0 shadow-[0_0_6px_rgba(255,38,56,0.6)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {analysis.limitationsNote && (
          <p className="text-[11px] text-[#9AA0AA] italic pt-2 border-t border-[#303139]">
            {analysis.limitationsNote}
          </p>
        )}
      </section>

      {/* FILTER & LONG LIST NAVIGATION SECTION */}
      <div className="space-y-3 pt-2">
        {/* Section Title & Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base sm:text-lg font-bold text-[#F4F5F7] tracking-tight font-display flex items-center gap-2">
            <span>WHAT NEEDS YOUR ATTENTION?</span>
          </h2>

          <div className="flex items-center gap-2">
            {/* Copy All Button */}
            <button
              onClick={handleCopyAllFindings}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#B7BBC4] hover:text-[#FF5260] bg-[#121419] hover:bg-[#191B21] border border-[#303139] px-2.5 py-1 rounded transition-colors cursor-pointer"
              title="Copy filtered findings to clipboard"
            >
              {copiedAll ? <CheckCheck className="w-3 h-3 text-[#FF2638]" /> : <Copy className="w-3 h-3 text-[#9AA0AA]" />}
              <span>{copiedAll ? 'Copied summary' : 'Copy summary'}</span>
            </button>

            {/* View Density Switcher */}
            <div className="inline-flex items-center p-0.5 bg-[#121419] border border-[#303139] rounded font-mono text-[11px]">
              <button
                onClick={() => setViewDensity('detailed')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  viewDensity === 'detailed'
                    ? 'bg-[#191B21] text-[#F4F5F7] font-semibold'
                    : 'text-[#9AA0AA] hover:text-[#B7BBC4]'
                }`}
                title="Detailed cards view"
              >
                Detailed
              </button>
              <button
                onClick={() => setViewDensity('compact')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  viewDensity === 'compact'
                    ? 'bg-[#191B21] text-[#FF5260] font-semibold'
                    : 'text-[#9AA0AA] hover:text-[#B7BBC4]'
                }`}
                title="Compact high-density view for long lists"
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* 1. COMPACT QUICK-ACCESS TABS ROW */}
        {/* Horizontally scrollable row with crimson active highlight, restrained transitions, and count badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none font-mono text-xs scroll-smooth">
          {topicTabs.map((tab) => {
            const isActive = selectedTopic === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTopic(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium shrink-0 transition-all duration-200 ease-out cursor-pointer select-none text-xs active:scale-95 ${
                  isActive
                    ? 'bg-[#FF2638] text-white shadow-[0_0_14px_rgba(255,38,56,0.4)] font-semibold scale-[1.02]'
                    : 'bg-[#121419] hover:bg-[#191B21] text-[#B7BBC4] hover:text-[#F4F5F7] border border-[#303139] hover:border-[#FF2638]/40'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full transition-colors duration-200 ${
                    isActive
                      ? 'bg-black/25 text-white'
                      : 'bg-[#191B21] text-[#9AA0AA] border border-[#303139]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. INSTANT SEARCH & FILTER BAR */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#9AA0AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings, senders, links, or deadlines..."
              className="w-full bg-[#121419] text-[#F4F5F7] placeholder-[#9AA0AA]/60 text-xs font-mono pl-8 pr-8 py-2 rounded-lg border border-[#303139] focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA0AA] hover:text-[#F4F5F7] p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Expand / Collapse All Sources Trigger */}
          {filteredFindings.length > 0 && viewDensity === 'detailed' && (
            <button
              onClick={allExpanded ? handleCollapseAll : handleExpandAll}
              className="text-xs font-mono font-medium text-[#B7BBC4] hover:text-[#FF5260] bg-[#121419] hover:bg-[#191B21] border border-[#303139] px-2.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {allExpanded ? 'Collapse sources' : 'Expand sources'}
            </button>
          )}
        </div>

        {/* Filter status & Section Jump Anchors */}
        <div className="flex items-center justify-between text-xs font-mono text-[#9AA0AA] pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredFindings.length} of {analysis.findings.length} items
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[#FF5260] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Quick Jump Anchors for Long Lists */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#9AA0AA]/60">Jump to:</span>
            <a
              href="#section-urgent"
              className="hover:text-[#FF5260] transition-colors inline-flex items-center gap-1 text-[#FF2638]"
            >
              <span>Urgent</span>
              <span className="text-[10px]">({urgentFindings.length})</span>
            </a>
            <span className="text-[#303139]">·</span>
            <a
              href="#section-important"
              className="hover:text-[#FF5260] transition-colors inline-flex items-center gap-1 text-[#E5B454]"
            >
              <span>Important</span>
              <span className="text-[10px]">({importantFindings.length})</span>
            </a>
            <span className="text-[#303139]">·</span>
            <a
              href="#section-fyi"
              className="hover:text-[#FF5260] transition-colors inline-flex items-center gap-1 text-[#9AA0AA]"
            >
              <span>FYI</span>
              <span className="text-[10px]">({fyiFindings.length})</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. THE THREE PRIORITY SECTIONS: URGENT, IMPORTANT, FYI */}
      <div className="space-y-6">
        {/* Category 1: URGENT (Vivid Crimson #FF2638 Accent) */}
        <section id="section-urgent" className="space-y-3 scroll-mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleSectionCollapse('URGENT')}
              className="flex items-center gap-2 group cursor-pointer select-none"
              title="Click to collapse or expand Urgent section"
              aria-expanded={!collapsedSections.URGENT}
            >
              <span className="w-2 h-2 rounded-none rotate-45 bg-[#FF2638] shadow-[0_0_8px_rgba(255,38,56,0.8)] transition-transform duration-200 group-hover:scale-110" />
              <h3 className="text-xs font-bold text-[#FF2638] uppercase tracking-wider font-mono flex items-center gap-1.5 group-hover:text-[#FF5260] transition-colors">
                <Flame className="w-3.5 h-3.5" />
                <span>Urgent</span>
              </h3>
              <span className="text-[10px] font-mono font-medium text-[#FF2638] bg-[#FF2638]/10 px-2 py-0.5 border border-[#FF2638]/30 transition-colors">
                Action Required
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#9AA0AA] group-hover:text-[#FF5260] transition-transform duration-250 ease-out ${
                  collapsedSections.URGENT ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
            <span className="text-xs font-mono text-[#9AA0AA]">
              {urgentFindings.length} {urgentFindings.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              collapsedSections.URGENT ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden space-y-2.5">
              {urgentFindings.length === 0 ? (
                <div className="bg-[#121419] border border-[#303139] rounded-lg p-3.5 text-xs text-[#9AA0AA] italic">
                  {hasActiveFilters
                    ? 'No urgent items match the active topic or search filter.'
                    : 'No urgent items identified in the supplied conversation.'}
                </div>
              ) : (
                <div className={viewDensity === 'compact' ? 'space-y-1.5' : 'space-y-2.5'}>
                  {urgentFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      isExpanded={!!expandedFindings[finding.id]}
                      onToggleExpand={() => toggleExpand(finding.id)}
                      onCopy={() => handleCopyQuote(finding.id, finding.evidence.rawMessage)}
                      isCopied={copiedId === finding.id}
                      categoryType="URGENT"
                      density={viewDensity}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Category 2: IMPORTANT (Muted Amber #E5B454 Accent) */}
        <section id="section-important" className="space-y-3 scroll-mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleSectionCollapse('IMPORTANT')}
              className="flex items-center gap-2 group cursor-pointer select-none"
              title="Click to collapse or expand Important section"
              aria-expanded={!collapsedSections.IMPORTANT}
            >
              <span className="w-2 h-2 rounded-none rotate-45 bg-[#E5B454] shadow-[0_0_8px_rgba(229,180,84,0.6)] transition-transform duration-200 group-hover:scale-110" />
              <h3 className="text-xs font-bold text-[#E5B454] uppercase tracking-wider font-mono flex items-center gap-1.5 group-hover:text-[#F3C872] transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Important</span>
              </h3>
              <span className="text-[10px] font-mono font-medium text-[#E5B454] bg-[#E5B454]/10 px-2 py-0.5 border border-[#E5B454]/30 transition-colors">
                Decisions & Tasks
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#9AA0AA] group-hover:text-[#E5B454] transition-transform duration-250 ease-out ${
                  collapsedSections.IMPORTANT ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
            <span className="text-xs font-mono text-[#9AA0AA]">
              {importantFindings.length} {importantFindings.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              collapsedSections.IMPORTANT ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden space-y-2.5">
              {importantFindings.length === 0 ? (
                <div className="bg-[#121419] border border-[#303139] rounded-lg p-3.5 text-xs text-[#9AA0AA] italic">
                  {hasActiveFilters
                    ? 'No important items match the active topic or search filter.'
                    : 'No important items identified in the supplied conversation.'}
                </div>
              ) : (
                <div className={viewDensity === 'compact' ? 'space-y-1.5' : 'space-y-2.5'}>
                  {importantFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      isExpanded={!!expandedFindings[finding.id]}
                      onToggleExpand={() => toggleExpand(finding.id)}
                      onCopy={() => handleCopyQuote(finding.id, finding.evidence.rawMessage)}
                      isCopied={copiedId === finding.id}
                      categoryType="IMPORTANT"
                      density={viewDensity}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Category 3: FYI (Cool Gray #9AA0AA Accent) */}
        <section id="section-fyi" className="space-y-3 scroll-mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleSectionCollapse('FYI')}
              className="flex items-center gap-2 group cursor-pointer select-none"
              title="Click to collapse or expand FYI section"
              aria-expanded={!collapsedSections.FYI}
            >
              <span className="w-2 h-2 rounded-none rotate-45 bg-[#9AA0AA] transition-transform duration-200 group-hover:scale-110" />
              <h3 className="text-xs font-bold text-[#9AA0AA] uppercase tracking-wider font-mono flex items-center gap-1.5 group-hover:text-[#F4F5F7] transition-colors">
                <Info className="w-3.5 h-3.5" />
                <span>FYI</span>
              </h3>
              <span className="text-[10px] font-mono font-medium text-[#9AA0AA] bg-[#9AA0AA]/10 px-2 py-0.5 border border-[#9AA0AA]/30 transition-colors">
                Context & Notices
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#9AA0AA] group-hover:text-[#F4F5F7] transition-transform duration-250 ease-out ${
                  collapsedSections.FYI ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
            <span className="text-xs font-mono text-[#9AA0AA]">
              {fyiFindings.length} {fyiFindings.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              collapsedSections.FYI ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden space-y-2.5">
              {fyiFindings.length === 0 ? (
                <div className="bg-[#121419] border border-[#303139] rounded-lg p-3.5 text-xs text-[#9AA0AA] italic">
                  {hasActiveFilters
                    ? 'No FYI items match the active topic or search filter.'
                    : 'No FYI items identified in the supplied conversation.'}
                </div>
              ) : (
                <div className={viewDensity === 'compact' ? 'space-y-1.5' : 'space-y-2.5'}>
                  {fyiFindings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      isExpanded={!!expandedFindings[finding.id]}
                      onToggleExpand={() => toggleExpand(finding.id)}
                      onCopy={() => handleCopyQuote(finding.id, finding.evidence.rawMessage)}
                      isCopied={copiedId === finding.id}
                      categoryType="FYI"
                      density={viewDensity}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 bg-[#121419] hover:bg-[#FF2638] text-[#F4F5F7] hover:text-white border border-[#303139] hover:border-[#FF2638] p-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
          title="Back to top"
          aria-label="Back to top"
        >
          <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Bottom Actions */}
      <div className="mt-12 pt-6 border-t border-[#303139] flex items-center justify-between">
        <button
          onClick={onReset}
          className="bg-[#191B21] hover:bg-[#20222A] text-[#F4F5F7] hover:text-[#FF5260] border border-[#303139] hover:border-[#FF2638]/50 font-medium text-xs py-2 px-3.5 rounded-lg transition-colors cursor-pointer shadow-sm font-mono"
        >
          Analyze another conversation
        </button>

        <span className="text-xs font-mono text-[#9AA0AA]">
          {analysis.totalMessagesProcessed} total messages
        </span>
      </div>
    </div>
  );
};

interface FindingCardProps {
  finding: Finding;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
  isCopied: boolean;
  categoryType: 'URGENT' | 'IMPORTANT' | 'FYI';
  density?: 'detailed' | 'compact';
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isExpanded,
  onToggleExpand,
  onCopy,
  isCopied,
  categoryType,
  density = 'detailed',
}) => {
  // Border accents according to priority in Crimson Protocol
  const borderAccents = {
    URGENT: 'border-l-[3px] border-l-[#FF2638]',
    IMPORTANT: 'border-l-[3px] border-l-[#E5B454]',
    FYI: 'border-l-[3px] border-l-[#9AA0AA]',
  };

  const badgeStyles = {
    URGENT: 'bg-[#FF2638]/15 text-[#FF2638] border-[#FF2638]/30',
    IMPORTANT: 'bg-[#E5B454]/15 text-[#E5B454] border-[#E5B454]/30',
    FYI: 'bg-[#9AA0AA]/15 text-[#9AA0AA] border-[#9AA0AA]/30',
  };

  const bulletColors = {
    URGENT: 'bg-[#FF2638] shadow-[0_0_6px_rgba(255,38,56,0.6)]',
    IMPORTANT: 'bg-[#E5B454] shadow-[0_0_6px_rgba(229,180,84,0.5)]',
    FYI: 'bg-[#9AA0AA]',
  };

  const hasSpecificDeadline = 
    finding.timingStatus && 
    finding.timingStatus.toLowerCase() !== 'no deadline established' && 
    !finding.timingStatus.toLowerCase().includes('not establish');

  // COMPACT MODE: Condensed scan row for long result lists
  if (density === 'compact') {
    return (
      <div className={`bg-[#121419] border border-[#303139] ${borderAccents[categoryType]} rounded-lg p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-1.5 h-1.5 rounded-none rotate-45 ${bulletColors[categoryType]} shrink-0`} />
            <h4 className="text-xs font-semibold text-[#F4F5F7] truncate">
              {finding.title}
            </h4>
            {hasSpecificDeadline && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#FF5260] bg-[#191B21] border border-[#303139] px-1.5 py-0.2 rounded shrink-0">
                <Clock className="w-2.5 h-2.5 text-[#FF2638]" />
                <span>{finding.timingStatus}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {finding.links && finding.links.length > 0 && (
              <a
                href={finding.links[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-[#FF5260] hover:text-white bg-[#FF2638]/10 hover:bg-[#FF2638]/25 border border-[#FF2638]/40 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                title={finding.links[0].label}
              >
                <span>Link</span>
                <ExternalLink className="w-2.5 h-2.5 text-[#FF2638]" />
              </a>
            )}

            <button
              onClick={onToggleExpand}
              className="text-[#9AA0AA] hover:text-[#FF5260] p-1 cursor-pointer transition-colors"
              title={isExpanded ? 'Hide source message' : 'View source message'}
              aria-expanded={isExpanded}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-250 ease-out ${
                  isExpanded ? 'rotate-180 text-[#FF2638]' : 'rotate-0 text-[#9AA0AA]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Verbatim Source Container in Compact Mode with smooth height & opacity transition */}
        <div
          className={`grid transition-all duration-250 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2 border-t border-[#303139] bg-[#08090B] border border-[#303139] hover:border-[#FF2638]/40 transition-colors duration-200 rounded p-2.5 text-xs font-mono space-y-1">
              <p className="text-xs text-[#B7BBC4] mb-2 leading-relaxed font-sans">
                {finding.explanation}
              </p>
              <div className="flex items-center justify-between text-[10px] text-[#9AA0AA] pb-1 border-b border-[#303139]">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-[#FF2638]" />
                  <span className="text-[#F4F5F7]">{finding.evidence.sender}</span>
                  {finding.evidence.timestamp && <span>· {finding.evidence.timestamp}</span>}
                </div>
                <button
                  onClick={onCopy}
                  className="text-[10px] text-[#9AA0AA] hover:text-[#FF5260] cursor-pointer inline-flex items-center gap-1 transition-colors"
                >
                  {isCopied ? <Check className="w-3 h-3 text-[#FF2638]" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed break-words text-xs text-[#B7BBC4] pt-1">
                {finding.evidence.rawMessage}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DETAILED MODE: Standard rich card layout
  return (
    <div className={`bg-[#121419] border border-[#303139] hover:border-[#303139] hover:shadow-[0_4px_16px_rgba(255,38,56,0.06)] ${borderAccents[categoryType]} rounded-lg p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-200`}>
      {/* Header Tag and Timing */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap font-mono">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${badgeStyles[categoryType]}`}>
            {categoryType}
          </span>

          {hasSpecificDeadline ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F4F5F7] bg-[#191B21] border border-[#303139] px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 text-[#FF2638]" />
              <span>{finding.timingStatus}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-[#9AA0AA] bg-[#191B21] px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 text-[#9AA0AA]/60" />
              <span>No deadline established</span>
            </span>
          )}
        </div>
      </div>

      {/* Bulleted Finding Title */}
      <div className="flex items-start gap-2 pt-0.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-none rotate-45 ${bulletColors[categoryType]} shrink-0 mt-2`} />
        <h4 className="text-sm font-semibold text-[#F4F5F7] leading-snug">
          {finding.title}
        </h4>
      </div>

      {/* Compact 1-2 sentence explanation */}
      <p className="text-xs text-[#B7BBC4] leading-relaxed pl-3.5 mb-2.5">
        {finding.explanation}
      </p>

      {/* Clickable Action Links (Extracted from source message) */}
      {finding.links && finding.links.length > 0 && (
        <div className="pl-3.5 mb-3 flex flex-wrap gap-2">
          {finding.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#FF5260] hover:text-white bg-[#FF2638]/10 hover:bg-[#FF2638]/25 border border-[#FF2638]/40 px-2.5 py-1 rounded transition-colors cursor-pointer group"
              title={link.url}
            >
              <span>{link.label}</span>
              <ExternalLink className="w-3 h-3 text-[#FF2638] group-hover:translate-x-0.5 transition-transform" />
            </a>
          ))}
        </div>
      )}

      {/* Earlier Conflict Notice if info changed */}
      {finding.earlierConflict && (
        <div className="bg-[#191B21] border-l-2 border-[#E5B454] p-2.5 rounded-r my-2 text-xs ml-3.5">
          <div className="flex items-center gap-1.5 font-medium text-[#E5B454] text-[11px] mb-0.5 font-mono">
            <GitCompare className="w-3.5 h-3.5 text-[#E5B454]" />
            <span>Previous plan ({finding.earlierConflict.priorSender}):</span>
          </div>
          <div className="text-[#9AA0AA] italic text-[11px] mb-1 pl-3 border-l border-[#303139]">
            &ldquo;{finding.earlierConflict.priorQuote}&rdquo;
          </div>
          <div className="text-[11px] text-[#B7BBC4] pl-3">
            Note: {finding.earlierConflict.resolutionNote}
          </div>
        </div>
      )}

      {/* Understated Source Message Trigger */}
      <div className="pt-2 border-t border-[#303139] flex items-center justify-between">
        <button
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#B7BBC4] hover:text-[#FF5260] transition-colors cursor-pointer py-0.5 group"
        >
          <span className="group-hover:underline">
            {isExpanded ? 'Hide source message' : 'View source message'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#9AA0AA] group-hover:text-[#FF2638] transition-transform duration-250 ease-out ${
              isExpanded ? 'rotate-180 text-[#FF2638]' : 'rotate-0'
            }`}
          />
        </button>

        <span className="text-[11px] font-mono text-[#9AA0AA]">
          {finding.evidence.sender} {finding.evidence.timestamp ? `· ${finding.evidence.timestamp}` : ''}
        </span>
      </div>

      {/* Verbatim Source Container with smooth height & opacity transition */}
      <div
        className={`grid transition-all duration-250 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2.5' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="bg-[#08090B] border border-[#303139] hover:border-[#FF2638]/40 transition-colors duration-200 rounded-md p-3 text-xs font-mono-clean text-[#F4F5F7] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#9AA0AA] pb-1 border-b border-[#303139]">
              <div className="flex items-center gap-1.5 font-mono font-medium">
                <User className="w-3 h-3 text-[#FF2638]" />
                <span className="text-[#F4F5F7]">{finding.evidence.sender}</span>
                {finding.evidence.timestamp && (
                  <>
                    <span className="text-[#303139]">·</span>
                    <span>{finding.evidence.timestamp}</span>
                  </>
                )}
              </div>

              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#9AA0AA] hover:text-[#FF5260] cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#191B21] transition-colors"
                title="Copy original message"
              >
                {isCopied ? <Check className="w-3 h-3 text-[#FF2638]" /> : <Copy className="w-3 h-3 text-[#9AA0AA]" />}
                <span>{isCopied ? 'Copied' : 'Copy message'}</span>
              </button>
            </div>

            <div className="whitespace-pre-wrap leading-relaxed break-words font-mono-clean text-xs text-[#B7BBC4] pt-0.5">
              {finding.evidence.rawMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
