// Help Center content — data-driven so articles can be added/edited without touching
// the HelpCenter component itself. Every fact here reflects real, current app behavior;
// nothing here should describe a feature that doesn't exist.

export type HelpVisibility = 'staff' | 'super_admin';

export interface HelpArticle {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  whenToUse?: string;
  steps?: string[];
  whatHappensNext?: string;
  commonProblems?: string[];
  keywords: string[];
  relatedArticleIds?: string[];
  visibility?: HelpVisibility;
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide-react icon name, resolved in the component
  visibility?: HelpVisibility;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  visibility?: HelpVisibility;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', title: 'Getting Started', description: 'Learn the basics', icon: 'Rocket' },
  { id: 'conversations', title: 'Conversations', description: 'Manage customer chats', icon: 'MessageSquare' },
  { id: 'whatsapp-messaging', title: 'WhatsApp Messaging', description: 'Send and manage messages', icon: 'Send' },
  { id: 'messaging-window', title: '24-Hour Messaging Window', description: 'When you can reply normally', icon: 'Clock' },
  { id: 'customers', title: 'Customers', description: 'Customer info and history', icon: 'User' },
  { id: 'teams-assignment', title: 'Teams & Assignment', description: 'Claim, assign, and transfer', icon: 'Users' },
  { id: 'templates', title: 'Message Templates', description: 'Send approved messages', icon: 'FileText' },
  { id: 'media', title: 'Media & Attachments', description: 'Send files and media', icon: 'Paperclip' },
  { id: 'notes', title: 'Internal Notes', description: 'Add private staff notes', icon: 'StickyNote' },
  { id: 'status', title: 'Conversation Status', description: 'Open, Closed, and Failed', icon: 'CircleDot' },
  { id: 'account', title: 'Account & Access', description: 'Login, roles, and permissions', icon: 'ShieldCheck' },
  { id: 'settings', title: 'Settings', description: 'Admin configuration areas', icon: 'Settings', visibility: 'super_admin' },
  { id: 'troubleshooting', title: 'Troubleshooting', description: 'Fix common issues', icon: 'LifeBuoy' },
  { id: 'developer', title: 'Developer Documentation', description: 'Technical architecture (restricted)', icon: 'Code', visibility: 'super_admin' }
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ---------- Getting Started ----------
  {
    id: 'welcome',
    categoryId: 'getting-started',
    title: 'Welcome to NexZen Connect',
    description: 'NexZen Connect is where your team manages customer conversations coming in over WhatsApp.',
    whenToUse: 'Read this first if you are new to the Support Center.',
    steps: [
      'Customers message your WhatsApp number or register on the public website.',
      'Their conversation appears in the Support Center, organized by team.',
      'Your team replies, adds notes, and closes the conversation once it’s resolved.'
    ],
    keywords: ['welcome', 'introduction', 'overview', 'nexzen connect'],
    relatedArticleIds: ['understanding-support-center', 'staff-login']
  },
  {
    id: 'understanding-support-center',
    categoryId: 'getting-started',
    title: 'Understanding the Support Center',
    description: 'The Support Center is where you read and reply to customer conversations.',
    steps: [
      'Left sidebar — switch between Support Center, Broadcasts, Settings areas, and Help.',
      'Conversation list — all conversations for your team(s), with search and filters.',
      'Chat panel — the selected conversation’s messages and reply box.'
    ],
    keywords: ['dashboard', 'layout', 'support center', 'overview', 'sidebar'],
    relatedArticleIds: ['finding-a-conversation', 'sending-first-reply']
  },
  {
    id: 'staff-login',
    categoryId: 'getting-started',
    title: 'Staff Login',
    description: 'Sign in to the Staff Portal to access the Support Center.',
    steps: [
      'Go to the Staff Login page.',
      'Enter your email and password.',
      'Click Sign In.'
    ],
    whatHappensNext: 'You’re taken to the Support Center, or back to whatever page you were trying to reach.',
    commonProblems: ['If sign-in fails, double-check your email and password, or ask an administrator to check your account.'],
    keywords: ['login', 'sign in', 'staff portal', 'password'],
    relatedArticleIds: ['account-access']
  },
  {
    id: 'finding-a-conversation',
    categoryId: 'getting-started',
    title: 'Finding a Customer Conversation',
    description: 'Use search and filters to find the conversation you need.',
    steps: [
      'Use the search box to search by customer name, phone number, or team.',
      'Use the team filter (“All Teams”) to narrow to one team.',
      'Use the status filter (“All Status”) to show Open, Closed, or Failed conversations.'
    ],
    keywords: ['find', 'search', 'filter', 'conversation list'],
    relatedArticleIds: ['conversations-overview', 'conversation-status']
  },
  {
    id: 'sending-first-reply',
    categoryId: 'getting-started',
    title: 'Sending Your First Reply',
    description: 'Send a message directly from the customer’s conversation.',
    whenToUse: 'Use this when a customer has contacted your team and is waiting on a reply.',
    steps: [
      'Open Conversations.',
      'Select the customer’s conversation.',
      'Type your message in the reply box.',
      'Click Send.'
    ],
    whatHappensNext: 'Your message is delivered to the customer on WhatsApp. You’ll see Sent, then Delivered, then Read as the message progresses.',
    commonProblems: ['If the 24-hour messaging window has expired, normal replies aren’t available — use Send Approved Message instead.'],
    keywords: ['reply', 'send message', 'first message', 'customer'],
    relatedArticleIds: ['messaging-window-overview', 'delivery-indicators']
  },
  {
    id: 'assigning-getting-started',
    categoryId: 'getting-started',
    title: 'Assigning a Conversation',
    description: 'Claim a conversation so your team knows who’s handling it.',
    steps: [
      'Open the conversation.',
      'Click Claim Ticket in the conversation header.'
    ],
    whatHappensNext: 'The header shows “Assigned to [your name]” instead of the Claim button, and it’s shown as Unassigned to teammates until claimed.',
    keywords: ['assign', 'claim', 'claim ticket', 'ownership'],
    relatedArticleIds: ['teams-assignment-overview']
  },
  {
    id: 'closing-getting-started',
    categoryId: 'getting-started',
    title: 'Closing a Conversation',
    description: 'Mark a conversation Closed once the customer’s issue is resolved.',
    steps: [
      'Open the conversation.',
      'Click Close in the conversation header.',
      'Confirm when asked.'
    ],
    whatHappensNext: 'The conversation is marked Closed. If the customer or a staff member replies later, it reopens automatically.',
    keywords: ['close', 'closing', 'resolve', 'resolved', 'finish'],
    relatedArticleIds: ['conversation-status']
  },

