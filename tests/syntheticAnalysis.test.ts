import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseConversation } from '../src/utils/whatsappParser';
import { analyzeConversationStrict } from '../src/utils/relevanceClassifier';
import { SYNTHETIC_SAMPLES } from '../src/data/samples';
import { getTopicTabs, filterFindings } from '../src/utils/filterTopics';

describe('End-to-End Analysis & Quick-Access Tabs on Synthetic Samples', () => {
  it('Sample 1: Day 1 Feedback Form & Multi-Link Actions', () => {
    const sample = SYNTHETIC_SAMPLES.find(s => s.id === 'feedback-and-links')!;
    const parseResult = parseConversation(sample.transcript);
    const analysis = analyzeConversationStrict(parseResult.messages);

    assert.ok(analysis.findings.length > 0);
    const tabs = getTopicTabs(analysis.findings);
    
    // Must contain 'All' and 'Register' (for Feedback form)
    assert.strictEqual(tabs[0].id, 'all');
    const registerTab = tabs.find(t => t.id === 'register');
    assert.ok(registerTab, 'Register tab should be present for feedback form');
    assert.ok(registerTab.count >= 1);

    // Filtering by Register should return the feedback form
    const registerItems = filterFindings(analysis.findings, 'register', '');
    assert.ok(registerItems.some(f => f.title.toLowerCase().includes('feedback form')));
  });

  it('Sample 2: WhatsApp Joins & Hackathon Task', () => {
    const sample = SYNTHETIC_SAMPLES.find(s => s.id === 'whatsapp-joins-and-event')!;
    const parseResult = parseConversation(sample.transcript);
    const analysis = analyzeConversationStrict(parseResult.messages);

    // WhatsApp join notifications must not pollute findings
    const joinFindings = analysis.findings.filter(f => f.title.toLowerCase().includes('joined using'));
    assert.strictEqual(joinFindings.length, 0);

    const tabs = getTopicTabs(analysis.findings);
    const registerTab = tabs.find(t => t.id === 'register');
    assert.ok(registerTab, 'Register tab should exist for Fetch.ai account creation');

    const deadlineTab = tabs.find(t => t.id === 'deadlines');
    assert.ok(deadlineTab, 'Deadlines tab should exist for 6:00 PM today deadline');
  });

  it('Sample 3: Recruitment Ads, Email Reminder & Poll', () => {
    const sample = SYNTHETIC_SAMPLES.find(s => s.id === 'ad-vs-reminder-poll')!;
    const parseResult = parseConversation(sample.transcript);
    const analysis = analyzeConversationStrict(parseResult.messages);

    const tabs = getTopicTabs(analysis.findings);
    
    // Register tab for college email ID exam registration
    const registerTab = tabs.find(t => t.id === 'register');
    assert.ok(registerTab);

    // Assignments tab for Assignment 3
    const assignmentsTab = tabs.find(t => t.id === 'assignments');
    assert.ok(assignmentsTab);

    // Deadlines tab for same-day deadlines
    const deadlinesTab = tabs.find(t => t.id === 'deadlines');
    assert.ok(deadlinesTab);

    // Test that clicking Assignments returns the task item
    const assignmentsItems = filterFindings(analysis.findings, 'assignments', '');
    assert.ok(assignmentsItems.length > 0);
    assert.ok(assignmentsItems.some(f => f.explanation.toLowerCase().includes('task') || f.title.toLowerCase().includes('assignment')));
  });

  it('Sample 4: Genuine Changed Decision vs Unrelated Messages', () => {
    const sample = SYNTHETIC_SAMPLES.find(s => s.id === 'genuine-changed-decision')!;
    const parseResult = parseConversation(sample.transcript);
    const analysis = analyzeConversationStrict(parseResult.messages);

    const tabs = getTopicTabs(analysis.findings);
    const decisionsTab = tabs.find(t => t.id === 'decisions');
    assert.ok(decisionsTab, 'Decisions tab should capture rescheduled presentation');

    const classesTab = tabs.find(t => t.id === 'classes');
    assert.ok(classesTab, 'Classes / meetings tab should capture presentation meeting');
  });
});
