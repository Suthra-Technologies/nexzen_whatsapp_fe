import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Laptop } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LandingView } from './components/LandingView';
import { PublicHeader } from './components/public/PublicHeader';
import { PublicFooter } from './components/public/PublicFooter';
import { SupportCenter } from './components/SupportCenter';
import { ConfigHub } from './components/config/ConfigHub';
import { HelpCenter } from './components/help/HelpCenter';
// WhatsApp preview paused for now.
// import { WhatsAppSimulator } from './components/simulator/WhatsAppSimulator';
import { InitiateModal } from './components/InitiateModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { API_BASE, ICON_MAP } from './constants';
import { normalizePhoneNumber, parsePhoneAndCountry } from './utils/phoneUtils';
import { wsService } from './services/websocket';
import { notificationService } from './utils/notificationService';
import { InAppNotificationToast, type InAppNotificationItem } from './components/InAppNotificationToast';
import { BroadcastsView } from './components/broadcasts/BroadcastsView';
import { DemoRequestsView } from './components/demos/DemoRequestsView';
import { ActionCenterPanel } from './components/notifications/ActionCenterPanel';
import type { AdminUser, Conversation, Product, WhatsAppTemplate } from './types';

type ConfigSubTab = 'products' | 'templates' | 'settings' | 'analytics' | 'staff';
type TopTab = 'landing' | 'admin' | 'broadcasts' | 'demos' | 'config' | 'login' | 'help';