  // ---------- Conversations ----------
  {
    id: 'conversations-overview',
    categoryId: 'conversations',
    title: 'What Is a Conversation?',
    description: 'A conversation is the message thread between one customer and one team.',
    steps: [
      'A conversation is tied to a customer’s phone number and a specific team (for example, a particular service or product).',
      'The same phone number can have a separate conversation for each team it has contacted.'
    ],
    keywords: ['conversation', 'thread', 'what is a conversation'],
    relatedArticleIds: ['customers-overview', 'teams-assignment-overview']
  },
  {
    id: 'searching-filtering',
    categoryId: 'conversations',
    title: 'Searching and Filtering Conversations',
    description: 'Narrow the conversation list down to what you need.',
    steps: [
      'Search box — matches customer name, phone number, team, or the last message text.',
      'Team filter — show only one team’s conversations, or All Teams.',
      'Status filter — show Open, Closed, or Failed conversations, or All Status.'
    ],
    keywords: ['search', 'filter', 'team filter', 'status filter'],
    relatedArticleIds: ['conversation-status', 'teams-assignment-overview']
  },
  {
    id: 'reading-replying',
    categoryId: 'conversations',
    title: 'Reading Messages and Replying',
    description: 'Open a conversation to see the full message history and reply.',
    steps: [
      'Click a conversation in the list to open it.',
      'Scroll to read earlier messages — dates are grouped as Today, Yesterday, or the full date.',
      'Type a reply and click Send.'
    ],
    keywords: ['read messages', 'reply', 'timestamps', 'today', 'yesterday'],
    relatedArticleIds: ['sending-first-reply']
  },
  {
    id: 'closing-reopening',
    categoryId: 'conversations',
    title: 'Closing and Reopening Conversations',
    description: 'Conversations move between Open and Closed as work happens.',
    steps: [
      'Click Close once an issue is resolved.',
      'To reopen, simply reply — replying to a Closed conversation reopens it automatically.'
    ],
    keywords: ['close', 'reopen', 'resolve'],
    relatedArticleIds: ['conversation-status']
  },
  {
    id: 'internal-vs-customer-facing',
    categoryId: 'conversations',
    title: 'What the Customer Sees vs. What Staff Sees',
    description: 'Some information in a conversation is private to your team.',
    steps: [
      'Customer-facing: your text replies, media you send, and approved message templates — these go to WhatsApp.',
      'Staff-only: who claimed the conversation, internal notes, and team assignment — the customer never sees these.'
    ],
    keywords: ['private', 'internal', 'customer facing', 'visibility'],
    relatedArticleIds: ['notes-overview', 'teams-assignment-overview']
  },
  {
    id: 'duplicate-conversations',
    categoryId: 'conversations',
    title: 'Why Might I See the Same Customer Twice?',
    description: 'The same customer can have more than one conversation if they’ve contacted more than one team.',
    steps: [
      'Each customer + team combination is its own conversation.',
      'The list automatically keeps the most relevant one and hides exact duplicates.'
    ],
    commonProblems: ['If you see what looks like a true duplicate for the same team, refresh the page. If it continues, let an administrator know.'],
    keywords: ['duplicate', 'same customer twice', 'multiple conversations'],
    relatedArticleIds: ['customers-overview']
  },

