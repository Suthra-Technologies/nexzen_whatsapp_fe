import {
  CheckCircle,
  Clock,
  Eye,
  FileEdit,
  Gift,
  Megaphone,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../../constants';
import type {
  AdminUser,
  Broadcast,
  BroadcastType,
  Product,
  WhatsAppTemplate
} from '../../types';

const SHOW_WHATSAPP_PREVIEW = true;

interface BroadcastsViewProps {
  currentUser?: AdminUser | null;
  allProducts: Product[];
  getAuthHeaders: () => Record<string, string>;
  templates?: WhatsAppTemplate[];
  loadTemplates?: () => Promise<void>;
  onNavigateToSupport?: () => void;
}

const MESSAGE_TYPES: Array<{
  id: BroadcastType;
  label: string;
  icon: string;
  desc: string;
  defaultText: string;
}> = [
  {
    id: 'promotional',
    label: 'Promotional Offer',
    icon: '🎉',
    desc: 'Seasonal promotions, discounts, and flash sales',
    defaultText: '🎉 Special Offer for you!\n\nHi [Customer Name] 👋\n\nEnjoy an exclusive 20% OFF on your next order.\nUse code: [Coupon Code]\n\nValid until the end of this month!'
  },
  {
    id: 'announcement',
    label: 'Announcement',
    icon: '📢',
    desc: 'Company news, service updates, and new arrivals',
    defaultText: '📢 Exciting News!\n\nHi [Customer Name] 👋\n\nWe are thrilled to announce new services at [Product Name]. Check out our latest features today!'
  },
  {
    id: 'coupon',
    label: 'Coupon / Discount',
    icon: '🎁',
    desc: 'Reward loyal customers with targeted voucher codes',
    defaultText: '🎁 Special Gift For You!\n\nHi [Customer Name] 👋\n\nHere is your personal discount voucher: [Coupon Code]\n\nSave on your next service or product booking with [Product Name].'
  },
  {
    id: 'product_offer',
    label: 'Product Offer',
    icon: '🛍️',
    desc: 'Spotlight a specific product or premium package',
    defaultText: '🛍️ Featured Package Spotlight!\n\nHi [Customer Name] 👋\n\nLooking to upgrade? Explore premium options at [Product Name]. Let our team know if you have questions!'
  },
  {
    id: 'event_reminder',
    label: 'Event / Reminder',
    icon: '📅',
    desc: 'Remind customers of upcoming events or bookings',
    defaultText: '📅 Upcoming Reminder\n\nHi [Customer Name] 👋\n\nThis is a friendly reminder from [Product Name]. We look forward to seeing you soon!'
  },
  {
    id: 'customer_update',
    label: 'Customer Update',
    icon: '💬',
    desc: 'Account updates, maintenance, and helpful information',
    defaultText: '💬 Important Customer Update\n\nHi [Customer Name] 👋\n\nWe have updated our service portal at [Product Name] to serve you even faster.'
  }
];

const QUICK_EMOJIS = ['🎉', '🎁', '🔥', '🛍️', '👋', '✨', '🏷️', '⏰', '⭐', '📢'];

const PERSONALIZATION_OPTIONS = [
  { label: 'Customer Name', token: '[Customer Name]' },
  { label: 'Product Name', token: '[Product Name]' },
  { label: 'Coupon Code', token: '[Coupon Code]' },
  { label: 'Order Number', token: '[Order Number]' }
];

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({
  allProducts,
  getAuthHeaders
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'drafts' | 'scheduled' | 'sent'>('create');

  // Broadcast lists
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [messageType, setMessageType] = useState<BroadcastType>('promotional');
  const [messageText, setMessageText] = useState(MESSAGE_TYPES[0].defaultText);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Coupon Builder State
  const [showCouponBuilder, setShowCouponBuilder] = useState(false);
  const [couponCode, setCouponCode] = useState('DIWALI20');
  const [couponDiscount, setCouponDiscount] = useState('20%');
  const [couponValidUntil, setCouponValidUntil] = useState('October 31, 2026');

  // Action button
  const [hasActionButton, setHasActionButton] = useState(true);
  const [actionButtonText, setActionButtonText] = useState('Explore Offer');

  // Audience Filter State
  const [audienceType, setAudienceType] = useState<'all' | 'product' | 'active_conversations' | 'recent' | 'manual'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>(allProducts[0]?.id || 'prod_nexzentek');
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [excludedOptOutCount, setExcludedOptOutCount] = useState<number>(0);
  const [isAudienceLoading, setIsAudienceLoading] = useState(false);

  // Send Confirmation & Dispatch Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState<string | null>(null);

  // Details Modal
  const [selectedBroadcastDetails, setSelectedBroadcastDetails] = useState<Broadcast | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Load all broadcasts
  const fetchBroadcasts = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/broadcasts`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching broadcasts:', e);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  // Fetch audience preview count whenever filter changes
  useEffect(() => {
    const fetchAudiencePreview = async () => {
      setIsAudienceLoading(true);
      try {
        const filter = {
          type: audienceType,
          productId: audienceType === 'product' ? selectedProductId : undefined
        };
        const res = await fetch(`${API_BASE}/admin/broadcasts/audience-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ filter })
        });
        if (res.ok) {
          const data = await res.json();
          setAudienceCount(data.totalCount || 0);
          setExcludedOptOutCount(data.excludedOptOutCount || 0);
        }
      } catch (err) {
        console.error('Error fetching audience preview:', err);
      } finally {
        setIsAudienceLoading(false);
      }
    };

    fetchAudiencePreview();
  }, [audienceType, selectedProductId]);

  // Derived counts for sub-tabs
  const drafts = useMemo(() => broadcasts.filter(b => b.status === 'draft'), [broadcasts]);
  const scheduled = useMemo(() => broadcasts.filter(b => b.status === 'scheduled'), [broadcasts]);
  const sent = useMemo(() => broadcasts.filter(b => b.status === 'sent'), [broadcasts]);

  // Handle message type selection
  const handleSelectMessageType = (type: BroadcastType) => {
    setMessageType(type);
    const item = MESSAGE_TYPES.find(m => m.id === type);
    if (item && (!messageText.trim() || messageText === MESSAGE_TYPES.find(m => m.id === messageType)?.defaultText)) {
      setMessageText(item.defaultText);
    }
  };

  // Insert token at cursor or end
  const handleInsertToken = (token: string) => {
    setMessageText(prev => prev + ' ' + token);
  };

  // Insert emoji
  const handleInsertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  // Insert coupon into message
  const handleInsertCoupon = () => {
    const couponSnippet = `\n\n🎟️ Use code ${couponCode} for ${couponDiscount} OFF (Valid until ${couponValidUntil})`;
    setMessageText(prev => prev + couponSnippet);
  };

  // Format live preview text with sample values
  const previewFormattedText = useMemo(() => {
    const targetProduct = allProducts.find(p => p.id === selectedProductId) || allProducts[0];
    return messageText
      .replace(/\[Customer Name\]/g, 'Aravind')
      .replace(/\[Product Name\]/g, targetProduct?.name || 'NexZen Services')
      .replace(/\[Coupon Code\]/g, couponCode || 'DIWALI20')
      .replace(/\[Order Number\]/g, 'ORD-9821');
  }, [messageText, selectedProductId, couponCode, allProducts]);

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name first.');
      return;
    }

    try {
      const payload = {
        name: campaignName.trim(),
        type: messageType,
        message: messageText,
        coupon: showCouponBuilder ? { code: couponCode, discount: couponDiscount, validUntil: couponValidUntil } : null,
        actionButton: hasActionButton ? { type: 'QUICK_REPLY', text: actionButtonText } : null,
        audienceFilter: {
          type: audienceType,
          productId: audienceType === 'product' ? selectedProductId : undefined
        },
        isDraft: true
      };

      const url = editingDraftId
        ? `${API_BASE}/admin/broadcasts/${editingDraftId}`
        : `${API_BASE}/admin/broadcasts`;
      const method = editingDraftId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchBroadcasts();
        alert('Campaign saved to Drafts!');
        setActiveSubTab('drafts');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save draft');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving draft');
    }
  };

  // Resume editing a draft
  const handleResumeDraft = (draft: Broadcast) => {
    setEditingDraftId(draft.id);
    setCampaignName(draft.name);
    setMessageType(draft.type);
    setMessageText(draft.message);
    if (draft.coupon) {
      setShowCouponBuilder(true);
      setCouponCode(draft.coupon.code);
      setCouponDiscount(draft.coupon.discount);
      setCouponValidUntil(draft.coupon.validUntil);
    }
    if (draft.actionButton) {
      setHasActionButton(true);
      setActionButtonText(draft.actionButton.text);
    }
    if (draft.audienceFilter) {
      setAudienceType(draft.audienceFilter.type);
      if (draft.audienceFilter.productId) {
        setSelectedProductId(draft.audienceFilter.productId);
      }
    }
    setActiveSubTab('create');
  };

  // Delete broadcast
  const handleDeleteBroadcast = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this broadcast?')) return;

    try {
      const res = await fetch(`${API_BASE}/admin/broadcasts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchBroadcasts();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Open send confirmation
  const handleOpenSendConfirmation = () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name.');
      return;
    }
    if (!messageText.trim()) {
      alert('Please write a message before sending.');
      return;
    }
    if (audienceCount === 0) {
      alert('No recipients match the selected audience filter.');
      return;
    }
    setSendErrorMsg(null);
    setSendSuccessMsg(null);
    setShowConfirmModal(true);
  };

  // Dispatch Broadcast
  const handleDispatchBroadcast = async () => {
    setIsSending(true);
    setSendErrorMsg(null);

    try {
      // 1. Create or save current broadcast
      const payload = {
        name: campaignName.trim(),
        type: messageType,
        message: messageText,
        coupon: showCouponBuilder ? { code: couponCode, discount: couponDiscount, validUntil: couponValidUntil } : null,
        actionButton: hasActionButton ? { type: 'QUICK_REPLY', text: actionButtonText } : null,
        audienceFilter: {
          type: audienceType,
          productId: audienceType === 'product' ? selectedProductId : undefined
        },
        isDraft: false
      };

      let broadcastId = editingDraftId;
      if (!broadcastId) {
        const createRes = await fetch(`${API_BASE}/admin/broadcasts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || 'Failed to prepare campaign');
        }
        broadcastId = createData.data.id;
      } else {
        await fetch(`${API_BASE}/admin/broadcasts/${broadcastId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload)
        });
      }

      // 2. Dispatch via send endpoint
      const sendRes = await fetch(`${API_BASE}/admin/broadcasts/${broadcastId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        if (sendData.status === 'preparing') {
          setSendErrorMsg("We're getting this message ready for WhatsApp. We'll let you know as soon as Meta approves it.");
          return;
        }
        throw new Error(sendData.error || sendData.message || 'Failed to dispatch broadcast');
      }

      setSendSuccessMsg(`🎉 Successfully sent to ${sendData.data.sentCount || audienceCount} customers!`);
      await fetchBroadcasts();

      // Clear form
      setTimeout(() => {
        setShowConfirmModal(false);
        setEditingDraftId(null);
        setCampaignName('');
        setMessageText(MESSAGE_TYPES[0].defaultText);
        setActiveSubTab('sent');
      }, 1500);
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setSendErrorMsg(err.message || 'Unable to send broadcast. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="broadcasts-container" style={{ padding: '0.5rem 0.75rem 2rem 0.75rem' }}>
      {/* Top Banner / Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              <Megaphone size={19} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Broadcast Campaigns
              </h1>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Create promotional offers, announcements, and updates for your WhatsApp customers.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.04)',
          borderRadius: '999px',
          padding: '0.25rem',
          border: '1px solid var(--border-subtle)',
          gap: '0.2rem'
        }}>
          <button
            type="button"
            className={`btn-subtab ${activeSubTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('create')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              border: 'none',
              background: activeSubTab === 'create' ? '#10b981' : 'transparent',
              color: activeSubTab === 'create' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={14} />
            <span>Create Broadcast</span>
          </button>

          <button
            type="button"
            className={`btn-subtab ${activeSubTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('drafts')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              border: 'none',
              background: activeSubTab === 'drafts' ? '#10b981' : 'transparent',
              color: activeSubTab === 'drafts' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileEdit size={14} />
            <span>Drafts</span>
            {drafts.length > 0 && (
              <span style={{
                background: activeSubTab === 'drafts' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.72rem'
              }}>
                {drafts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn-subtab ${activeSubTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('scheduled')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              border: 'none',
              background: activeSubTab === 'scheduled' ? '#10b981' : 'transparent',
              color: activeSubTab === 'scheduled' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={14} />
            <span>Scheduled</span>
            {scheduled.length > 0 && (
              <span style={{
                background: activeSubTab === 'scheduled' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.72rem'
              }}>
                {scheduled.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn-subtab ${activeSubTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('sent')}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              border: 'none',
              background: activeSubTab === 'sent' ? '#10b981' : 'transparent',
              color: activeSubTab === 'sent' ? '#ffffff' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle size={14} />
            <span>Sent</span>
            {sent.length > 0 && (
              <span style={{
                background: activeSubTab === 'sent' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.72rem'
              }}>
                {sent.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CREATE BROADCAST */}
      {activeSubTab === 'create' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: SHOW_WHATSAPP_PREVIEW ? 'minmax(0, 1fr) 400px' : 'minmax(0, 1fr)',
          gap: '1.75rem',
          alignItems: 'start'
        }}>
          {/* LEFT: Composer & Audience Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Step 1: Choose Message Type */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>1</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Choose Message Type</h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.65rem'
              }}>
                {MESSAGE_TYPES.map(m => {
                  const isSelected = messageType === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMessageType(m.id)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-xs)',
                        border: isSelected ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {m.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }}>
                        {m.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Campaign Details & Message Composer */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>2</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Campaign Details</h3>
              </div>

              {/* Campaign Name */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                  Campaign Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Diwali 20% Off, Weekend Flash Sale, VIP Announcement"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {/* Personalization & Emoji Toolbar */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>
                    Message Content <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {messageText.length} characters
                  </span>
                </div>

                {/* Personalization pills */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem',
                  background: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '0.45rem'
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.2rem' }}>
                    + Personalization:
                  </span>
                  {PERSONALIZATION_OPTIONS.map(opt => (
                    <button
                      key={opt.token}
                      type="button"
                      onClick={() => handleInsertToken(opt.token)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        background: '#ffffff',
                        border: '1px solid #10b981',
                        borderRadius: '999px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: '#059669',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                      title={`Insert ${opt.token}`}
                    >
                      <Sparkles size={11} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Emoji Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Emojis:</span>
                  {QUICK_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleInsertEmoji(em)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        padding: '0.1rem 0.2rem'
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                {/* Large Text Area */}
                <textarea
                  className="form-input"
                  rows={6}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Write your campaign message here..."
                  style={{
                    fontSize: '0.9rem',
                    lineHeight: 1.45,
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Optional Coupon Builder Accordion */}
              <div style={{
                marginTop: '1rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => setShowCouponBuilder(!showCouponBuilder)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: showCouponBuilder ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Gift size={16} color="#059669" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Optional Coupon Builder
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    {showCouponBuilder ? 'Hide' : '+ Add Coupon'}
                  </span>
                </div>

                {showCouponBuilder && (
                  <div style={{ padding: '0.85rem', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Coupon Code</label>
                        <input
                          type="text"
                          className="form-input"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="DIWALI20"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount</label>
                        <input
                          type="text"
                          className="form-input"
                          value={couponDiscount}
                          onChange={e => setCouponDiscount(e.target.value)}
                          placeholder="20% OFF"
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Valid Until</label>
                        <input
                          type="text"
                          className="form-input"
                          value={couponValidUntil}
                          onChange={e => setCouponValidUntil(e.target.value)}
                          placeholder="October 31, 2026"
                        />
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleInsertCoupon}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: 'var(--radius-xs)',
                          color: '#166534',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Tag size={13} />
                        <span>Insert Coupon snippet into message</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button Setting */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={hasActionButton}
                    onChange={e => setHasActionButton(e.target.checked)}
                  />
                  <span>Include WhatsApp quick-reply button</span>
                </label>
                {hasActionButton && (
                  <input
                    type="text"
                    className="form-input"
                    value={actionButtonText}
                    onChange={e => setActionButtonText(e.target.value)}
                    placeholder="Button text (e.g. Explore Offer)"
                    style={{ maxWidth: 180, padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                  />
                )}
              </div>
            </div>

            {/* Step 3: Audience Selection */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>3</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Customer &amp; Audience Selection</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Send To
                  </label>
                  <select
                    className="form-input"
                    value={audienceType}
                    onChange={e => setAudienceType(e.target.value as any)}
                  >
                    <option value="all">All Registered Customers</option>
                    <option value="product">Customers of Specific Service / Product</option>
                    <option value="active_conversations">Customers with Active Support Chats</option>
                    <option value="recent">Recent Customers (Last 30 Days)</option>
                  </select>
                </div>

                {audienceType === 'product' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Select Service / Team
                    </label>
                    <select
                      className="form-input"
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Recipient Count Banner */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Users size={18} color="#059669" />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
                      {isAudienceLoading ? (
                        'Calculating recipients...'
                      ) : (
                        `${audienceCount.toLocaleString()} customers will receive this message`
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                      Contacts who replied STOP are automatically excluded.
                    </div>
                  </div>
                </div>

                {excludedOptOutCount > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                    {excludedOptOutCount} opted out
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}
              >
                <FileEdit size={14} />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSendConfirmation}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Send size={15} />
                <span>Send Broadcast ({audienceCount})</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Live WhatsApp Preview (temporarily hidden) */}
          {SHOW_WHATSAPP_PREVIEW && (
          <div style={{ position: 'sticky', top: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                📱 WhatsApp Live Preview
              </span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                ● Real-time
              </span>
            </div>

            {/* Phone Bezel */}
            <div style={{
              background: '#1f2937',
              borderRadius: '36px',
              padding: '10px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              maxWidth: 360,
              margin: '0 auto'
            }}>
              <div style={{
                background: '#efeae2',
                borderRadius: '28px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 520,
                position: 'relative'
              }}>
                {/* WhatsApp Chat Top Header */}
                <div style={{
                  background: '#075e54',
                  color: '#ffffff',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#25d366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}>
                    N
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      NexZen Connect
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                      Official Business Account
                    </div>
                  </div>
                </div>

                {/* Chat Stream Body */}
                <div style={{
                  flex: 1,
                  padding: '1rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0'
                }}>
                  {/* Encryption Notice */}
                  <div style={{
                    alignSelf: 'center',
                    background: 'rgba(254, 243, 199, 0.9)',
                    color: '#78350f',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    maxWidth: '85%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    🔒 Messages are end-to-end encrypted.
                  </div>

                  {/* Outbound Bubble */}
                  <div style={{
                    alignSelf: 'flex-end',
                    maxWidth: '88%',
                    background: '#d9fdd3',
                    borderRadius: '8px 0px 8px 8px',
                    padding: '0.65rem 0.75rem',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    color: '#111827'
                  }}>
                    {/* Message Body */}
                    <div style={{
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {previewFormattedText || 'Your message preview will appear here...'}
                    </div>

                    {/* Metadata & Checkmarks */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.2rem',
                      marginTop: '0.3rem',
                      fontSize: '0.65rem',
                      color: '#6b7280'
                    }}>
                      <span>12:00 PM</span>
                      <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓✓</span>
                    </div>

                    {/* Optional Quick Reply Button */}
                    {hasActionButton && (
                      <div style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          color: '#00a884',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}>
                          <span>{actionButtonText || 'Explore Offer'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Input Bottom Bar */}
                <div style={{
                  background: '#f0f2f5',
                  padding: '0.5rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    flex: 1,
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    color: '#9ca3af'
                  }}>
                    Message...
                  </div>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#00a884',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    <Send size={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DRAFTS */}
      {activeSubTab === 'drafts' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Saved Drafts ({drafts.length})
          </h3>

          {drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <FileEdit size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No saved drafts. Start creating a campaign and click "Save as Draft"!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {drafts.map(d => (
                <div
                  key={d.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {d.name}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '999px',
                        background: 'rgba(0, 0, 0, 0.06)',
                        color: 'var(--text-muted)'
                      }}>
                        Draft
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.4rem',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {d.message}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.65rem'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Updated: {new Date(d.updatedAt).toLocaleDateString()}
                    </span>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBroadcast(d.id, e)}
                        className="btn-danger-outline"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.74rem' }}
                        title="Delete draft"
                      >
                        <Trash2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResumeDraft(d)}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: SCHEDULED */}
      {activeSubTab === 'scheduled' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Scheduled Broadcasts ({scheduled.length})
          </h3>

          {scheduled.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No scheduled campaigns at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {scheduled.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Scheduled for: {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : 'Pending'} · {s.recipientCount} recipients
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteBroadcast(s.id, e)}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    Cancel Schedule
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: SENT */}
      {activeSubTab === 'sent' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Sent Campaigns ({sent.length})
          </h3>

          {sent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Megaphone size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No campaigns sent yet. Create your first broadcast now!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sent.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {s.name}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669'
                      }}>
                        ✓ Sent
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Sent on {s.sentAt ? new Date(s.sentAt).toLocaleString() : new Date(s.createdAt).toLocaleString()} · Created by {s.createdBy}
                    </div>

                    {/* Delivery Metric Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        color: '#2563eb',
                        fontWeight: 600
                      }}>
                        Recipients: {s.recipientCount}
                      </span>

                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#059669',
                        fontWeight: 600
                      }}>
                        Delivered: {s.deliveredCount}
                      </span>

                      <span style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        color: '#9333ea',
                        fontWeight: 600
                      }}>
                        Read: {s.readCount}
                      </span>

                      {s.failedCount > 0 && (
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#dc2626',
                          fontWeight: 600
                        }}>
                          Failed: {s.failedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBroadcastDetails(s);
                        setShowTechnicalDetails(false);
                      }}
                      className="btn-secondary"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION BEFORE SENDING MODAL */}
      {showConfirmModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{
            background: '#ffffff',
            maxWidth: 520,
            width: '100%',
            borderRadius: 'var(--radius-sm)',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Megaphone size={19} color="#059669" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Ready to send?</h3>
              </div>
              {!isSending && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Campaign:</span>{' '}
                <strong>{campaignName}</strong>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Recipients:</span>{' '}
                <strong style={{ color: '#059669' }}>{audienceCount.toLocaleString()} customers</strong>
              </div>

              {/* Message preview snippet */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.75rem',
                fontSize: '0.82rem',
                maxHeight: 140,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45
              }}>
                {previewFormattedText}
              </div>
            </div>

            {/* Error or Success notification inside modal */}
            {sendErrorMsg && (
              <div style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-xs)',
                color: '#b91c1c',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {sendErrorMsg}
              </div>
            )}

            {sendSuccessMsg && (
              <div style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-xs)',
                color: '#065f46',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '1rem'
              }}>
                {sendSuccessMsg}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleDispatchBroadcast}
                disabled={isSending}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem'
                }}
              >
                {isSending ? 'Sending Broadcast...' : `Send to ${audienceCount.toLocaleString()} Customers`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedBroadcastDetails && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{
            background: '#ffffff',
            maxWidth: 620,
            width: '100%',
            borderRadius: 'var(--radius-sm)',
            padding: '1.5rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {selectedBroadcastDetails.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBroadcastDetails(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.65rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recipients</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedBroadcastDetails.recipientCount}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: '#f0fdf4', borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534' }}>Delivered</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>
                  {selectedBroadcastDetails.deliveredCount}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: '#faf5ff', borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b21a8' }}>Read</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#9333ea' }}>
                  {selectedBroadcastDetails.readCount}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: '#fef2f2', borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#991b1b' }}>Failed</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
                  {selectedBroadcastDetails.failedCount}
                </div>
              </div>
            </div>

            {/* Campaign Message Preview */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                Message Sent
              </label>
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.85rem',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedBroadcastDetails.message}
              </div>
            </div>

            {/* Recipients List if available */}
            {selectedBroadcastDetails.recipients && selectedBroadcastDetails.recipients.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Customer Recipients ({selectedBroadcastDetails.recipients.length})
                </label>
                <div style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.35rem'
                }}>
                  {selectedBroadcastDetails.recipients.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: idx < (selectedBroadcastDetails.recipients?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none'
                      }}
                    >
                      <span>{r.name || 'Customer'} ({r.phone})</span>
                      <span style={{
                        fontSize: '0.7rem',
                        color: r.status === 'failed' ? '#dc2626' : '#16a34a',
                        fontWeight: 600
                      }}>
                        {r.status === 'failed' ? 'Failed' : '✓ Delivered'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Technical Details for Staff/Admins */}
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              overflow: 'hidden'
            }}>
              <div
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)'
                }}
              >
                <span>Technical Meta Details (Staff Only)</span>
                <span>{showTechnicalDetails ? '▲ Hide' : '▼ View'}</span>
              </div>

              {showTechnicalDetails && (
                <div style={{ padding: '0.75rem', background: '#f8fafc', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div><strong>Internal Template Name:</strong> {selectedBroadcastDetails.templateName || 'Auto-generated'}</div>
                  <div><strong>Meta Template Status:</strong> {selectedBroadcastDetails.metaTemplateStatus || 'APPROVED'}</div>
                  <div><strong>Category:</strong> {selectedBroadcastDetails.type === 'customer_update' ? 'UTILITY' : 'MARKETING'}</div>
                  <div><strong>Language:</strong> en_US</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedBroadcastDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