const CONFIG_SUB_TABS: ConfigSubTab[] = ['products', 'templates', 'staff', 'settings', 'analytics'];
const TOP_TAB_PATHS: Record<TopTab, string> = {
  landing: '/',
  admin: '/support',
  broadcasts: '/broadcasts',
  demos: '/demos',
  config: '/config/products',
  login: '/staff-login',
  help: '/help'
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Route categories
  const isAuthRoute = pathname === '/staff-login' || pathname === '/login';
  const isSupportRoute = pathname.startsWith('/support') || pathname === '/conversations' || pathname === '/admin';
  const isBroadcastRoute = pathname.startsWith('/broadcasts') || pathname.startsWith('/campaigns');
  const isDemosRoute = pathname.startsWith('/demos');
  const isConfigRoute = pathname.startsWith('/config') || pathname === '/settings' || pathname === '/catalog';
  const isHelpRoute = pathname === '/help';
  const isProtectedRoute = isSupportRoute || isBroadcastRoute || isDemosRoute || isConfigRoute || isHelpRoute;

  // Navigation is derived from the URL so pages have real, bookmarkable/refreshable routes
  const activeTab: TopTab = isAuthRoute
    ? 'login'
    : isSupportRoute
      ? 'admin'
      : isBroadcastRoute
        ? 'broadcasts'
        : isDemosRoute
          ? 'demos'
          : isConfigRoute
          ? 'config'
          : isHelpRoute
            ? 'help'
            : 'landing';

  const configSubTab: ConfigSubTab =
    pathname === '/settings'
      ? 'settings'
      : pathname === '/catalog'
        ? 'products'
        : (CONFIG_SUB_TABS.find(t => pathname === `/config/${t}`) || 'products');

  // System status
  const [backendOnline, setBackendOnline] = useState(false);
  // WhatsApp preview paused for now.
  // const [simulatorOpen, setSimulatorOpen] = useState(() => {
  //   const saved = localStorage.getItem('nexzen_simulator_open');
  //   return saved === null ? true : saved === 'true';
  // });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('nexzen_sidebar_collapsed') === 'true';
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('nexzen_auth_token') || sessionStorage.getItem('nexzen_auth_token');
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingTab, setPendingTab] = useState<TopTab | null>(null);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);

  const [dbProducts, setDbProducts] = useState<any[]>([]);

  // Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [isSimulatedTemplates, setIsSimulatedTemplates] = useState(false);

  // Customer Registration (Landing View)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+91');
  const [regSuccess, setRegSuccess] = useState(false);
  const [registeredNumber, setRegisteredNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [regConsent, setRegConsent] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Simulator shared context paused for now.
  // const [simulatorPhone, setSimulatorPhone] = useState('');
  // const [simulatorName, setSimulatorName] = useState('');
  // const [simulatedUsers, setSimulatedUsers] = useState<SimulatedUser[]>([]);

  // Admin / Support Center
  const [adminProductFilter, setAdminProductFilter] = useState<string>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState('');
  const [adminIsSending, setAdminIsSending] = useState(false);
  const adminChatEndRef = useRef<HTMLDivElement>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // In-App Real-time Notification Toasts
  const [inAppNotifs, setInAppNotifs] = useState<InAppNotificationItem[]>([]);
  const dismissInAppNotif = (id: string) => {
    setInAppNotifs(prev => prev.filter(n => n.id !== id));
  };

  // Initiate Outbound Conversation Modal
  const [initiateModalOpen, setInitiateModalOpen] = useState(false);
  const [initiatePhone, setInitiatePhone] = useState('');
  const [initiateCountryCode, setInitiateCountryCode] = useState('+1');
  const [initiateName, setInitiateName] = useState('');
  const [initiateProductId, setInitiateProductId] = useState('prod_nexzentek');
  const [initiateMessageType, setInitiateMessageType] = useState<'template' | 'custom'>('template');
  const [initiateTemplateName, setInitiateTemplateName] = useState('nexzentek_service_welcome');
  const [initiateTemplateParams, setInitiateTemplateParams] = useState<string[]>([]);
  const [initiateCustomMessage, setInitiateCustomMessage] = useState('');
  const [initiateIsSending, setInitiateIsSending] = useState(false);

  // Derive products directly from database records
  const displayProducts: Product[] = dbProducts.map(dbP => ({
    id: dbP.id,
    name: dbP.name,
    description: dbP.description || '',
    welcomeMessage: dbP.welcomeMessage,
    redirectUrl: dbP.redirectUrl,
    icon: ICON_MAP[dbP.icon] || Laptop,
    theme: dbP.theme || 'prod_nexzentek',
    imageUrl: dbP.imageUrl || '',
    features: Array.isArray(dbP.features)
      ? dbP.features
      : (typeof dbP.features === 'string' && dbP.features.trim().length > 0)
        ? dbP.features.split(',').map((f: string) => f.trim())
        : ['WhatsApp Support', '24/7 Dedicated Care', 'Direct Team Access'],
    isActive: dbP.isActive !== false,
    isFeatured: dbP.isFeatured === true
  }));

  // Check existing session token on mount
  useEffect(() => {
    const token = localStorage.getItem('nexzen_auth_token') || sessionStorage.getItem('nexzen_auth_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.user) {
          setCurrentUser(data.user);
          setAuthToken(token);
        } else {
          localStorage.removeItem('nexzen_auth_token');
          sessionStorage.removeItem('nexzen_auth_token');
          setCurrentUser(null);
          setAuthToken(null);
        }
      })
      .catch(() => {
        // Network offline or connecting
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Canonical route aliasing and redirect handling
  useEffect(() => {
    // Alias /login -> /staff-login
    if (pathname === '/login') {
      navigate('/staff-login', { replace: true });
      return;
    }
    // Alias /conversations or /admin -> /support
    if (pathname === '/conversations' || pathname === '/admin') {
      navigate('/support', { replace: true });
      return;
    }
    // Alias /settings -> /config/settings
    if (pathname === '/settings') {
      navigate('/config/settings', { replace: true });
      return;
    }
    // Alias /catalog -> /config/products
    if (pathname === '/catalog') {
      navigate('/config/products', { replace: true });
      return;
    }
    // Alias /config -> /config/products
    if (pathname === '/config') {
      navigate('/config/products', { replace: true });
      return;
    }
    // Alias /explore -> /
    if (pathname === '/explore') {
      navigate('/', { replace: true });
      return;
    }

    // Known valid paths
    const isKnown =
      pathname === '/' ||
      pathname === '/services' ||
      pathname === '/staff-login' ||
      pathname === '/help' ||
      pathname.startsWith('/support') ||
      pathname.startsWith('/broadcasts') ||
      pathname.startsWith('/campaigns') ||
      pathname.startsWith('/demos') ||
      pathname.startsWith('/config/') ||
      CONFIG_SUB_TABS.some(t => pathname === `/config/${t}`);

    if (!isKnown) {
      navigate('/', { replace: true });
    }
  }, [pathname, navigate]);

  // Guard protected routes: bounce unauthenticated visitors to /staff-login once session check settles
  useEffect(() => {
    if (!authChecked) return;
    if (isProtectedRoute && !currentUser) {
      setRedirectAfterLogin(pathname);
      navigate('/staff-login', { replace: true });
    }
  }, [authChecked, currentUser, isProtectedRoute, pathname, navigate]);

  // If already authenticated and visiting /staff-login, redirect to support
  useEffect(() => {
    if (authChecked && currentUser && isAuthRoute) {
      navigate('/support', { replace: true });
    }
  }, [authChecked, currentUser, isAuthRoute, navigate]);

  // Remember the WhatsApp preview panel and sidebar collapse state across refreshes
  // WhatsApp preview persistence paused for now.
  // useEffect(() => {
  //   localStorage.setItem('nexzen_simulator_open', String(simulatorOpen));
  // }, [simulatorOpen]);

  useEffect(() => {
    localStorage.setItem('nexzen_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getAuthHeaders = (): Record<string, string> => {
    const token = authToken || localStorage.getItem('nexzen_auth_token') || sessionStorage.getItem('nexzen_auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleTabChange = (tab: TopTab) => {
    if (tab === 'login') {
      navigate('/staff-login');
      return;
    }
    if (tab !== 'landing' && !currentUser) {
      setPendingTab(tab);
      navigate('/staff-login');
      return;
    }
    if (tab === 'config') {
      navigate(`/config/${configSubTab}`);
      return;
    }
    navigate(TOP_TAB_PATHS[tab]);
  };

  const handleSetConfigSubTab = (tab: ConfigSubTab) => {
    navigate(`/config/${tab}`);
  };

  const handleLoginSuccess = (token: string, user: AdminUser, staySignedIn = true) => {
    if (staySignedIn) {
      localStorage.setItem('nexzen_auth_token', token);
      sessionStorage.removeItem('nexzen_auth_token');
    } else {
      sessionStorage.setItem('nexzen_auth_token', token);
      localStorage.removeItem('nexzen_auth_token');
    }
    setAuthToken(token);
    setCurrentUser(user);
    const destination = redirectAfterLogin || (pendingTab ? (pendingTab === 'config' ? '/config/products' : TOP_TAB_PATHS[pendingTab]) : '/support');
    setPendingTab(null);
    setRedirectAfterLogin(null);
    navigate(destination, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('nexzen_auth_token');
    sessionStorage.removeItem('nexzen_auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    navigate('/staff-login');
  };

  const loadDbProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const data = await res.json();
        setDbProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTemplates = async () => {
    setIsTemplatesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
        setIsSimulatedTemplates(!!data.simulation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTemplatesLoading(false);
    }
  };

  // Poll backend status and load initial state
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/products`);
        if (res.ok) {
          setBackendOnline(true);
          const data = await res.json();
          setDbProducts(data);
        } else {
          setBackendOnline(false);
        }
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkStatus();
    loadTemplates();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect WebSocket with current auth token
  useEffect(() => {
    wsService.connect(authToken || undefined);
  }, [authToken]);

  // Subscribe to real-time WebSocket events for instant updates
  useEffect(() => {
    const unsubConv = wsService.on('conversation:updated', (payload: any) => {
      const updatedConv = payload?.conversation || payload;
      if (!updatedConv || !updatedConv.id) return;

      // Check for incoming customer message to alert staff
      const msgs = Array.isArray(updatedConv.messages) ? updatedConv.messages : [];
      const incomingMsg = payload?.message?.sender === 'user' ? payload.message : (
        msgs.length > 0 && msgs[msgs.length - 1]?.sender === 'user' ? msgs[msgs.length - 1] : null
      );

      if (incomingMsg && (incomingMsg.id || incomingMsg.whatsappMessageId)) {
        const msgKey = incomingMsg.whatsappMessageId || incomingMsg.id;
        if (!seenMessageIdsRef.current.has(msgKey)) {
          seenMessageIdsRef.current.add(msgKey);
          if (incomingMsg.id) seenMessageIdsRef.current.add(incomingMsg.id);

          // Audio notification chime
          notificationService.playNotificationSound();

          // Desktop Push Notification
          const senderName = updatedConv.userName || 'Customer';
          const phone = updatedConv.phone ? `+${updatedConv.phone}` : '';
          let snippet = incomingMsg.text || '';
          if (incomingMsg.messageType === 'sticker') snippet = 'Sent a sticker';
          else if (incomingMsg.messageType === 'image') snippet = incomingMsg.caption ? `📷 ${incomingMsg.caption}` : '📷 Sent a photo';
          else if (incomingMsg.messageType === 'document') snippet = `📄 ${incomingMsg.mediaName || 'Document'}`;
          else if (incomingMsg.messageType === 'audio') snippet = '🎵 Voice message';

          notificationService.showDesktopNotification({
            title: `${senderName} ${phone ? `(${phone})` : ''}`,
            body: snippet,
            tag: `conv_${updatedConv.id}`,
            onClick: () => {
              navigate('/support');
              setSelectedConversationId(updatedConv.id);
            }
          });

          // In-App Notification Toast (on-screen popup at application root)
          const newNotifItem: InAppNotificationItem = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            conversationId: updatedConv.id,
            senderName,
            phone: updatedConv.phone || '',
            text: snippet,
            messageType: incomingMsg.messageType,
            timestamp: Date.now()
          };
          setInAppNotifs(prev => [newNotifItem, ...prev.slice(0, 2)]);
          setTimeout(() => {
            setInAppNotifs(prev => prev.filter(n => n.id !== newNotifItem.id));
          }, 7000);
        }
      }

      setConversations(prev => {
        const index = prev.findIndex(c => c.id === updatedConv.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = { ...next[index], ...updatedConv };
          return next;
        } else {
          return [updatedConv, ...prev];
        }
      });

      // WhatsApp preview user list paused for now.
      // if (updatedConv.phone && updatedConv.userName) {
      //   setSimulatedUsers(prev => {
      //     if (prev.some(u => u.phone === updatedConv.phone)) return prev;
      //     return [...prev, { phone: updatedConv.phone, name: updatedConv.userName }];
      //   });
      // }
    });

    const unsubStatus = wsService.on('message:status', (payload: any) => {
      const { phone, status } = payload || {};
      if (!phone || !status) return;

      setConversations(prev => prev.map(c => {
        if (c.phone === phone && Array.isArray(c.messages) && c.messages.length > 0) {
          const updated = [...c.messages];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].sender === 'admin') {
              updated[i] = { ...updated[i], status };
              break;
            }
          }
          return { ...c, messages: updated };
        }
        return c;
      }));
    });

    return () => {
      unsubConv();
      unsubStatus();
    };
  }, []);

  // Listen for in-app notification test triggers
  useEffect(() => {
    const handleTestEvent = () => {
      const testItem: InAppNotificationItem = {
        id: `test_${Date.now()}`,
        conversationId: selectedConversationId || (conversations[0]?.id || 'conv_ua6mbzbyx'),
        senderName: 'Test Customer',
        phone: '919347708120',
        text: 'Hello! This is an in-app WhatsApp notification test.',
        timestamp: Date.now()
      };
      setInAppNotifs(prev => [testItem, ...prev.slice(0, 2)]);
      setTimeout(() => {
        setInAppNotifs(prev => prev.filter(n => n.id !== testItem.id));
      }, 7000);
    };
    window.addEventListener('test-in-app-notif', handleTestEvent);
    return () => window.removeEventListener('test-in-app-notif', handleTestEvent);
  }, [selectedConversationId, conversations]);

  // Poll Conversations for Admin Dashboard as silent fallback (every 30s) & update simulated users
  useEffect(() => {
    if (activeTab !== 'admin' && !regSuccess) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/conversations`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);

          // Harvest seen message IDs so pre-existing history does not trigger alerts
          data.forEach((c: any) => {
            if (Array.isArray(c.messages)) {
              c.messages.forEach((m: any) => {
                if (m.id) seenMessageIdsRef.current.add(m.id);
                if (m.whatsappMessageId) seenMessageIdsRef.current.add(m.whatsappMessageId);
              });
            }
          });

          // Harvest unique users for the simulator selector.
          // WhatsApp preview user list paused for now.
          // const usersMap = new Map<string, string>();
          // data.forEach((c: any) => {
          //   if (c.phone) usersMap.set(c.phone, c.userName);
          // });
          // const usersList = Array.from(usersMap.entries()).map(([phone, name]) => ({ phone, name }));
          // setSimulatedUsers(usersList);
        }
      } catch (e) {
        console.error('Failed to fetch conversations', e);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [activeTab, regSuccess, authToken]);

  // Chat scroll is now handled smartly inside SupportCenter (respecting user's scroll position)

  // Immediately update conversation state on custom events
  useEffect(() => {
    const handleConvUpdated = (e: any) => {
      const updatedConv = e.detail;
      if (updatedConv && updatedConv.id) {
        setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
      }
    };
    window.addEventListener('conversationUpdated', handleConvUpdated);
    return () => window.removeEventListener('conversationUpdated', handleConvUpdated);
  }, []);

  // Registration Submit Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) return;

    if (!regConsent) {
      alert('Please agree to receive WhatsApp messages before continuing.');
      return;
    }

    const formattedPhone = normalizePhoneNumber(regPhone, regCountryCode);
    const dialCode = regCountryCode === '+1-CA' ? '1' : regCountryCode.replace(/[^0-9]/g, '');

    if (!formattedPhone || formattedPhone.length < 9) {
      alert('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    // Email is not required on the public form; generate standard client email for backend compatibility
    const emailToSubmit = regEmail.trim() || `${formattedPhone}@client.nexzen.com`;

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: emailToSubmit,
          phone: formattedPhone,
          countryCode: dialCode,
          consent: regConsent,
          productId: selectedProductId || undefined
        })
      });

        const data = await res.json();
        if (res.ok) {
          setRegisteredNumber(data.phone);
          // WhatsApp preview selected contact paused for now.
          // setSimulatorPhone(data.phone);
          // setSimulatorName(regName.trim());

          // if (!simulatedUsers.some(u => u.phone === data.phone)) {
          //   setSimulatedUsers(prev => [...prev, { phone: data.phone, name: regName.trim() }]);
          // }

        setRegSuccess(true);
        setSelectedProductId(null);
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegConsent(false);
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (e) {
      alert('Failed to connect to backend server. Make sure the backend node process is running on port 3000.');
    } finally {
      setIsLoading(false);
    }
  };

  // Support Center: Send Reply
  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedConversationId) return;

    setAdminIsSending(true);
    const textReply = adminInput;
    setAdminInput('');

    try {
      const res = await fetch(`${API_BASE}/admin/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ conversationId: selectedConversationId, text: textReply })
      });
      if (!res.ok) {
        alert('Failed to send reply.');
      }
    } catch (e) {
      console.error(e);
      alert('Error sending admin response.');
    } finally {
      setAdminIsSending(false);
    }
  };

  // Support Center: Send Media Reply
  const handleAdminSendMediaReply = async ({
    file,
    caption,
    onProgress
  }: {
    file: File;
    caption?: string;
    onProgress?: (pct: number) => void;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!file || !selectedConversationId) {
      return { success: false, error: 'No file or conversation selected.' };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', selectedConversationId);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/admin/reply-media`);

      const headers = getAuthHeaders();
      for (const [key, val] of Object.entries(headers)) {
        xhr.setRequestHeader(key, val);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            if (data.conversation) {
              setConversations(prev =>
                prev.map(c => (c.id === data.conversation.id ? data.conversation : c))
              );
            }
            resolve({ success: true });
          } else {
            resolve({ success: false, error: data.error || 'Media could not be sent.' });
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Media could not be sent.' });
          }
        }
      };

      xhr.onerror = () => {
        resolve({ success: false, error: 'Media could not be sent.' });
      };

      xhr.send(formData);
    });
  };

  // Support Center: Mark Ticket Resolved
  const handleResolveConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to close this conversation?')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ conversationId })
      });
      if (!res.ok) {
        alert('Failed to resolve conversation');
      } else {
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, status: 'resolved' } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReassignConversation = async (conversationId: string, newProductId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/conversations/${conversationId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ productId: newProductId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to reassign conversation');
        return;
      }
      const newProduct = displayProducts.find(p => p.id === newProductId);
      setConversations(prev =>
        prev.map(c => (c.id === conversationId
          ? { ...c, productId: newProductId, productName: newProduct?.name || c.productName }
          : c))
      );
    } catch (e) {
      console.error(e);
      alert('Error reassigning conversation');
    }
  };

  // Outbound Conversation Initiator
  const openInitiateModal = (defaults?: {
    phone?: string;
    name?: string;
    productId?: string;
    messageType?: 'template' | 'custom';
  }) => {
    if (defaults) {
      if (defaults.phone !== undefined) {
        const parsed = parsePhoneAndCountry(defaults.phone);
        setInitiateCountryCode(parsed.countryCode);
        setInitiatePhone(parsed.nationalNumber);
      }
      if (defaults.name !== undefined) setInitiateName(defaults.name);
      if (defaults.productId !== undefined) setInitiateProductId(defaults.productId);
      if (defaults.messageType !== undefined) setInitiateMessageType(defaults.messageType);
    } else if (displayProducts.length > 0 && !initiateProductId) {
      setInitiateProductId(displayProducts[0].id);
    }
    setInitiateModalOpen(true);
  };

  const handleInitiateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initiatePhone.trim()) {
      alert('Phone number is required');
      return;
    }

    setInitiateIsSending(true);
    try {
      // Keep the exact slot count the template requires; only fill blank slots with a fallback,
      // never add/drop params, or Meta will reject the send for a variable-count mismatch.
      const templateParams = initiateTemplateParams.map(p => p.trim() || initiateName || 'User');

      const dialCode = initiateCountryCode === '+1-CA' ? '1' : initiateCountryCode.replace(/[^0-9]/g, '');
      const formattedPhone = normalizePhoneNumber(initiatePhone, initiateCountryCode);

      const payload = {
        phone: formattedPhone,
        countryCode: dialCode,
        name: initiateName,
        productId: initiateProductId,
        messageType: initiateMessageType,
        templateName: initiateTemplateName,
        templateParams,
        customMessage: initiateCustomMessage
      };

      const res = await fetch(`${API_BASE}/admin/conversations/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // WhatsApp preview selected contact paused for now.
        // setSimulatorPhone(data.conversation.phone);
        // setSimulatorName(data.conversation.userName || initiateName || 'User');
        setSelectedConversationId(data.conversation.id);

        const convRes = await fetch(`${API_BASE}/admin/conversations`, {
          headers: getAuthHeaders()
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          setConversations(convData);
        }

        setInitiateModalOpen(false);
        setInitiatePhone('');
        setInitiateName('');
        setInitiateTemplateParams([]);
        setInitiateCustomMessage('');
      } else {
        alert(data.error || 'Failed to initiate conversation');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error connecting to server: ' + (err.message || 'Network error'));
    } finally {
      setInitiateIsSending(false);
    }
  };

  // Staff assigned products filtering
  const staffAllowedProducts = useMemo(() => {
    if (!currentUser || currentUser.role === 'super_admin') {
      return displayProducts;
    }
    const allowed = currentUser.assignedProductIds || [];
    return displayProducts.filter(p => allowed.includes(p.id));
  }, [currentUser, displayProducts]);

  // Conversations filtered by staff permissions
  const visibleConversations = useMemo(() => {
    if (!currentUser || currentUser.role === 'super_admin') {
      return conversations;
    }
    const allowed = currentUser.assignedProductIds || [];
    return conversations.filter(c => allowed.includes(c.productId));
  }, [currentUser, conversations]);

  const currentConversation = visibleConversations.find(c => c.id === selectedConversationId);
  const filteredConversations = visibleConversations.filter(c => {
    if (adminProductFilter === 'all') return true;
    return c.productId === adminProductFilter;
  });

  // Conversations with an undelivered message, across every team the current user can see —
  // surfaced as a global badge so agents don't have to open each conversation to find these.
  const failedConversationsCount = useMemo(() => {
    return visibleConversations.filter(c =>
      c.messages && c.messages.some((m: any) => m.status === 'failed' || m.errorCode)
    ).length;
  }, [visibleConversations]);

  if (activeTab === 'landing') {
    return (
      <div className="public-website-root">
        <PublicHeader
          onStaffLoginClick={() => {
            if (currentUser) {
              navigate('/support');
            } else {
              navigate('/staff-login');
            }
          }}
          currentUser={currentUser}
        />
        <main className="public-website-main">
          <LandingView
            displayProducts={displayProducts}
            regName={regName}
            setRegName={setRegName}
            regPhone={regPhone}
            setRegPhone={setRegPhone}
            regCountryCode={regCountryCode}
            setRegCountryCode={setRegCountryCode}
            regSuccess={regSuccess}
            setRegSuccess={setRegSuccess}
            registeredNumber={registeredNumber}
            isLoading={isLoading}
            regConsent={regConsent}
            setRegConsent={setRegConsent}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            handleRegister={handleRegister}
          />
        </main>
        <PublicFooter
          onStaffLoginClick={() => {
            if (currentUser) {
              navigate('/support');
            } else {
              navigate('/staff-login');
            }
          }}
        />
      </div>
    );
  }

  // Standalone Authentication Screen (No internal sidebar or application header)
  if (activeTab === 'login') {
    return (
      <div className="standalone-auth-layout">
        <header className="standalone-auth-header">
          <div
            className="standalone-auth-brand"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            title="Return to NexZen Connect Home"
          >
            <div className="standalone-auth-logo">
              <img src="/32.png" alt="NexZen Connect" />
            </div>
            <div className="standalone-auth-brand-text">
              <span className="brand-title">NexZen Connect</span>
              <span className="brand-subtitle">HUB &amp; SUPPORT</span>
            </div>
          </div>
          <button
            type="button"
            className="standalone-back-website-btn"
            onClick={() => navigate('/')}
            title="Back to Public Website"
          >
            <ArrowLeft size={16} />
            <span>Back to Website</span>
          </button>
        </header>

        <main className="standalone-auth-main">
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onBackToLanding={() => navigate('/')}
            targetTabName={redirectAfterLogin && redirectAfterLogin.includes('config') ? 'Settings' : 'Support Center'}
          />
        </main>

        {/* IN-APP REALTIME NOTIFICATION TOAST CONTAINER */}
        <InAppNotificationToast
          notifications={inAppNotifs}
          onDismiss={dismissInAppNotif}
          onSelect={(convId) => {
            navigate('/support');
            setSelectedConversationId(convId);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-layout-root">
      {/* LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        backendOnline={backendOnline}
        openConversationsCount={visibleConversations.filter(c => c.status !== 'resolved').length}
        failedConversationsCount={failedConversationsCount}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        configSubTab={configSubTab}
        setConfigSubTab={handleSetConfigSubTab}
        loadTemplates={loadTemplates}
      />

      {/* MAIN VIEWPORT */}
      <div className="app-main-viewport">
        {/* BRAND HEADER & BREADCRUMBS */}
        <Header
          activeTab={activeTab}
          backendOnline={backendOnline}
          currentUser={currentUser}
          getAuthHeaders={getAuthHeaders}
          onNavigate={navigate}
        />

        {/* VIEWPORT BODY */}
        {/* WhatsApp preview layout paused for now:
        <div className={`portal-container ${!simulatorOpen ? 'simulator-collapsed' : ''}`}>
        */}
        <div className="portal-container">
            {/* LEFT SIDE: MAIN APP CONTENT */}
            <div style={{ overflowY: 'auto', padding: '1rem', borderRight: '1px solid var(--border-subtle)' }}>
              {activeTab === 'admin' ? (
                <>
                  <ActionCenterPanel currentUser={currentUser} getAuthHeaders={getAuthHeaders} onNavigate={navigate} />
                  <SupportCenter
                  currentUser={currentUser}
                  conversations={visibleConversations}
                  filteredConversations={filteredConversations}
                  selectedConversationId={selectedConversationId}
                  setSelectedConversationId={setSelectedConversationId}
                  currentConversation={currentConversation}
                  adminProductFilter={adminProductFilter}
                  setAdminProductFilter={setAdminProductFilter}
                  displayProducts={staffAllowedProducts}
                  adminInput={adminInput}
                  setAdminInput={setAdminInput}
                  adminIsSending={adminIsSending}
                  handleAdminSendReply={handleAdminSendReply}
                  handleAdminSendMediaReply={handleAdminSendMediaReply}
                  handleResolveConversation={handleResolveConversation}
                  handleReassignConversation={handleReassignConversation}
                  allProducts={displayProducts}
                  getAuthHeaders={getAuthHeaders}
                  openInitiateModal={openInitiateModal}
                  adminChatEndRef={adminChatEndRef}
                  />
                </>
              ) : activeTab === 'broadcasts' ? (
                <BroadcastsView
                  currentUser={currentUser}
                  allProducts={displayProducts}
                  getAuthHeaders={getAuthHeaders}
                  templates={templates}
                  loadTemplates={loadTemplates}
                  onNavigateToSupport={() => navigate('/support')}
                />
              ) : activeTab === 'demos' ? (
                <DemoRequestsView
                  currentUser={currentUser}
                  getAuthHeaders={getAuthHeaders}
                />
              ) : activeTab === 'help' ? (
                <HelpCenter currentUser={currentUser} />
              ) : (
                <ConfigHub
                  currentUser={currentUser}
                  configSubTab={configSubTab}
                  setConfigSubTab={handleSetConfigSubTab}
                  dbProducts={displayProducts}
                  loadDbProducts={loadDbProducts}
                  templates={templates}
                  isTemplatesLoading={isTemplatesLoading}
                  isSimulatedTemplates={isSimulatedTemplates}
                  loadTemplates={loadTemplates}
                  apiBase={API_BASE}
                  getAuthHeaders={getAuthHeaders}
                />
              )}
            </div>

            {/* RIGHT SIDE: DEVICE PREVIEW INSPECTOR paused for now.
            <WhatsAppSimulator
              simulatorPhone={simulatorPhone}
              setSimulatorPhone={setSimulatorPhone}
              simulatorName={simulatorName}
              setSimulatorName={setSimulatorName}
              simulatedUsers={simulatedUsers}
            />
            */}
          </div>
      </div>

      {/* INITIATE CONVERSATION MODAL */}
      <InitiateModal
        isOpen={initiateModalOpen}
        onClose={() => setInitiateModalOpen(false)}
        displayProducts={staffAllowedProducts}
        templates={templates}
        initiatePhone={initiatePhone}
        setInitiatePhone={setInitiatePhone}
        initiateCountryCode={initiateCountryCode}
        setInitiateCountryCode={setInitiateCountryCode}
        initiateName={initiateName}
        setInitiateName={setInitiateName}
        initiateProductId={initiateProductId}
        setInitiateProductId={setInitiateProductId}
        initiateMessageType={initiateMessageType}
        setInitiateMessageType={setInitiateMessageType}
        initiateTemplateName={initiateTemplateName}
        setInitiateTemplateName={setInitiateTemplateName}
        initiateTemplateParams={initiateTemplateParams}
        setInitiateTemplateParams={setInitiateTemplateParams}
        initiateCustomMessage={initiateCustomMessage}
        setInitiateCustomMessage={setInitiateCustomMessage}
        initiateIsSending={initiateIsSending}
        handleInitiateConversation={handleInitiateConversation}
      />

      {/* IN-APP REALTIME NOTIFICATION TOAST CONTAINER */}
      <InAppNotificationToast
        notifications={inAppNotifs}
        onDismiss={dismissInAppNotif}
        onSelect={(convId) => {
          navigate('/support');
          setSelectedConversationId(convId);
        }}
      />
    </div>
  );
}