  // ---------- WhatsApp Messaging ----------
  {
    id: 'receiving-sending',
    categoryId: 'whatsapp-messaging',
    title: 'Receiving and Sending Messages',
    description: 'Customer messages appear automatically; you reply from the same screen.',
    steps: [
      'A new customer message appears in the conversation and moves it to the top of the list.',
      'Type your reply and click Send.'
    ],
    keywords: ['receive', 'send', 'incoming message'],
    relatedArticleIds: ['delivery-indicators']
  },
  {
    id: 'delivery-indicators',
    categoryId: 'whatsapp-messaging',
    title: 'Understanding Message Status',
    description: 'Every message you send shows how far it got.',
    steps: [
      'Sent — a single checkmark. Your message left NexZen Connect.',
      'Delivered — a double checkmark. The message reached the customer’s phone.',
      'Read — a double checkmark (highlighted). The customer opened it.',
      'Message not delivered — shown in a red box when a message couldn’t reach the customer.'
    ],
    keywords: ['sent', 'delivered', 'read', 'checkmark', 'ticks', 'status', 'message not delivered'],
    relatedArticleIds: ['message-not-delivered']
  },
  {
    id: 'welcome-messages',
    categoryId: 'whatsapp-messaging',
    title: 'Welcome Messages',
    description: 'New customers automatically receive a welcome message on WhatsApp when they register on the public website.',
    keywords: ['welcome message', 'registration', 'new customer'],
    relatedArticleIds: ['customers-overview']
  },

  // ---------- 24-Hour Messaging Window ----------
  {
    id: 'messaging-window-overview',
    categoryId: 'messaging-window',
    title: 'Understanding the 24-Hour Messaging Window',
    description: 'WhatsApp only allows normal replies for 24 hours after the customer’s last message.',
    whenToUse: 'Check this whenever you’re not sure why the reply box looks disabled.',
    steps: [
      'Active — the composer shows “Window Active” with the time remaining. Normal replies and attachments work as usual.',
      'Expired — the composer shows “Session window expired · Customer must message first.” The reply box is disabled.'
    ],
    whatHappensNext: 'When expired, use Send Approved Message (or the one-click Send Follow-Up Template option) to reach the customer again.',
    commonProblems: ['If a customer messages you again, the window reopens automatically — no action needed from you.'],
    keywords: ['24 hour', '24-hour window', 'session window', 'window active', 'window expired', 'why can’t i send a message'],
    relatedArticleIds: ['templates-overview', 'sending-a-template']
  },

