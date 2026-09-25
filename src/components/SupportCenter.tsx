import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRightLeft,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Film,
  Maximize2,
  MessageSquare,
  Music,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smile,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import type { AdminUser, Conversation, Product } from '../types';
import { API_BASE } from '../constants';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { wsService, type WSConnectionStatus } from '../services/websocket';
import { notificationService } from '../utils/notificationService';
import { ConversationNotes } from './ConversationNotes';
import {
  formatTimeOnly,
  formatContextualDateTime,
  formatDateSeparator,
  isSameDay,
  getSessionWindowRemaining
} from '../utils/dateUtils';

type StatusFilter = 'all' | 'open' | 'resolved' | 'failed';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All Status',
  open: 'Open',
  resolved: 'Closed',
  failed: 'Failed'
};

interface SupportCenterProps {
  currentUser?: AdminUser | null;
  conversations: Conversation[];
  filteredConversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string) => void;
  currentConversation: Conversation | undefined;
  adminProductFilter: string;
  setAdminProductFilter: (filter: string) => void;
  displayProducts: Product[];
  adminInput: string;
  setAdminInput: (input: string) => void;
  adminIsSending: boolean;
  handleAdminSendReply: (e: React.FormEvent) => Promise<void>;
  handleAdminSendMediaReply: (params: {
    file: File;
    caption?: string;
    onProgress?: (pct: number) => void;
  }) => Promise<{ success: boolean; error?: string }>;
  handleResolveConversation: (conversationId: string) => Promise<void>;
  handleReassignConversation: (conversationId: string, newProductId: string) => Promise<void>;
  allProducts: Product[];
  getAuthHeaders: () => Record<string, string>;
  openInitiateModal: (defaults?: {
    phone?: string;
    name?: string;
    productId?: string;
    messageType?: 'template' | 'custom';
  }) => void;
  adminChatEndRef: React.RefObject<HTMLDivElement | null>;
}

