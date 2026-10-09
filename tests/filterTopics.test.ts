import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  matchesTopic, 
  getTopicTabs, 
  filterFindings, 
  filterFindingsBySearch,
  hasEstablishedDeadline 
} from '../src/utils/filterTopics';
import { Finding } from '../src/types';

describe('filterTopics & Quick-Access Tabs', () => {
  const mockFindings: Finding[] = [
    {
      id: 'f-1',
      priority: 'URGENT',
      title: 'Complete the Day 1 feedback form',
      explanation: 'Fill out the feedback form so organizers can improve Day 2.',
      timingStatus: 'Today by 6:00 PM',
      isInferred: false,
      links: [
        {
          url: 'https://docs.google.com/forms/d/e/123/viewform',
          label: 'Day 1 Feedback Form',
          kind: 'form'
        }
      ],
      evidence: {
        rawMessage: 'Please fill out the feedback form: https://docs.google.com/forms/d/e/123/viewform',
        sender: 'Session Lead',
        timestamp: '17:30'
      }
    },
    {
      id: 'f-2',
      priority: 'IMPORTANT',
      title: 'Status update: Assignment 3 in progress',
      explanation: 'Maya reported working on Assignment 3.',
      timingStatus: 'No deadline established',
      isInferred: false,
      evidence: {
        rawMessage: 'Working on assignment 3 now.',
        sender: 'Maya',
        timestamp: '11:25'
      }
    },
    {
      id: 'f-3',
      priority: 'URGENT',
      title: 'Register Fetch.ai developer account and upload confirmation',
      explanation: 'Organizer Dave requested participants to register account on Fetch.ai.',
      timingStatus: 'Today by 6:00 PM',
      links: [
        {
          url: 'https://forms.gle/HackathonFetch2024',
          label: 'Google Form',
          kind: 'form'
        }
      ],
      evidence: {
        rawMessage: 'Please make sure to register your Fetch.ai developer account by 6:00 PM today: https://forms.gle/HackathonFetch2024',
        sender: 'Organizer Dave',
        timestamp: '10:30'
      }
    },
    {
      id: 'f-4',
      priority: 'IMPORTANT',
      title: 'Vote on review session schedule poll',
      explanation: 'Class Rep posted a poll asking students to vote on session schedule.',
      timingStatus: 'Today by 5:00 PM',
      evidence: {
        rawMessage: 'Poll: Which day works best for our review session? Please vote by 5:00 PM today.',
        sender: 'Class Rep',
        timestamp: '11:00'
      }
    },
    {
      id: 'f-5',
      priority: 'FYI',
      title: 'Job notice: Software Engineering internship opening',
      explanation: 'Campus Bot shared recruitment announcement.',
      timingStatus: 'No deadline established',
      evidence: {
        rawMessage: 'WE ARE HIRING! Summer 2025 Software Engineering Internships.',
        sender: 'Campus Bot',
        timestamp: '09:00'
      }
    }
  ];

  it('correctly matches Register items from forms and registrations', () => {
    assert.strictEqual(matchesTopic(mockFindings[0], 'register'), true); // Feedback Form
    assert.strictEqual(matchesTopic(mockFindings[2], 'register'), true); // Fetch.ai registration
    assert.strictEqual(matchesTopic(mockFindings[1], 'register'), false); // Assignment 3
  });

  it('correctly matches Assignments topic', () => {
    assert.strictEqual(matchesTopic(mockFindings[1], 'assignments'), true); // Assignment 3
    assert.strictEqual(matchesTopic(mockFindings[4], 'assignments'), false); // Job notice
  });

  it('correctly matches Deadlines topic for items with deadlines', () => {
    assert.strictEqual(matchesTopic(mockFindings[0], 'deadlines'), true); // Today by 6:00 PM
    assert.strictEqual(matchesTopic(mockFindings[2], 'deadlines'), true); // Today by 6:00 PM
    assert.strictEqual(matchesTopic(mockFindings[3], 'deadlines'), true); // Today by 5:00 PM
    assert.strictEqual(matchesTopic(mockFindings[1], 'deadlines'), false); // No deadline
    assert.strictEqual(matchesTopic(mockFindings[4], 'deadlines'), false); // No deadline
  });

  it('correctly matches Classes topic', () => {
    assert.strictEqual(matchesTopic(mockFindings[3], 'classes'), true); // review session
    assert.strictEqual(matchesTopic(mockFindings[4], 'classes'), false);
  });

  it('generates accurate tabs with counts derived from actual results', () => {
    const tabs = getTopicTabs(mockFindings);
    
    // Always has 'all' with total count
    assert.strictEqual(tabs[0].id, 'all');
    assert.strictEqual(tabs[0].count, 5);

    // Register tab should count mockFindings[0] and mockFindings[2]
    const registerTab = tabs.find(t => t.id === 'register');
    assert.ok(registerTab);
    assert.strictEqual(registerTab.count, 2);

    // Deadlines tab should count mockFindings[0], mockFindings[2], mockFindings[3]
    const deadlinesTab = tabs.find(t => t.id === 'deadlines');
    assert.ok(deadlinesTab);
    assert.strictEqual(deadlinesTab.count, 3);

    // Assignments tab should count mockFindings[1]
    const assignmentsTab = tabs.find(t => t.id === 'assignments');
    assert.ok(assignmentsTab);
    assert.strictEqual(assignmentsTab.count, 1);

    // Homework tab should not be present if count is 0
    const hwTab = tabs.find(t => t.id === 'homework');
    assert.strictEqual(hwTab, undefined);
  });

  it('filters findings by topic tab instantly without re-analysis', () => {
    const registerItems = filterFindings(mockFindings, 'register', '');
    assert.strictEqual(registerItems.length, 2);
    assert.ok(registerItems.every(f => f.id === 'f-1' || f.id === 'f-3'));

    const allItems = filterFindings(mockFindings, 'all', '');
    assert.strictEqual(allItems.length, 5);
  });

  it('filters findings by search query in real time', () => {
    const mayaItems = filterFindingsBySearch(mockFindings, 'Maya');
    assert.strictEqual(mayaItems.length, 1);
    assert.strictEqual(mayaItems[0].id, 'f-2');

    const formItems = filterFindingsBySearch(mockFindings, 'feedback');
    assert.strictEqual(formItems.length, 1);
    assert.strictEqual(formItems[0].id, 'f-1');
  });

  it('combines topic tab and search filtering smoothly', () => {
    // Under Register, search for 'Dave'
    const result = filterFindings(mockFindings, 'register', 'Dave');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'f-3');

    // Under Register, search for 'Maya' -> should return 0
    const emptyResult = filterFindings(mockFindings, 'register', 'Maya');
    assert.strictEqual(emptyResult.length, 0);
  });
});