  // ---------- Customers ----------
  {
    id: 'customers-overview',
    categoryId: 'customers',
    title: 'Customer Information',
    description: 'Each conversation shows the customer’s name, phone number, and which team they’re talking to.',
    steps: [
      'Customer name and phone number appear at the top of the conversation.',
      'The team/product pill next to their name shows which service they contacted.',
      'The same phone number can appear in more than one conversation if the customer has contacted multiple teams.'
    ],
    keywords: ['customer', 'customer info', 'phone number', 'profile'],
    relatedArticleIds: ['conversations-overview', 'duplicate-conversations']
  },

  // ---------- Teams & Assignment ----------
  {
    id: 'teams-assignment-overview',
    categoryId: 'teams-assignment',
    title: 'Teams, Claiming, and Reassigning',
    description: 'Teams represent the different services connected to WhatsApp. Conversations belong to one team at a time.',
    steps: [
      'Filter by team using the team dropdown in Conversations.',
      'Claim Ticket — assign an unclaimed conversation to yourself.',
      'Reassign — move a conversation to a different team if it was routed to the wrong one.'
    ],
    whatHappensNext: 'Once claimed, the conversation header shows “Assigned to [name]” so your team knows who’s handling it. This is internal only — the customer never sees who claimed it.',
    keywords: ['team', 'teams', 'assign', 'claim', 'claim ticket', 'reassign', 'transfer', 'assigned to support'],
    relatedArticleIds: ['internal-vs-customer-facing']
  },

  // ---------- Message Templates ----------
  {
    id: 'templates-overview',
    categoryId: 'templates',
    title: 'What Are Message Templates?',
    description: 'Message templates are pre-approved WhatsApp messages you can send even when the 24-hour window has expired.',
    whenToUse: 'Use a template when the reply box is disabled, or when starting a brand-new conversation with a customer.',
    keywords: ['template', 'templates', 'approved message', 'message templates'],
    relatedArticleIds: ['sending-a-template']
  },
  {
    id: 'sending-a-template',
    categoryId: 'templates',
    title: 'Sending an Approved Message',
    description: 'Send a template message to a customer from the conversation.',
    steps: [
      'Click Send Approved Message.',
      'Under Select Message Template, choose a template.',
      'If the template needs details (shown as Variable {{1}}, {{2}}, etc.), fill them in — the message preview shows exactly what will be sent.',
      'Click Send Message.'
    ],
    whatHappensNext: 'The template is sent to the customer and reopens the 24-hour window.',
    commonProblems: [
      'Templates marked “Pending approval” or “Rejected by Meta” can’t be sent yet — pick a different one.',
      'If the window is expired and the conversation is still Open, you may also see a one-click Send Follow-Up Template button that sends a standard follow-up without opening the template picker.'
    ],
    keywords: ['send template', 'select message template', 'variable', 'send approved message', 'follow-up template'],
    relatedArticleIds: ['messaging-window-overview']
  },
  {
    id: 'managing-templates',
    categoryId: 'templates',
    title: 'Managing Templates',
    description: 'Register new message templates from Settings → Message Templates.',
    steps: [
      'Go to Settings → Message Templates.',
      'Fill in the template details and submit it for approval.'
    ],
    whatHappensNext: 'New templates must be approved before they can be sent — they’ll show as “Pending approval” until then.',
    keywords: ['manage templates', 'register template', 'create template'],
    visibility: 'staff'
  },