export const SupportCenter: React.FC<SupportCenterProps> = ({
  conversations,
  filteredConversations,
  selectedConversationId,
  setSelectedConversationId,
  currentConversation,
  adminProductFilter,
  setAdminProductFilter,
  displayProducts,
  adminInput,
  setAdminInput,
  adminIsSending,
  handleAdminSendReply,
  handleAdminSendMediaReply,
  handleResolveConversation,
  handleReassignConversation,
  allProducts,
  getAuthHeaders,
  openInitiateModal,
  adminChatEndRef,
  currentUser
}) => {
  const navigate = useNavigate();
  const [isResolving, setIsResolving] = React.useState(false);
  const [isReassigning, setIsReassigning] = React.useState(false);
  const [reassignMenuOpen, setReassignMenuOpen] = React.useState(false);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [isSendingReengagement, setIsSendingReengagement] = React.useState(false);
  const [wsStatus, setWsStatus] = React.useState<WSConnectionStatus>(wsService.getStatus());
  const [liveViewingAgent, setLiveViewingAgent] = React.useState<string | null>(null);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = React.useState<string | null>(null);
  const [isReactingMsgId, setIsReactingMsgId] = React.useState<string | null>(null);

  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const isAtBottomRef = React.useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const prevMsgCountRef = React.useRef(0);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    isAtBottomRef.current = true;
    setShowScrollToBottom(false);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    } else if (adminChatEndRef?.current) {
      adminChatEndRef.current.scrollIntoView({ behavior });
    }
  }, [adminChatEndRef]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Consider user at bottom if within 100px
    const atBottom = distanceToBottom < 100;
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom && distanceToBottom > 160);
  };


  const [soundEnabled, setSoundEnabled] = React.useState(notificationService.isSoundEnabled());
  const [notifPerm, setNotifPerm] = React.useState<NotificationPermission>(notificationService.getPermissionStatus());

  const handleToggleSound = () => {
    const next = !soundEnabled;
    notificationService.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) {
      notificationService.playNotificationSound();
    }
  };

  const handleRequestNotifPerm = async () => {
    const res = await notificationService.requestPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      notificationService.playNotificationSound();
      notificationService.showDesktopNotification({
        title: 'Desktop Alerts Enabled 🎉',
        body: 'You will receive instant alerts when customers message you on WhatsApp.',
        tag: 'welcome_alert'
      });
      window.dispatchEvent(new CustomEvent('test-in-app-notif'));
    }
  };

  const handleTestChime = () => {
    notificationService.playNotificationSound();
    notificationService.showDesktopNotification({
      title: 'NexZen Connect Test Alert 🔔',
      body: 'Notifications and sound chime are working perfectly!',
      tag: 'test_alert'
    });
    window.dispatchEvent(new CustomEvent('test-in-app-notif'));
  };

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleToggleReaction = async (conversationId: string, messageId: string, emoji: string) => {
    if (isReactingMsgId) return;
    setIsReactingMsgId(messageId);
    setActiveReactionMenuMsgId(null);
    try {
      const res = await fetch(`${API_BASE}/admin/react-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ conversationId, messageId, emoji })
      });
      if (res.ok) {
        const data = await res.json();
        if (currentConversation && currentConversation.id === conversationId) {
          const msg = currentConversation.messages.find(m => m.id === messageId);
          if (msg) {
            msg.reaction = data.reaction;
            if (data.conversation) {
              const updatedMsg = data.conversation.messages?.find((x: any) => x.id === messageId);
              if (updatedMsg?.reactions) {
                msg.reactions = updatedMsg.reactions;
              }
            } else {
              if (!msg.reactions) msg.reactions = {};
              msg.reactions.admin = data.reaction;
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to react to message:', err);
    } finally {
      setIsReactingMsgId(null);
    }
  };

  React.useEffect(() => {
    return wsService.onStatusChange(setWsStatus);
  }, []);

  const handleClaimTicket = async () => {
    if (!currentConversation) return;
    setIsClaiming(true);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${currentConversation.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          window.dispatchEvent(new CustomEvent('conversationUpdated', { detail: data.conversation }));
        }
      }
    } catch (err) {
      console.error('Failed to claim ticket:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleSendReengagement = async () => {
    if (!currentConversation) return;
    setIsSendingReengagement(true);
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${currentConversation.id}/reengage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          window.dispatchEvent(new CustomEvent('conversationUpdated', { detail: data.conversation }));
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send follow-up template.');
      }
    } catch (err: any) {
      alert('Error sending follow-up template: ' + err.message);
    } finally {
      setIsSendingReengagement(false);
    }
  };

  // Media Attachment State
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [lightboxMedia, setLightboxMedia] = React.useState<{ url: string; title: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 24-Hour Session Window Determination (evaluated across all products/conversations for this customer)
  const lastUserMessage = React.useMemo(() => {
    if (!currentConversation) return null;
    const customerPhone = currentConversation.phone;

    // Search across all conversations belonging to this customer phone
    const customerConvs = conversations.filter(c => c.phone === customerPhone);
    let latestUserMsg: any = null;
    let latestTime = 0;

    for (const conv of customerConvs) {
      const uMsg = [...conv.messages].reverse().find((m: any) => m.sender === 'user');
      if (uMsg && uMsg.timestamp) {
        const t = new Date(uMsg.timestamp).getTime();
        if (t > latestTime) {
          latestTime = t;
          latestUserMsg = uMsg;
        }
      }
    }

    return latestUserMsg || [...currentConversation.messages].reverse().find((m: any) => m.sender === 'user');
  }, [currentConversation, conversations]);

  // Session is expired if no user message exists or > 24 hours have passed since last user message
  const isSessionExpired = React.useMemo(() => {
    if (!currentConversation) return false;
    if (currentConversation.status === 'resolved') return true;
    if (!lastUserMessage) return true;
    const lastUserTime = new Date(lastUserMessage.timestamp).getTime();
    const diffHours = (Date.now() - lastUserTime) / (1000 * 60 * 60);
    if (diffHours > 24) return true;

    // Only force expired if Meta explicitly returned error 131047 (Re-engagement message / 24h expired)
    // after the user's latest message
    const lastMsg = currentConversation.messages[currentConversation.messages.length - 1];
    if (lastMsg && (lastMsg.errorCode === 131047 || lastMsg.errorCode === '131047')) {
      if (new Date(lastMsg.timestamp).getTime() > lastUserTime) {
        return true;
      }
    }

    return false;
  }, [currentConversation, lastUserMessage]);

  // Periodic 30s tick to keep session window remaining time fresh
  const [, setSessionTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setSessionTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const sessionWindowRemaining = React.useMemo(() => {
    if (isSessionExpired || !lastUserMessage?.timestamp) return null;
    return getSessionWindowRemaining(lastUserMessage.timestamp);
  }, [isSessionExpired, lastUserMessage?.timestamp]);

  // Delivery Failure that actually requires a re-engagement template (only if session is expired or error 131047)
  const hasActiveFailure = React.useMemo(() => {
    if (!currentConversation?.messages?.length) return false;
    const lastMsg = currentConversation.messages[currentConversation.messages.length - 1];
    if (lastMsg && (lastMsg.status === 'failed' || lastMsg.errorCode)) {
      // If customer messaged us within 24 hours and the error isn't 131047, the session is NOT closed
      if (lastMsg.errorCode === 131047 || lastMsg.errorCode === '131047') return true;
      if (isSessionExpired) return true;
    }
    return false;
  }, [currentConversation?.messages, isSessionExpired]);

  // Real-time WebSocket presence: let teammates know someone is viewing this conversation
  React.useEffect(() => {
    setLiveViewingAgent(null);
    if (!selectedConversationId) return;

    wsService.joinConversation(selectedConversationId);

    const unsub = wsService.on('presence:update', (data: any) => {
      if (data?.conversationId === selectedConversationId) {
        if (data.action === 'joined') {
          setLiveViewingAgent(data.agentName);
        } else if (data.action === 'left') {
          setLiveViewingAgent(null);
        }
      }
    });

    return () => {
      unsub();
      wsService.leaveConversation(selectedConversationId);
    };
  }, [selectedConversationId]);

  // Handle File Selection & Validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaError(null);
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();

    let category: 'image' | 'document' | 'video' | 'audio' | null = null;
    let maxSize = 0;

    if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      category = 'image';
      maxSize = 5 * 1024 * 1024; // 5 MB
    } else if (mime === 'application/pdf' || ext === '.pdf') {
      category = 'document';
      maxSize = 100 * 1024 * 1024; // 100 MB
    } else if (mime.startsWith('video/') || ext === '.mp4') {
      category = 'video';
      maxSize = 16 * 1024 * 1024; // 16 MB
    } else if (mime.startsWith('audio/') || ['.mp3', '.aac', '.ogg'].includes(ext)) {
      category = 'audio';
      maxSize = 16 * 1024 * 1024; // 16 MB
    }

    if (!category) {
      setMediaError('File type not supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > maxSize) {
      setMediaError('File is too large. Please choose a smaller file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    const preview = URL.createObjectURL(file);
    setFilePreviewUrl(preview);
    setAttachedFile(file);
  };

  const handleRemoveAttachment = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setAttachedFile(null);
    setMediaError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  React.useEffect(() => {
    handleRemoveAttachment();
  }, [selectedConversationId]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxMedia) {
        setLightboxMedia(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxMedia]);

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    scrollToBottom('smooth');
    if (attachedFile) {
      setMediaError(null);
      setUploadProgress(15);
      try {
        const res = await handleAdminSendMediaReply({
          file: attachedFile,
          caption: adminInput,
          onProgress: (pct) => setUploadProgress(pct)
        });
        setUploadProgress(null);
        if (res.success) {
          handleRemoveAttachment();
          setAdminInput('');
        } else {
          setMediaError(res.error || 'Media could not be sent.');
        }
      } catch {
        setUploadProgress(null);
        setMediaError('Media could not be sent.');
      }
    } else {
      await handleAdminSendReply(e);
    }
  };

  // Filters: Teams, Status, and Search
  const [teamMenuOpen, setTeamMenuOpen] = React.useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);
  const [teamSearch, setTeamSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedEventIds, setExpandedEventIds] = React.useState<Set<string>>(new Set());

  const toggleEventDetails = (id: string) => {
    setExpandedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.filter-dropdown')) {
        setTeamMenuOpen(false);
        setStatusMenuOpen(false);
        setReassignMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTeamMenuOpen(false);
        setStatusMenuOpen(false);
        setReassignMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const selectedTeamProduct = displayProducts.find(p => p.id === adminProductFilter);
  const teamFilterLabel = adminProductFilter === 'all' ? 'All Teams' : (selectedTeamProduct?.name || 'All Teams');
  const searchedProducts = displayProducts.filter(p =>
    p.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  // Apply status filter, search query, and defensive conversation identity deduplication
  const displayedConversations = React.useMemo(() => {
    let list = filteredConversations;
    if (statusFilter !== 'all') {
      list = list.filter(c => {
        const hasFailedMessage = c.messages && c.messages.some((m: any) => m.status === 'failed' || m.errorCode);
        if (statusFilter === 'failed') return !!hasFailedMessage;
        if (statusFilter === 'open') return !hasFailedMessage && c.status === 'open';
        if (statusFilter === 'resolved') return !hasFailedMessage && c.status === 'resolved';
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.userName && c.userName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.productName && c.productName.toLowerCase().includes(q)) ||
        (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
      );
    }

    // Defensive UI Deduplication:
    // Respect backend conversation identity (customer + product/team).
    // Different products for the same customer remain separate.
    // Duplicate entries for the exact same customer + product are deduplicated.
    const seen = new Map<string, Conversation>();
    for (const c of list) {
      if (c.status === 'merged') continue;
      const normPhone = normalizePhoneNumber(c.phone);
      const identityKey = `${normPhone}__${c.productId}`;
      const existing = seen.get(identityKey);
      if (!existing) {
        seen.set(identityKey, c);
      } else {
        // Keep the open conversation over resolved, or the newer one
        if (existing.status !== 'open' && c.status === 'open') {
          seen.set(identityKey, c);
        } else if (existing.status === c.status) {
          const tExisting = new Date(existing.lastMessage?.timestamp || existing.createdAt || 0).getTime();
          const tCurrent = new Date(c.lastMessage?.timestamp || c.createdAt || 0).getTime();
          if (tCurrent > tExisting) {
            seen.set(identityKey, c);
          }
        }
      }
    }
    return Array.from(seen.values());
  }, [filteredConversations, statusFilter, searchQuery]);

  // Helper to format preview text for the conversation list
  const formatMessagePreview = (text: string, hasFailed: boolean) => {
    if (hasFailed) return 'Message not delivered';
    if (!text) return 'No messages yet';
    const clean = text.replace(/^[❌⚠️🎫🔒🍎🏡🚧💻🛒👥📈🍲☕📅👋]\s*/, '').trim();
    if (/session cleared|marked resolved|resolved by/i.test(clean)) {
      return 'Conversation closed';
    }
    if (/delivery failed|whatsapp delivery failed/i.test(clean)) {
      return 'Message not delivered';
    }
    if (/no matching product keyword|route assigned to/i.test(clean)) {
      return 'Assigned to Support';
    }
    if (/routing conversation to/i.test(clean)) {
      const teamMatch = clean.match(/^routing conversation to (.+?) support/i);
      return teamMatch ? `Assigned to ${teamMatch[1]} Support` : 'Assigned to Support';
    }
    if (clean.toLowerCase().startsWith('selected product:') || clean.toLowerCase().startsWith('selected service:')) {
      return clean.replace(/^selected (product|service):\s*/i, 'Product: ');
    }
    if (clean.startsWith('[Outbound Welcome Template:') || clean.startsWith('[Welcome Message Dispatched:')) {
      return 'Welcome message sent';
    }
    if (clean.startsWith('[Template:')) {
      return 'Message sent';
    }
    return clean;
  };

  // Helper to parse system messages into a clean, client-friendly headline and secondary detail
  const parseSystemEvent = (rawText: string) => {
    const clean = (rawText || '').replace(/^[❌⚠️🎫🔒🍎🏡🚧💻🛒👥📈🍲☕📅👋]\s*/, '').trim();

    // Pattern 1: Session cleared / resolved -> "Conversation closed"
    if (/session cleared|marked resolved|resolved by/i.test(clean)) {
      return {
        title: 'Conversation closed',
        rawDetail: null
      };
    }

    // Pattern 2: WhatsApp Delivery Failed -> "Message not delivered"
    if (/delivery failed|whatsapp delivery failed/i.test(clean)) {
      return {
        title: 'Message not delivered',
        rawDetail: clean.replace(/^(WhatsApp Delivery Failed|Delivery Failed)(\s*\(Error \d+\))?:\s*/i, '')
      };
    }

    // Pattern 3: No matching product keyword or route assigned -> "Assigned to Support"
    if (/no matching product keyword|route assigned to/i.test(clean)) {
      return {
        title: 'Assigned to Support',
        rawDetail: null
      };
    }

    // Pattern 4: conversation handed off to a team
    if (/routing conversation to/i.test(clean)) {
      const teamMatch = clean.match(/routing conversation to (.+?) support/i);
      return {
        title: teamMatch ? `Assigned to ${teamMatch[1]} Support` : 'Assigned to Support',
        rawDetail: null
      };
    }

    // Pattern 5: Selected product / service:
    if (clean.toLowerCase().startsWith('selected product:') || clean.toLowerCase().startsWith('selected service:')) {
      return {
        title: clean.replace(/^selected (product|service):\s*/i, 'Product: '),
        rawDetail: null
      };
    }

    // Pattern 6: Template dispatched "[Welcome Message Dispatched: x]"
    const tmplMatch = clean.match(/^\[(Welcome Message Dispatched|Outbound Welcome Template):\s*([^\]]+)\]/i);
    if (tmplMatch) {
      return {
        title: 'Welcome message sent',
        rawDetail: tmplMatch[2]
      };
    }

    const tmplGeneral = clean.match(/^\[Template:\s*([^\]]+)\]/i);
    if (tmplGeneral) {
      return {
        title: 'Message sent',
        rawDetail: tmplGeneral[1]
      };
    }

    // Generic fallback: don't expose messy technical codes in primary headline
    const dotIndex = clean.indexOf('. ');
    if (dotIndex > 0 && dotIndex < clean.length - 2) {
      return {
        title: clean.substring(0, dotIndex).trim(),
        rawDetail: clean.substring(dotIndex + 2).replace(/\.$/, '').trim()
      };
    }

    return {
      title: clean.replace(/\.$/, ''),
      rawDetail: null
    };
  };

  // Filter messages to prevent rendering duplicate consecutive system events and legacy reaction text messages
  const displayMessages = React.useMemo(() => {
    if (!currentConversation?.messages) return [];
    return currentConversation.messages.filter((m: any, idx: number, arr: any[]) => {
      // Exclude legacy reaction text messages e.g. "Reacted 👍🏻" or "Reacted"
      if (typeof m.text === 'string' && m.text.startsWith('Reacted')) {
        return false;
      }
      const isSystem = m.sender === 'system' || m.messageType === 'template';
      if (!isSystem) return true;
      if (idx === 0) return true;
      const prev = arr[idx - 1];
      const prevIsSystem = prev.sender === 'system' || prev.messageType === 'template';
      if (prevIsSystem) {
        const currP = parseSystemEvent(m.text || '');
        const prevP = parseSystemEvent(prev.text || '');
        // If identical title and detail, deduplicate consecutive duplicate
        if (currP.title === prevP.title && currP.rawDetail === prevP.rawDetail) {
          return false;
        }
      }
      return true;
    });
  }, [currentConversation?.messages]);

  // Auto-scroll when switching conversations (instantly jump to bottom)
  React.useEffect(() => {
    if (selectedConversationId) {
      isAtBottomRef.current = true;
      setShowScrollToBottom(false);
      prevMsgCountRef.current = displayMessages.length;
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        } else if (adminChatEndRef?.current) {
          adminChatEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      });
    }
  }, [selectedConversationId]);

  // When messages update, only auto-scroll if user is already at the bottom
  // NEVER disrupt the user if they have deliberately scrolled up to read history
  React.useEffect(() => {
    const currentCount = displayMessages.length;
    const isNewMessage = currentCount > prevMsgCountRef.current;
    prevMsgCountRef.current = currentCount;

    if (isAtBottomRef.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: isNewMessage ? 'smooth' : 'auto'
        });
      } else if (adminChatEndRef?.current) {
        adminChatEndRef.current.scrollIntoView({ behavior: isNewMessage ? 'smooth' : 'auto' });
      }
    }
  }, [displayMessages, adminChatEndRef]);

  // Download a plain-text transcript of the current conversation for records/handoff
  const handleExportConversation = () => {
    if (!currentConversation) return;

    const lines = currentConversation.messages.map((m: any) => {
      const timestamp = new Date(m.timestamp).toLocaleString();
      const isSystemOrTemplate = m.sender === 'system' || m.messageType === 'template';
      if (isSystemOrTemplate) {
        const parsed = parseSystemEvent(m.text || '');
        const detail = parsed.rawDetail ? ` (${parsed.rawDetail})` : '';
        return `[${timestamp}] SYSTEM: ${parsed.title}${detail}`;
      }
      const who = m.sender === 'admin' ? 'AGENT' : 'CUSTOMER';
      const mediaNote = m.mediaUrl ? ` [attachment: ${m.mediaName || m.mediaUrl}]` : '';
      const text = (m.text || '').replace(/^[❌⚠️🎫🔒🍎🏡🚧💻🛒👥📈🍲☕📅👋]\s*/, '');
      return `[${timestamp}] ${who}: ${text}${mediaNote}`;
    });

    const header = [
      `Conversation with ${currentConversation.userName} (+${currentConversation.phone})`,
      `Team: ${currentConversation.productName}`,
      `Status: ${currentConversation.status === 'open' ? 'Open' : 'Closed'}`,
      `Exported: ${new Date().toLocaleString()}`,
      '---'
    ].join('\n');

    const transcript = [header, ...lines].join('\n');
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (currentConversation.userName || 'customer').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `conversation-${safeName}-${currentConversation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-chat-area">
      {/* Conversations List Panel */}
      <div className="conversations-list-pane">
        <div className="pane-header">
          <div className="pane-header-title">
            <span>Conversations</span>
            <span className="pane-header-count">{displayedConversations.length}</span>
          </div>
          <div className="pane-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {/* Audio chime toggle */}
            <button
              type="button"
              className={`pane-notif-btn ${soundEnabled ? 'active' : 'muted'}`}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Sound alerts on (click to mute)' : 'Sound alerts muted (click to unmute)'}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>

            {/* Desktop notification prompt / indicator */}
            {notifPerm !== 'granted' ? (
              <button
                type="button"
                className={`pane-notif-btn ${notifPerm === 'denied' ? 'blocked' : 'prompt'}`}
                onClick={handleRequestNotifPerm}
                title={notifPerm === 'denied' ? 'Desktop alerts blocked in browser settings' : 'Enable desktop push notifications'}
              >
                {notifPerm === 'denied' ? <BellOff size={13} /> : <Bell size={13} />}
              </button>
            ) : (
              <button
                type="button"
                className="pane-notif-btn granted"
                onClick={handleTestChime}
                title="Desktop alerts active. Click to test sound & push alert."
              >
                <BellRing size={13} />
              </button>
            )}

            <button
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => openInitiateModal()}
            >
              <Plus size={13} /> New Message
            </button>
          </div>
        </div>

        {/* Clean, Simple Filters: [ All Teams ▼ ] [ All Status ▼ ] [ Search ] */}
        <div className="pane-filters-row">
          {/* Team / Product filter */}
          <div className="filter-dropdown">
            <button
              type="button"
              className={`filter-trigger-btn ${adminProductFilter !== 'all' ? 'active' : ''}`}
              onClick={() => {
                setStatusMenuOpen(false);
                setTeamMenuOpen(prev => !prev);
              }}
            >
              {adminProductFilter !== 'all' && selectedTeamProduct && (
                <span className={`row-tag ${selectedTeamProduct.theme} filter-option-dot`} />
              )}
              <span className="filter-trigger-label">{teamFilterLabel}</span>
              <ChevronDown size={12} />
            </button>

            {teamMenuOpen && (
              <div className="filter-dropdown-panel">
                <div className="filter-search-wrapper">
                  <Search size={12} />
                  <input
                    type="text"
                    className="filter-search-input"
                    placeholder="Search teams..."
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="filter-options-list">
                  <button
                    type="button"
                    className={`filter-option-item ${adminProductFilter === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setAdminProductFilter('all');
                      setTeamMenuOpen(false);
                      setTeamSearch('');
                    }}
                  >
                    {adminProductFilter === 'all' && <Check size={12} />}
                    <span className="filter-option-label">All Teams</span>
                    <span className="filter-badge">{conversations.length}</span>
                  </button>

                  {searchedProducts.map(p => {
                    const count = conversations.filter(c => c.productId === p.id && c.status === 'open').length;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        className={`filter-option-item ${adminProductFilter === p.id ? 'active' : ''}`}
                        onClick={() => {
                          setAdminProductFilter(p.id);
                          setTeamMenuOpen(false);
                          setTeamSearch('');
                        }}
                      >
                        {adminProductFilter === p.id ? (
                          <Check size={12} />
                        ) : (
                          <span className={`row-tag ${p.theme} filter-option-dot`} />
                        )}
                        <span className="filter-option-label">{p.name}</span>
                        {count > 0 && <span className="filter-badge">{count}</span>}
                      </button>
                    );
                  })}

                  {searchedProducts.length === 0 && (
                    <div className="filter-empty-note">No teams match &quot;{teamSearch}&quot;</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status filter */}
          <div className="filter-dropdown">
            <button
              type="button"
              className={`filter-trigger-btn ${statusFilter !== 'all' ? 'active' : ''}`}
              onClick={() => {
                setTeamMenuOpen(false);
                setStatusMenuOpen(prev => !prev);
              }}
            >
              <span className="filter-trigger-label">{STATUS_FILTER_LABELS[statusFilter]}</span>
              <ChevronDown size={12} />
            </button>

            {statusMenuOpen && (
              <div className="filter-dropdown-panel" style={{ minWidth: '150px' }}>
                <div className="filter-options-list">
                  {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map(s => (
                    <button
                      type="button"
                      key={s}
                      className={`filter-option-item ${statusFilter === s ? 'active' : ''}`}
                      onClick={() => {
                        setStatusFilter(s);
                        setStatusMenuOpen(false);
                      }}
                    >
                      {statusFilter === s && <Check size={12} />}
                      <span className="filter-option-label">{STATUS_FILTER_LABELS[s]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="filter-search-inline">
            <Search size={12} className="filter-search-inline-icon" />
            <input
              type="text"
              className="filter-search-inline-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="filter-search-inline-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {displayedConversations.length === 0 ? (
          <div className="conversations-empty-state">
            No conversations found.
          </div>
        ) : (
          displayedConversations.map(c => {
            const isActive = c.id === selectedConversationId;
            const hasFailedMessage = c.messages && c.messages.some((m: any) => m.status === 'failed' || m.errorCode);
            const formattedTime = c.lastMessage
              ? formatContextualDateTime(c.lastMessage.timestamp)
              : (c.createdAt ? formatContextualDateTime(c.createdAt) : '');

            const previewText = formatMessagePreview(c.lastMessage?.text || '', hasFailedMessage);

            // Waiting-on-reply indicator: only meaningful while open and the customer sent the last message
            const isAwaitingReply = c.status === 'open' && !hasFailedMessage && c.lastMessage?.sender === 'user';
            const waitingMinutes = isAwaitingReply
              ? Math.floor((Date.now() - new Date(c.lastMessage!.timestamp).getTime()) / 60000)
              : 0;
            const waitingLabel = waitingMinutes >= 60
              ? `Waiting ${Math.floor(waitingMinutes / 60)}h`
              : `Waiting ${waitingMinutes}m`;

            return (
              <div
                key={c.id}
                className={`conversation-row ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedConversationId(c.id)}
                style={hasFailedMessage && !isActive ? { borderLeftColor: 'rgba(244, 63, 94, 0.7)' } : {}}
              >
                <div className="conversation-row-top">
                  <span className="row-name">{c.userName}</span>
                  <span className={`row-tag ${c.productId}`}>
                    {c.productName}
                  </span>
                </div>

                <div className="row-last-message" style={hasFailedMessage ? { color: '#fb7185' } : {}}>
                  {previewText}
                </div>

                <div className="row-meta">
                  {hasFailedMessage ? (
                    <span className="status-pill status-failed">
                      <span className="status-dot" />
                      Failed
                    </span>
                  ) : (
                    <span className={`status-pill ${c.status === 'open' ? 'status-open' : 'status-resolved'}`}>
                      <span className="status-dot" />
                      {c.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  )}
                  {isAwaitingReply && waitingMinutes >= 2 && (
                    <span
                      className={`waiting-badge ${waitingMinutes >= 60 ? 'waiting-urgent' : waitingMinutes >= 15 ? 'waiting-warning' : ''}`}
                      title="Time since the customer's last message with no reply yet"
                    >
                      {waitingLabel}
                    </span>
                  )}
                  {c.assignedAdminName ? (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#60a5fa',
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '0.12rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}
                      title={`Assigned to ${c.assignedAdminName}`}
                    >
                      {c.assignedAdminName}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#eab308',
                        background: 'rgba(234, 179, 8, 0.1)',
                        padding: '0.12rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 500
                      }}
                      title="Unassigned ticket"
                    >
                      Unassigned
                    </span>
                  )}
                  <span className="row-time">{formattedTime}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Right Chat History & Reply box */}
      {currentConversation ? (
        <div className="chat-window">
          {/* Customer Header */}
          <div className="chat-header">
            <div className="chat-header-user-card">
              <div className="chat-header-avatar">
                {(currentConversation.userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="chat-header-user-info">
                <div className="chat-header-name-row">
                  <h2 className="chat-header-name">{currentConversation.userName}</h2>
                  <span className={`chat-header-product-pill ${currentConversation.productId}`}>
                    {currentConversation.productName}
                  </span>
                </div>
                <div className="chat-header-meta-row">
                  <span className="chat-meta-item phone">+{currentConversation.phone}</span>
                  <span className="chat-meta-sep">•</span>
                  <span className="chat-meta-item email">{currentConversation.userEmail || 'no-email@registered.com'}</span>
                  {(liveViewingAgent || currentConversation.viewingAgentName) && (
                    <>
                      <span className="chat-meta-sep">•</span>
                      <span className="chat-meta-item viewing-agent-notice" title="Coordinate before replying to avoid sending two different answers">
                        <Eye size={11} /> {liveViewingAgent || currentConversation.viewingAgentName} is also here
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="chat-header-actions">
              {/* Ticket Assignment Pill / Claim Ticket Button */}
              {currentConversation.assignedAdminName ? (
                <div
                  className="chat-assigned-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 500
                  }}
                  title={`Assigned to ${currentConversation.assignedAdminName}`}
                >
                  <Check size={11} />
                  <span>{currentConversation.assignedAdminName}</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-claim-header"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={handleClaimTicket}
                  disabled={isClaiming}
                  title="Claim this ticket and assign to yourself"
                >
                  <Plus size={12} />
                  <span>{isClaiming ? 'Claiming...' : 'Claim Ticket'}</span>
                </button>
              )}

              {/* Download a plain-text transcript for records/handoff */}
              <button
                type="button"
                className="btn-reassign-header"
                onClick={handleExportConversation}
                title="Export conversation transcript"
              >
                <Download size={13} />
                <span>Export</span>
              </button>

              {/* Reassign to a different team, in case this conversation was misrouted */}
              <div className="filter-dropdown">
                <button
                  type="button"
                  className="btn-reassign-header"
                  disabled={isReassigning}
                  onClick={() => setReassignMenuOpen(prev => !prev)}
                  title="Reassign to a different team"
                >
                  <ArrowRightLeft size={13} />
                  <span>{isReassigning ? 'Moving...' : 'Reassign'}</span>
                </button>

                {reassignMenuOpen && (
                  <div className="filter-dropdown-panel">
                    <div className="filter-options-list">
                      {allProducts.filter(p => p.id !== currentConversation.productId).map(p => (
                        <button
                          type="button"
                          key={p.id}
                          className="filter-option-item"
                          onClick={async () => {
                            setReassignMenuOpen(false);
                            setIsReassigning(true);
                            try {
                              await handleReassignConversation(currentConversation.id, p.id);
                            } finally {
                              setIsReassigning(false);
                            }
                          }}
                        >
                          <span className={`row-tag ${p.theme} filter-option-dot`} />
                          <span className="filter-option-label">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {currentConversation.status === 'resolved' ? (
                <div className="chat-status-pill-resolved">
                  <span>Closed</span>
                  {typeof currentConversation.csatRating === 'number' && (
                    <span className="csat-rating-badge" title="Customer satisfaction rating">
                      {'★'.repeat(currentConversation.csatRating)}{'☆'.repeat(5 - currentConversation.csatRating)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="chat-header-open-actions">
                  <div className="chat-status-pill-open">
                    <span className="status-dot" />
                    <span>Open</span>
                  </div>
                  <button
                    type="button"
                    className="btn-resolve-header"
                    disabled={isResolving}
                    onClick={async () => {
                      setIsResolving(true);
                      try {
                        await handleResolveConversation(currentConversation.id);
                      } finally {
                        setIsResolving(false);
                      }
                    }}
                    title="Close conversation"
                  >
                    <CheckCircle2 size={13} />
                    <span>{isResolving ? 'Closing...' : 'Close'}</span>
                  </button>
                </div>
              )}

              {/* Right-aligned header utilities: Live sync & Staff notes */}
              <div
                className="chat-header-actions-right"
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                {/* Real-time Connection Status Indicator */}
                <div
                  className="chat-ws-status"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.22rem 0.5rem',
                    borderRadius: '999px',
                    background: wsStatus === 'connected' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    color: wsStatus === 'connected' ? '#16a34a' : '#dc2626',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    border: wsStatus === 'connected' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    userSelect: 'none'
                  }}
                  title={wsStatus === 'connected' ? 'Real-time WebSocket connected' : 'WebSocket connecting or fallback active'}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: wsStatus === 'connected' ? '#22c55e' : '#ef4444',
                      display: 'inline-block'
                    }}
                  />
                  <span>{wsStatus === 'connected' ? 'Live Sync' : 'Reconnecting'}</span>
                </div>

                {/* Internal notes: staff-only, never sent to the customer */}
                <ConversationNotes
                  conversationId={currentConversation.id}
                  currentUser={currentUser}
                  getAuthHeaders={getAuthHeaders}
                />
              </div>
            </div>
          </div>

          {/* Delivery Failure Warning Banner */}
          {hasActiveFailure && (
            <div className="chat-delivery-warning">
              <div className="chat-delivery-warning-main">
                <AlertCircle size={15} className="chat-delivery-warning-icon" />
                <div className="chat-delivery-warning-body">
                  <div className="chat-delivery-warning-title">Message not delivered</div>
                  <div className="chat-delivery-warning-text">
                    This customer needs to message us before we can send another message.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-delivery-warning-action"
                onClick={() => {
                  openInitiateModal({
                    phone: currentConversation.phone,
                    name: currentConversation.userName || '',
                    productId: currentConversation.productId || 'prod_nexzentek',
                    messageType: 'template'
                  });
                }}
              >
                Send Approved Message
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div
            className="admin-messages-stream"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            {displayMessages.map((m: any, idx: number, arr: any[]) => {
              const isNewDay = idx === 0 || !isSameDay(new Date(m.timestamp), new Date(arr[idx - 1].timestamp));
              const isSystemOrTemplate = m.sender === 'system' || m.messageType === 'template';
              let cleanText = (m.text || '').replace(/^[❌⚠️🎫🔒🍎🏡🚧💻🛒👥📈🍲☕📅👋]\s*/, '');
              if (cleanText.toLowerCase().startsWith('selected product:') || cleanText.toLowerCase().startsWith('selected service:')) {
                cleanText = cleanText.replace(/^selected (product|service):\s*/i, 'Product: ');
              }

              if (isSystemOrTemplate) {
                const parsed = parseSystemEvent(m.text || '');
                const isFailed = m.status === 'failed' || (parsed.title && parsed.title.toLowerCase().includes('delivered'));
                const isClosed = parsed.title.toLowerCase().includes('closed');
                const isExpanded = expandedEventIds.has(m.id);

                return (
                  <React.Fragment key={m.id}>
                    {isNewDay && (
                      <div className="chat-date-separator">
                        <span className="chat-date-separator-pill" title={new Date(m.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
                          {formatDateSeparator(m.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className="system-event-row">
                      <div className={`system-event-content ${isFailed ? 'event-failed' : isClosed ? 'event-closed' : ''}`}>
                        <span className="system-event-time">
                          {formatContextualDateTime(m.timestamp)}
                        </span>
                        <span className="system-event-title">{parsed.title}</span>
                      {parsed.rawDetail && (
                        <button
                          type="button"
                          className="system-event-details-btn"
                          onClick={() => toggleEventDetails(m.id)}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </div>
                    {isExpanded && parsed.rawDetail && (
                      <div className="system-event-details-box">{parsed.rawDetail}</div>
                    )}
                  </div>
                </React.Fragment>
                );
              }

              const hasMedia = Boolean(m.mediaUrl);
              const isStickerMedia = hasMedia && (
                m.messageType === 'sticker' ||
                (m.mediaName || '').startsWith('sticker_')
              );
              const isImageMedia = hasMedia && !isStickerMedia && (
                m.messageType === 'image' ||
                (m.mediaType || '').startsWith('image/') ||
                ['.jpg', '.jpeg', '.png', '.webp'].some((ext: string) => (m.mediaUrl || '').toLowerCase().includes(ext))
              );
              const isDocMedia = hasMedia && (
                m.messageType === 'document' ||
                m.mediaType === 'application/pdf' ||
                (m.mediaUrl || '').toLowerCase().endsWith('.pdf')
              );
              const isVideoMedia = hasMedia && (
                m.messageType === 'video' ||
                (m.mediaType || '').startsWith('video/') ||
                (m.mediaUrl || '').toLowerCase().endsWith('.mp4')
              );
              const isAudioMedia = hasMedia && (
                m.messageType === 'audio' ||
                (m.mediaType || '').startsWith('audio/') ||
                ['.mp3', '.aac', '.ogg'].some((ext: string) => (m.mediaUrl || '').toLowerCase().includes(ext))
              );

              const mediaSrc = m.mediaUrl
                ? (m.mediaUrl.startsWith('http') ? m.mediaUrl : `${API_BASE.replace('/api', '')}${m.mediaUrl}`)
                : '';

              const userReaction = m.reactions?.user || null;
              const adminReaction = m.reactions?.admin || null;
              const legacyReaction = (!userReaction && !adminReaction) ? m.reaction : null;
              const hasAnyReaction = Boolean(userReaction || adminReaction || legacyReaction);
              const isSameReaction = Boolean(userReaction && adminReaction && userReaction === adminReaction);

              return (
                <React.Fragment key={m.id}>
                  {isNewDay && (
                    <div className="chat-date-separator">
                      <span className="chat-date-separator-pill" title={new Date(m.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
                        {formatDateSeparator(m.timestamp)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`admin-msg-bubble ${m.sender} ${hasMedia ? 'bubble-has-media' : ''} ${hasAnyReaction ? 'has-reaction' : ''} ${isStickerMedia ? 'bubble-is-sticker' : ''}`}
                    style={m.status === 'failed' ? { border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.06)' } : {}}
                  >
                  {/* Quick reaction trigger button */}
                  <div className="msg-bubble-actions">
                    <button
                      type="button"
                      className="btn-msg-react-trigger"
                      title="React to message"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveReactionMenuMsgId(prev => prev === m.id ? null : m.id);
                      }}
                    >
                      <Smile size={13} />
                    </button>
                  </div>

                  {/* Floating Quick Reactions Picker Bar */}
                  {activeReactionMenuMsgId === m.id && (
                    <div className="msg-quick-reactions-bar" onClick={(e) => e.stopPropagation()}>
                      {QUICK_REACTIONS.map((emoji) => {
                        const isSelected = adminReaction === emoji;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`quick-reaction-emoji-btn ${isSelected ? 'is-selected' : ''}`}
                            title={isSelected ? 'Remove reaction' : `React with ${emoji}`}
                            onClick={() => handleToggleReaction(currentConversation.id, m.id, emoji)}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Media Content */}
                  {hasMedia && (
                    <div className="msg-media-block">
                      {isStickerMedia && (
                        <div className="msg-media-sticker-wrapper">
                          <img
                            src={mediaSrc}
                            alt={m.mediaName || 'WhatsApp Sticker'}
                            className="msg-media-sticker"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {isImageMedia && (
                        <div
                          className="msg-media-image-wrapper"
                          onClick={() => setLightboxMedia({ url: mediaSrc, title: m.mediaName || 'Image attachment' })}
                          title="Click to view full image"
                        >
                          <img
                            src={mediaSrc}
                            alt={m.mediaName || 'Image attachment'}
                            className="msg-media-image"
                            loading="lazy"
                          />
                          <div className="msg-media-image-overlay">
                            <Maximize2 size={14} />
                          </div>
                        </div>
                      )}

                      {isDocMedia && (
                        <a
                          href={mediaSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={m.mediaName || 'document.pdf'}
                          className="msg-media-doc-card"
                          title="Click to open or download PDF"
                        >
                          <div className="doc-icon-badge">
                            <FileText size={20} />
                            <span className="doc-badge-ext">PDF</span>
                          </div>
                          <div className="doc-card-info">
                            <span className="doc-filename">{m.mediaName || 'document.pdf'}</span>
                            <span className="doc-filesize">
                              {formatFileSize(m.mediaSize) ? `PDF • ${formatFileSize(m.mediaSize)}` : 'PDF Document'}
                            </span>
                          </div>
                          <div className="doc-download-action">
                            <Download size={14} />
                          </div>
                        </a>
                      )}

                      {isVideoMedia && (
                        <div className="msg-media-video-wrapper">
                          <video src={mediaSrc} controls className="msg-media-video" preload="metadata" />
                        </div>
                      )}

                      {isAudioMedia && (
                        <div className="msg-media-audio-wrapper">
                          <audio src={mediaSrc} controls className="msg-media-audio" preload="metadata" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text / Caption */}
                  {cleanText && (!hasMedia || (cleanText !== m.mediaName && !isStickerMedia)) && (
                    <div className="msg-body-text" style={{ wordBreak: 'break-word', marginTop: hasMedia ? '0.35rem' : 0 }}>
                      {cleanText.includes('https://maps.google.com') ? (
                        <div>
                          <div>{cleanText.split('https://maps.google.com')[0]}</div>
                          <a
                            href={`https://maps.google.com${cleanText.split('https://maps.google.com')[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', textDecoration: 'underline', marginTop: '0.25rem', fontSize: '0.85rem' }}
                          >
                            🗺️ Open in Google Maps
                          </a>
                        </div>
                      ) : (
                        cleanText
                      )}
                    </div>
                  )}

                  {/* Message status indicators */}
                  {m.status === 'failed' || m.errorCode ? (
                    <div className="msg-failure-box">
                      <div className="msg-failure-title">
                        <AlertCircle size={12} /> Message not delivered
                      </div>
                      <div className="msg-failure-desc">
                        Waiting for the customer to message us first.
                      </div>
                    </div>
                  ) : null}

                  {/* Unified Compact Message Metadata (Timestamp + Delivery/Read Receipt) */}
                  <div className="admin-msg-meta">
                    <span className="admin-msg-time">
                      {formatTimeOnly(m.timestamp)}
                    </span>
                    {m.sender === 'admin' && m.status !== 'failed' && !m.errorCode && (
                      <span className={`msg-delivered-receipt ${m.status === 'read' ? 'receipt-read' : ''}`}>
                        {m.status === 'read' || m.status === 'delivered' ? (
                          <CheckCheck size={11} />
                        ) : (
                          <Check size={11} />
                        )}
                        <span className="receipt-text">{m.status === 'read' ? 'Read' : m.status === 'delivered' ? 'Delivered' : 'Sent'}</span>
                      </span>
                    )}
                  </div>

                  {/* WhatsApp Reaction Badge */}
                  {hasAnyReaction && (
                    <div
                      className={`msg-reaction-badge ${(userReaction && adminReaction) ? 'has-multiple' : ''}`}
                      title={
                        isSameReaction
                          ? `Customer & You reacted with ${userReaction} (Click to remove your reaction)`
                          : userReaction && adminReaction
                            ? `Customer: ${userReaction} • You: ${adminReaction} (Click to remove your reaction)`
                            : adminReaction
                              ? `You reacted with ${adminReaction} (Click to remove)`
                              : `Customer reacted with ${userReaction || legacyReaction}`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (adminReaction) {
                          handleToggleReaction(currentConversation.id, m.id, adminReaction);
                        }
                      }}
                    >
                      {isSameReaction ? (
                        <>
                          <span className="msg-reaction-emoji">{userReaction}</span>
                          <span className="msg-reaction-count">2</span>
                        </>
                      ) : userReaction && adminReaction ? (
                        <>
                          <span className="msg-reaction-emoji">{userReaction}</span>
                          <span className="msg-reaction-emoji">{adminReaction}</span>
                        </>
                      ) : (
                        <span className="msg-reaction-emoji">{userReaction || adminReaction || legacyReaction}</span>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
              );
            })}
            <div ref={adminChatEndRef} />
          </div>

          {/* Floating Scroll To Bottom button (WhatsApp style, appears when scrolled up) */}
          {showScrollToBottom && (
            <button
              type="button"
              className="btn-scroll-to-bottom"
              onClick={() => scrollToBottom('smooth')}
              title="Scroll to latest messages"
              aria-label="Scroll to latest messages"
            >
              <ChevronDown size={18} />
            </button>
          )}

          {/* Message Composer Area */}
          <div className="chat-composer-container">
            {/* Secondary utility/status row */}
            <div className="composer-utility-row">
              <div className="composer-utility-left">
                {currentConversation.status === 'resolved' ? (
                  <div className="composer-status-notice">
                    <span className="composer-status-dot" />
                    <span>Conversation closed · Replying will reopen it</span>
                  </div>
                ) : isSessionExpired ? (
                  <div className="composer-status-notice session-expired">
                    <span className="composer-status-dot expired" />
                    <span>Session window expired · Customer must message first</span>
                    <button
                      type="button"
                      className="help-inline-link"
                      onClick={() => navigate('/help', { state: { articleId: 'messaging-window-overview' } })}
                    >
                      Why?
                    </button>
                  </div>
                ) : (
                  <div className="composer-status-notice session-active">
                    <span className="composer-status-dot" style={{ background: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' }} />
                    <span style={{ color: '#059669', fontWeight: 500 }}>
                      {sessionWindowRemaining ? `Window Active · ${sessionWindowRemaining} remaining` : 'Window Active · 24 hours'}
                    </span>
                  </div>
                )}
              </div>
              <div className="composer-utility-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isSessionExpired && currentConversation.status === 'open' && (
                  <button
                    type="button"
                    className="btn-send-followup-template"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={handleSendReengagement}
                    disabled={isSendingReengagement}
                    title="Send an approved Meta utility follow-up template to reopen the 24-hour window"
                  >
                    <Send size={12} />
                    <span>{isSendingReengagement ? 'Sending...' : 'Send Follow-Up Template'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-send-approved-action"
                  title="Send an approved message template"
                  onClick={() => {
                    openInitiateModal({
                      phone: currentConversation.phone,
                      name: currentConversation.userName || '',
                      productId: currentConversation.productId || 'prod_nexzentek',
                      messageType: 'template'
                    });
                  }}
                >
                  <Plus size={12} />
                  <span>Send Approved Message</span>
                </button>
              </div>
            </div>

            {/* Inline Attachment Preview */}
            {attachedFile && (
              <div className="composer-attachment-preview">
                <div className="composer-preview-info">
                  {attachedFile.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].some(x => attachedFile.name.toLowerCase().endsWith(x)) ? (
                    <div className="composer-preview-thumb">
                      <img src={filePreviewUrl || ''} alt="Preview" />
                    </div>
                  ) : attachedFile.name.toLowerCase().endsWith('.pdf') || attachedFile.type === 'application/pdf' ? (
                    <div className="composer-preview-doc-icon">
                      <FileText size={20} />
                    </div>
                  ) : attachedFile.type.startsWith('video/') || attachedFile.name.toLowerCase().endsWith('.mp4') ? (
                    <div className="composer-preview-media-icon video">
                      <Film size={20} />
                    </div>
                  ) : (
                    <div className="composer-preview-media-icon audio">
                      <Music size={20} />
                    </div>
                  )}
                  <div className="composer-preview-details">
                    <span className="composer-preview-filename" title={attachedFile.name}>{attachedFile.name}</span>
                    <span className="composer-preview-meta">
                      {attachedFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : attachedFile.type.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(attachedFile.size)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="composer-preview-remove-btn"
                  onClick={handleRemoveAttachment}
                  title="Remove attachment"
                  disabled={adminIsSending}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Upload Progress Indicator */}
            {uploadProgress !== null && (
              <div className="composer-upload-progress">
                <div className="upload-progress-label">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="upload-progress-track">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Inline Media Error Notice */}
            {mediaError && (
              <div className="composer-media-error-bar">
                <div className="composer-media-error-text">
                  <AlertCircle size={14} />
                  <span>{mediaError}</span>
                </div>
                <div className="composer-media-error-actions">
                  {attachedFile && (
                    <button
                      type="button"
                      className="btn-media-retry"
                      onClick={handleComposerSubmit}
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-media-error-close"
                    onClick={() => setMediaError(null)}
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Primary Message Composer */}
            <form className="chat-composer-form" onSubmit={handleComposerSubmit}>
              <div className="composer-input-wrapper">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,audio/mpeg,audio/aac,audio/ogg"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  disabled={adminIsSending || isSessionExpired}
                />

                {/* Paperclip / Attachment Button */}
                <button
                  type="button"
                  className={`composer-attachment-btn ${attachedFile ? 'active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={adminIsSending || isSessionExpired}
                  title={
                    isSessionExpired
                      ? 'Attachments disabled: Customer must message first'
                      : 'Attach image, PDF, audio, or video'
                  }
                >
                  <Paperclip size={16} />
                </button>

                <input
                  type="text"
                  required={!attachedFile}
                  className="composer-input-field"
                  placeholder={
                    isSessionExpired
                      ? 'Reply window expired · Use Send Approved Message below'
                      : attachedFile
                      ? 'Add a message...'
                      : `Write a reply to ${currentConversation.userName}...`
                  }
                  value={adminInput}
                  onChange={e => setAdminInput(e.target.value)}
                  disabled={adminIsSending || (isSessionExpired && !attachedFile)}
                />

                <button
                  type="submit"
                  className="composer-inline-send-btn"
                  title="Send (Enter)"
                  disabled={adminIsSending || isSessionExpired || (!adminInput.trim() && !attachedFile)}
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="chat-window-placeholder">
          <MessageSquare size={48} style={{ color: 'var(--text-muted)' }} />
          <h3>Select a Conversation</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Customer messages appear here, organized by team.
          </p>
        </div>
      )}

      {/* Lightbox Modal for Image Previews */}
      {lightboxMedia && (
        <div className="media-lightbox-overlay" onClick={() => setLightboxMedia(null)}>
          <div className="media-lightbox-modal" onClick={e => e.stopPropagation()}>
            <div className="media-lightbox-header">
              <span className="media-lightbox-title">{lightboxMedia.title}</span>
              <div className="media-lightbox-actions">
                <a
                  href={lightboxMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="media-lightbox-btn"
                  title="Download file"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  className="media-lightbox-btn"
                  onClick={() => setLightboxMedia(null)}
                  title="Close preview (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="media-lightbox-body">
              <img src={lightboxMedia.url} alt={lightboxMedia.title} className="media-lightbox-img" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
