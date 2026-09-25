export interface Product {
  id: string;
  name: string;
  description: string;
  welcomeMessage: string;
  redirectUrl: string;
  isActive?: boolean;
  icon?: any;
  iconName?: string; // stored icon name, when valid (icon holds the resolved component)
  theme?: string;
  imageUrl?: string;
  features?: string[] | string;
  isFeatured?: boolean;
  _id?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin' | 'system';
  text: string;
  timestamp: string;
  messageType: string;
  status?: string;
  errorCode?: number | string | null;
  errorTitle?: string | null;
  errorDetails?: string | null;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'document' | 'video' | 'audio' | string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  caption?: string | null;
  reaction?: string | null;
  reactions?: {
    user?: string | null;
    admin?: string | null;
  } | null;
  whatsappMessageId?: string;
}


export interface Conversation {
  id: string;
  phone: string;
  userName: string;
  userEmail: string;
  productId: string;
  productName: string;
  status: 'open' | 'resolved' | string;
  createdAt: string;
  messages: Message[];
  lastMessage: Message | null;
  viewingAgentName?: string;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  assignedAt?: string | null;
  csatRating?: number | null;
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: WhatsAppTemplateComponent[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  assignedProductIds?: string[];
  createdAt?: string;
  status?: 'active' | 'pending' | 'inactive';
  lastLoginAt?: string | null;
}

export interface MetaSettings {
  META_APP_ID: string;
  META_APP_SECRET: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_WABA_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_WELCOME_TEMPLATE: string;
  PORT?: string;
  MONGODB_URI?: string;
}

export interface SimulatedUser {
  phone: string;
  name: string;
}

export interface CountryDialOption {
  code: string;
  flag: string;
  label: string;
  name: string;
  placeholder: string;
  hint: string;
}

export interface SimulatedMessage {
  id: string;
  phone: string;
  timestamp: string;
  direction?: 'inbound' | 'outbound';
  type?: 'text' | 'template' | 'interactive_button' | 'interactive_list' | string;
  title?: string;
  body?: string;
  text?: string;
  footer?: string;
  variant?: 'service_menu' | string;
  buttons?: Array<{
    id: string;
    title: string;
    kind?: 'product' | 'explore';
    name?: string;
    description?: string;
    icon?: string | null;
  }>;
  buttonText?: string;
  url?: string;
  options?: Array<{ id: string; title: string; description?: string }>;
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
  status?: string;
  errorCode?: number | string | null;
  errorTitle?: string | null;
  errorDetails?: string | null;
  mediaUrl?: string;
  filename?: string;
  caption?: string;
}

export type BroadcastType =
  | 'promotional'
  | 'announcement'
  | 'coupon'
  | 'product_offer'
  | 'event_reminder'
  | 'customer_update';

export interface BroadcastCoupon {
  code: string;
  discount: string;
  validUntil: string;
}

export interface BroadcastActionButton {
  type: 'QUICK_REPLY' | 'URL';
  text: string;
  url?: string;
}

export interface BroadcastAudienceFilter {
  type: 'all' | 'product' | 'active_conversations' | 'recent' | 'manual';
  productId?: string;
  customerPhones?: string[];
}

export interface BroadcastRecipient {
  phone: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}

export interface Broadcast {
  id: string;
  name: string;
  type: BroadcastType;
  message: string;
  mediaUrl?: string | null;
  coupon?: BroadcastCoupon | null;
  actionButton?: BroadcastActionButton | null;
  audienceFilter: BroadcastAudienceFilter;
  recipientCount: number;
  recipients?: BroadcastRecipient[];
  status: 'draft' | 'preparing' | 'ready' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'needs_changes';
  templateName?: string | null;
  variableSlots?: string[];
  metaTemplateStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_REQUIRED';
  metaRejectionReason?: string | null;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DemoBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'reschedule_requested'
  | 'meeting_pending'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface DemoBooking {
  id: string;
  phone: string;
  customerName: string;
  productId: string;
  productName: string;
  conversationId?: string | null;
  requestedSlotStart: string;
  requestedSlotEnd: string;
  status: DemoBookingStatus;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  googleEventId?: string | null;
  meetingUri?: string | null;
  declineReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemoSettings {
  durationMinutes: number;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
  bufferMinutes: number;
  timezone: string;
}

export type NotificationPriority = 'critical' | 'important' | 'informational';

export type NotificationType =
  | 'DEMO_REQUEST'
  | 'DEMO_CONFIRMED'
  | 'DEMO_RESCHEDULED'
  | 'DEMO_CANCELLED'
  | 'MESSAGE_FAILURE'
  | 'BROADCAST_COMPLETED'
  | 'BROADCAST_FAILURE'
  | 'STAFF_INVITATION'
  | 'ACCESS_CHANGE';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  serviceId?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface ActionCenterItem {
  id: string;
  type: string;
  label: string;
  description: string;
  count: number;
  priority: NotificationPriority;
  actionLabel: string;
  actionPath: string;
}