  // ---------- Media & Attachments ----------
  {
    id: 'media-overview',
    categoryId: 'media',
    title: 'Sending Files and Media',
    description: 'Send images, PDF documents, video, or audio to a customer.',
    steps: [
      'Click the attachment (paperclip) button.',
      'Choose a file to attach.',
      'Review the preview — you’ll see the file name and size.',
      'Add a message if you’d like, then click Send.'
    ],
    whatHappensNext: 'A progress bar shows while the file uploads and sends.',
    commonProblems: [
      '“File type not supported” — only images, PDFs, video, and audio are supported.',
      '“File is too large” — images up to 5 MB, PDFs up to 100 MB, video and audio up to 16 MB.',
      'Attachments are disabled when the 24-hour messaging window has expired.'
    ],
    keywords: ['attachment', 'media', 'file', 'image', 'pdf', 'video', 'audio', 'upload', 'file type not supported', 'file is too large'],
    relatedArticleIds: ['messaging-window-overview']
  },
  {
    id: 'viewing-media',
    categoryId: 'media',
    title: 'Viewing and Downloading Media',
    description: 'Media sent or received in a conversation stays in the message history.',
    steps: [
      'Images open in a full-size preview when clicked.',
      'PDF documents appear as a downloadable card.',
      'Video and audio play directly in the conversation.'
    ],
    keywords: ['view media', 'download', 'lightbox', 'pdf card']
  },

  // ---------- Internal Notes ----------
  {
    id: 'notes-overview',
    categoryId: 'notes',
    title: 'Internal Notes Are Private',
    description: 'Internal notes are for your team only. They are never sent to the customer or shown on WhatsApp.',
    steps: [
      'Click Note (or Note 3, etc.) in the conversation header.',
      'Type your note and click Add Note.'
    ],
    whatHappensNext: 'The note appears at the top of the list, newest first, with your name and the time.',
    keywords: ['note', 'notes', 'internal note', 'private', 'staff only'],
    relatedArticleIds: ['managing-notes', 'internal-vs-customer-facing']
  },
  {
    id: 'managing-notes',
    categoryId: 'notes',
    title: 'Editing and Deleting Notes',
    description: 'You can edit or delete your own notes at any time.',
    steps: [
      'Click the ⋮ menu on a note.',
      'Choose Edit to change the text, or Delete to remove it.',
      'Deleting asks you to confirm first.'
    ],
    commonProblems: ['The ⋮ menu only appears on your own notes. A Super Admin can manage any note.'],
    keywords: ['edit note', 'delete note', 'note permissions', 'who can edit notes'],
    relatedArticleIds: ['notes-overview']
  },

  // ---------- Conversation Status ----------
  {
    id: 'conversation-status',
    categoryId: 'status',
    title: 'Conversation Status Meanings',
    description: 'Every conversation shows one of these statuses.',
    steps: [
      'Open — an active conversation. You can reply (subject to the 24-hour window).',
      'Closed — the issue has been resolved. Replying automatically reopens it.',
      'Failed — shown when the most recent message couldn’t be delivered.'
    ],
    keywords: ['status', 'open', 'closed', 'failed', 'conversation status'],
    relatedArticleIds: ['closing-reopening', 'message-not-delivered']
  },

  // ---------- Account & Access ----------
  {
    id: 'account-access',
    categoryId: 'account',
    title: 'Login, Roles, and Access',
    description: 'Your role determines what you can see and manage.',
    steps: [
      'Staff (shown as “PRODUCT ADMIN”) can see and reply to conversations for their assigned teams, and manage Services and Message Templates.',
      'Super Admin can see everything, plus Team Access, Settings, and Analytics.',
      'Sign out anytime using the button in the sidebar.'
    ],
    commonProblems: [
      'If you can’t see a conversation or setting, it may be outside your assigned team — ask a Super Admin.',
      'If you’re signed out unexpectedly, simply sign in again.'
    ],
    keywords: ['login', 'logout', 'sign out', 'role', 'permissions', 'super admin', 'product admin', 'access'],
    relatedArticleIds: ['staff-login']
  },

