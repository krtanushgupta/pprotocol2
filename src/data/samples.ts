import { SyntheticSample } from '../types';

export const SYNTHETIC_SAMPLES: SyntheticSample[] = [
  {
    id: 'feedback-and-links',
    name: 'Day 1 Feedback Form & Multi-Link Actions',
    scenarioTag: 'GOOGLE FORMS + LINKS + TASKS',
    description: 'Real-world scenario with Day 1 Google Feedback Form, document link, and meeting URL, turning long messages into specific actionable headings.',
    transcript: `[24/10/24, 17:30:10] Session Lead: Hey everyone! 👋 Huge thanks to all of you for participating so actively in today's session! You brought fantastic energy, and it was great seeing everyone dive into Agentic AI.

To help us make Day 2 even better, please take a minute to fill out the Day 1 Feedback Form:
https://docs.google.com/forms/d/e/1FAIpQLSeSnC83-GUGYmsA9Ntybn9QRqJAPW4y4OFbEtI25VIYK9eg3g/viewform?usp=dialog

We really value your input and will use it to refine things for tomorrow!

We can't wait to see you all tomorrow for Day 2! Get ready for an exciting AI Scavenger Hunt with awesome goodies and prizes up for grabs!

[24/10/24, 17:35:45] Workshop Mentor: Also, here is the reference architecture document for tomorrow's lab: https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing

[24/10/24, 17:40:00] Session Lead: If anyone needs help before 9:00 AM tomorrow, join our morning office hours call: https://meet.google.com/abc-defg-hij`
  },
  {
    id: 'whatsapp-joins-and-event',
    name: 'WhatsApp Joins & Hackathon Task',
    scenarioTag: 'WHATSAPP JOINS + FETCH.AI REGISTRATION',
    description: 'WhatsApp membership join events excluded from findings, with an urgent Fetch.ai account task before 6:00 PM today.',
    transcript: `[22/10/24, 10:14:02] Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[22/10/24, 10:14:15] +1 (415) 555-0192 joined using this group's invite link
[22/10/24, 10:14:40] David K joined using this group's invite link
[22/10/24, 10:15:02] Priya Shah joined using this group's invite link
[22/10/24, 10:16:11] Liam Vance joined using this group's invite link
[22/10/24, 10:18:30] Maya Lin joined using this group's invite link
[22/10/24, 10:20:05] +44 7700 900123 joined using this group's invite link
[22/10/24, 10:22:18] Samira R joined using this group's invite link
[22/10/24, 10:25:44] Alex Chen joined using this group's invite link
[22/10/24, 10:30:00] Organizer Dave: <message_history_notice message="Pinned announcement">
[22/10/24, 10:30:15] Organizer Dave: Welcome everyone to the AI Hackathon! Please make sure to register your Fetch.ai developer account and upload confirmation through the Google Form by 6:00 PM today: https://forms.gle/HackathonFetch2024
[22/10/24, 10:31:00] Organizer Dave: <Media omitted>
[22/10/24, 10:45:10] Sarah: Does everyone on the team need to create an account or just the team lead?
[22/10/24, 10:48:22] Organizer Dave: Every team member must create an account and submit their screenshot.
[22/10/24, 11:15:00] Priya Shah: Done! Submitted my confirmation form.`
  },
  {
    id: 'ad-vs-reminder-poll',
    name: 'Recruitment Ads, Email Reminder & Poll',
    scenarioTag: 'RECRUITMENT AS FYI + ACTIONABLE REMINDER + POLL',
    description: 'Recruitment ads retained as FYI without inflating to urgent, while a same-day email submission and student poll are prioritized as actionable.',
    transcript: `[18/10/24, 09:00:15] Campus Bot: 🔥 WE ARE HIRING! Summer 2025 Software Engineering Internships. Stipend $35/hr. Limited seats. Apply at https://careers.example.com/intern-app-2025!
[18/10/24, 09:30:45] Prof. Miller: Attention students: Please provide your official college email ID to the teaching assistant by 4:00 PM today for exam registration.
[18/10/24, 10:15:20] Campus Bot: 🚀 UPDATE: New recruitment opening! Data Analyst Internship role added. Apply now at https://careers.example.com/intern-data-2025!
[18/10/24, 11:00:00] Class Rep: Poll: Which day works best for our review session? Please vote by 5:00 PM today.
[18/10/24, 11:20:10] Daniel: Has anyone started on assignment 3?
[18/10/24, 11:25:00] Maya: Working on it now.`
  },
  {
    id: 'genuine-changed-decision',
    name: 'Genuine Changed Decision vs Unrelated Messages',
    scenarioTag: 'CHANGED DECISION WITH DUAL EVIDENCE',
    description: 'A genuine changed schedule for a presentation with both earlier and later messages, plus two unrelated messages (lab monitors & wifi) that are NOT treated as a decision change.',
    transcript: `[19/10/24, 10:00:15] Marcus: Team, the client product presentation is scheduled for tomorrow at 2:00 PM in Conference Room A.
[19/10/24, 10:30:22] IT Support: Announcement: The new 27-inch monitors for Lab 4 have arrived and are being installed today.
[19/10/24, 11:15:00] IT Support: Reminder: The guest Wi-Fi password was rotated to LabGuest2024.
[19/10/24, 12:10:45] Marcus: DECISION: Client requested a morning slot. The client product presentation is moved to Friday at 10:00 AM.
[19/10/24, 12:12:00] Sarah: Acknowledged, updating the invite.`
  },
  {
    id: 'contradictory-deadlines',
    name: 'Contradictory / Unresolved Deadlines',
    scenarioTag: 'CONTRADICTORY STATEMENTS FLAGGED',
    description: 'Two team members provide conflicting campaign dates with no confirmed resolution, flagged transparently as unresolved.',
    transcript: `[17/10/24, 14:00:10] James: Heads up everyone, marketing is launching the campaign tomorrow morning at 9:00 AM.
[17/10/24, 14:05:30] Priya: Wait James, engineering has a freeze until Thursday. We cannot launch tomorrow morning.
[17/10/24, 14:08:15] James: Marketing executive sponsor already approved tomorrow morning.
[17/10/24, 14:12:00] Priya: If we launch tomorrow, the payment gateway will be untested. I strongly advise against it.`
  },
  {
    id: 'forwarded-and-tasks',
    name: 'Forwarded Message, Duplicate Notice & Cutoff',
    scenarioTag: 'FORWARDED NOTICE & ACTIONABLE QUESTION',
    description: 'A forwarded benefits notice repeated twice, alongside an urgent budget question requiring Alex\'s confirmation before 1:00 PM.',
    transcript: `[14/10/24, 11:00:00] Lisa: [Forwarded] Open enrollment forms must be submitted by Friday October 25th at 5 PM.
[14/10/24, 11:02:15] David PM: Team, we need to finalize the quarterly contractor budget before the 1:00 PM finance cutoff today.
[14/10/24, 11:04:30] David PM: @Alex can you confirm if the additional $4,500 AWS inference line item was approved by engineering?
[14/10/24, 11:15:22] Rachel: FYI I just booked Conference Room B for our Thursday workshop.
[14/10/24, 11:16:04] David PM: @Alex still waiting on your confirmation for the $4,500 budget line item.
[14/10/24, 11:45:00] HR Bot: Reminder: Open enrollment forms must be submitted by Friday October 25th at 5 PM.`
  },
  {
    id: 'casual-chit-chat',
    name: 'Casual Conversation (No Actionable Content)',
    scenarioTag: 'ZERO ACTIONABLE CONTENT',
    description: 'Friendly group banter about weekend hiking, sourdough bread recipes, and movie recommendations with zero tasks.',
    transcript: `[16/10/24, 18:22:04] Maya: Has anyone seen the new sci-fi movie that came out last Friday?
[16/10/24, 18:24:12] Liam: Yes! The cinematography was incredible, though the ending felt a bit rushed.
[16/10/24, 18:30:50] Maya: Good to know. Thinking of going on Saturday.
[16/10/24, 18:35:10] Liam: Also my sourdough starter finally doubled in size today.
[16/10/24, 18:42:00] Maya: Haha nice, send photos of the first loaf!`
  }
];