  // ---------- Settings (super_admin only) ----------
  {
    id: 'settings-overview',
    categoryId: 'settings',
    title: 'Settings Areas',
    description: 'Super Admins manage the application from Settings.',
    steps: [
      'Services — manage the catalog of teams/products customers can reach on WhatsApp.',
      'Message Templates — register and review approved WhatsApp templates.',
      'Team Access — create staff accounts and control which teams they can see.',
      'Settings — configure the WhatsApp business account connection.',
      'Analytics — view WhatsApp message volume and delivery stats.'
    ],
    commonProblems: ['Changing a staff member’s team access changes what they can see and manage right away — double-check before saving.'],
    keywords: ['settings', 'admin', 'services', 'team access', 'analytics'],
    visibility: 'super_admin'
  },

  // ---------- Troubleshooting ----------
  {
    id: 'cannot-send-message',
    categoryId: 'troubleshooting',
    title: 'I Can’t Send a Message',
    description: 'Work through this checklist.',
    steps: [
      'Is the conversation still Open?',
      'Is the 24-hour messaging window active? If not, use Send Approved Message.',
      'If sending a template, is it fully filled in?',
      'Refresh the page and try again.'
    ],
    keywords: ['cannot send', 'can’t send message', 'reply disabled'],
    relatedArticleIds: ['messaging-window-overview']
  },
  {
    id: 'message-not-delivered',
    categoryId: 'troubleshooting',
    title: 'Message Not Delivered',
    description: 'What it means: the message couldn’t reach the customer.',
    whenToUse: 'This usually means the 24-hour messaging window has expired, or the customer’s number can’t currently receive messages.',
    steps: [
      'Check the 24-hour messaging window status in the composer.',
      'Use Send Approved Message to reach the customer again.',
      'If it keeps happening, contact an administrator.'
    ],
    keywords: ['message not delivered', 'failed message', 'delivery failed'],
    relatedArticleIds: ['messaging-window-overview', 'delivery-indicators']
  },
  {
    id: 'cannot-see-conversation',
    categoryId: 'troubleshooting',
    title: 'I Can’t See a Conversation',
    description: 'Check these in order.',
    steps: [
      'Clear the search box — it may be filtering results out.',
      'Check the team filter — it may be set to a different team.',
      'Check the status filter — a Closed conversation is hidden under “Open”.',
      'Check that the conversation’s team is one you have access to.'
    ],
    keywords: ['cannot see conversation', 'missing conversation', 'conversation disappeared'],
    relatedArticleIds: ['searching-filtering', 'duplicate-conversations']
  },
  {
    id: 'attachment-failed',
    categoryId: 'troubleshooting',
    title: 'Attachment Failed to Send',
    description: 'Check these common causes.',
    steps: [
      'File type — only images, PDFs, video, and audio are supported.',
      'File size — images up to 5 MB, PDFs up to 100 MB, video/audio up to 16 MB.',
      'Messaging window — attachments are disabled once the 24-hour window expires.',
      'Your internet connection — try again if the upload stalls.'
    ],
    keywords: ['attachment failed', 'upload failed', 'file not sending'],
    relatedArticleIds: ['media-overview']
  },
  {
    id: 'login-not-working',
    categoryId: 'troubleshooting',
    title: 'Login Is Not Working',
    description: 'Try these steps.',
    steps: [
      'Double-check your email and password.',
      'Make sure Caps Lock is off.',
      'Ask an administrator to confirm your account is active.'
    ],
    keywords: ['login not working', 'cannot sign in', 'password problem'],
    relatedArticleIds: ['staff-login']
  },

  // ---------- Developer Documentation (super_admin only, no secrets) ----------
  {
    id: 'dev-architecture',
    categoryId: 'developer',
    title: 'Architecture Overview',
    description: 'High-level shape of the system, for technical/admin reference only.',
    steps: [
      'Frontend: a React application that staff use in the browser.',
      'Backend: a Node.js/Express server handling conversations, staff accounts, and settings.',
      'Data storage: a MongoDB database.',
      'Messaging: the WhatsApp Business Cloud API sends and receives customer messages.',
      'Real-time updates: a WebSocket connection pushes new messages and note changes to open browser tabs instantly.',
      'Authentication: staff sign in with an email/password; access is controlled by a signed session issued at login.'
    ],
    commonProblems: ['This article intentionally omits credentials, keys, and connection details. Never add real secrets to Help Center content.'],
    keywords: ['architecture', 'backend', 'frontend', 'database', 'websocket', 'technical'],
    visibility: 'super_admin'
  },
  {
    id: 'dev-permissions-model',
    categoryId: 'developer',
    title: 'Roles & Permissions Model',
    description: 'How access is enforced, at a conceptual level.',
    steps: [
      'Every staff account has a role: staff or Super Admin.',
      'Every staff account (other than Super Admin) has a list of assigned teams/products.',
      'Conversation, note, and settings access is checked on the server for every request — not just hidden in the interface.',
      'Note edit/delete additionally checks that the requester is the original author, unless they’re a Super Admin.'
    ],
    keywords: ['permissions', 'roles', 'authorization', 'access control'],
    visibility: 'super_admin'
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-notes-visible',
    question: 'Can customers see internal notes?',
    answer: 'No. Internal notes are private to staff and are never sent through WhatsApp.',
    keywords: ['notes', 'private', 'customer see notes']
  },
  {
    id: 'faq-assignment-visible',
    question: 'Can customers see which staff member is handling their conversation?',
    answer: 'No. Claiming and reassigning a conversation is internal only — the customer never sees it.',
    keywords: ['assignment', 'claim', 'visible to customer']
  },
  {
    id: 'faq-why-cant-send',
    question: 'Why can’t I send a normal WhatsApp message?',
    answer: 'The 24-hour messaging window has likely expired. Use Send Approved Message to reach the customer.',
    keywords: ['why can’t i send', 'window expired', 'disabled reply']
  },
  {
    id: 'faq-window-expires',
    question: 'What happens when the 24-hour window expires?',
    answer: 'Normal free-text replies are disabled until the customer messages again, or until you send an approved message template.',
    keywords: ['24 hour window', 'expires']
  },
  {
    id: 'faq-two-staff',
    question: 'Can two staff members handle the same customer?',
    answer: 'Yes, but only one person can claim a conversation at a time, which shows as “Assigned to [name]” so your team can coordinate.',
    keywords: ['two staff', 'multiple agents', 'claim']
  },
  {
    id: 'faq-multiple-conversations',
    question: 'Can the same customer have multiple conversations?',
    answer: 'Yes — one conversation per team they’ve contacted.',
    keywords: ['multiple conversations', 'same customer']
  },
  {
    id: 'faq-delete-conversation',
    question: 'Can I delete a customer conversation?',
    answer: 'Conversations aren’t deleted — close them instead once the issue is resolved.',
    keywords: ['delete conversation']
  },
  {
    id: 'faq-close-conversation',
    question: 'What happens when I close a conversation?',
    answer: 'It’s marked Closed. If the customer or a staff member replies later, it reopens automatically.',
    keywords: ['close conversation', 'closed']
  },
  {
    id: 'faq-failed-message',
    question: 'Why does a message show as failed?',
    answer: 'It couldn’t be delivered — usually because the 24-hour messaging window has expired.',
    keywords: ['failed message', 'not delivered']
  },
  {
    id: 'faq-send-files',
    question: 'Can I send files to customers?',
    answer: 'Yes — images, PDFs, video, and audio, as long as the messaging window is active.',
    keywords: ['send files', 'media', 'attachments']
  },
  {
    id: 'faq-manage-templates',
    question: 'Who can manage message templates?',
    answer: 'Any staff member can register and review templates from Settings → Message Templates.',
    keywords: ['manage templates', 'who can']
  },
  {
    id: 'faq-manage-staff',
    question: 'Who can manage staff access?',
    answer: 'Only Super Admins, from Settings → Team Access.',
    keywords: ['manage staff', 'staff access', 'super admin']
  }
];
