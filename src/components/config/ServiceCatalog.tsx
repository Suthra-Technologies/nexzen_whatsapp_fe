import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Edit2,
  ExternalLink,
  MoreVertical,
  Package,
  Plus,
  Star,
  Trash2
} from 'lucide-react';
import { API_BASE, ICON_MAP } from '../../constants';

interface ServiceCatalogProps {
  dbProducts: any[];
  loadDbProducts: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  dbProducts,
  loadDbProducts,
  getAuthHeaders
}) => {
  // Product Form states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodFormId, setProdFormId] = useState('');
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormDesc, setProdFormDesc] = useState('');
  const [prodFormWelcome, setProdFormWelcome] = useState('');
  const [prodFormRedirect, setProdFormRedirect] = useState('');
  const [prodFormIcon, setProdFormIcon] = useState('Laptop');
  const [prodFormTheme, setProdFormTheme] = useState('prod_nexzentek');
  const [prodFormImageUrl, setProdFormImageUrl] = useState('');
  const [prodFormFeatures, setProdFormFeatures] = useState('');
  const [prodFormActive, setProdFormActive] = useState(true);
  const [prodFormFeatured, setProdFormFeatured] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Kebab menu states
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.kebab-menu-container')) {
        setActionMenuOpenId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    setActionMenuOpenId(null);
  };

  // Products arrive here with `icon` swapped for its component (see App.tsx), but the backend
  // stores icon *names*. Sending the component would serialize to {} and wipe the product's
  // icon, so always save/edit using the stored name (undefined when none is stored).
  const toIconName = (product: any): string | undefined => {
    if (typeof product.iconName === 'string' && ICON_MAP[product.iconName]) return product.iconName;
    if (typeof product.icon === 'string' && ICON_MAP[product.icon]) return product.icon;
    return undefined;
  };

  const handleToggleFeatured = async (product: any) => {
    const willBeFeatured = !product.isFeatured;
    if (willBeFeatured) {
      const currentlyFeatured = dbProducts.filter(p => p.isFeatured && p.id !== product.id);
      if (currentlyFeatured.length >= 2) {
        alert(`You can feature up to 2 main services at a time.\n\nCurrently featured:\n• ${currentlyFeatured.map(p => p.name).join('\n• ')}\n\nPlease unfeature one of them first before featuring "${product.name}".`);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/admin/products/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...product,
          icon: toIconName(product),
          iconName: undefined,
          isFeatured: willBeFeatured
        })
      });
      if (res.ok) {
        await loadDbProducts();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update main product status');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating main product status');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFormId || !prodFormName || !prodFormDesc || !prodFormWelcome || !prodFormRedirect) {
      alert('All fields are required');
      return;
    }
    if (prodFormDesc.length > 72) {
      alert('Description must be 72 characters or less for WhatsApp interactive list compatibility.');
      return;
    }

    let cleanRedirectUrl = prodFormRedirect.trim();
    if (cleanRedirectUrl && !/^https?:\/\//i.test(cleanRedirectUrl)) {
      cleanRedirectUrl = `https://${cleanRedirectUrl}`;
    }

    setIsSavingProduct(true);
    try {
      const res = await fetch(`${API_BASE}/admin/products/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          id: prodFormId,
          name: prodFormName,
          description: prodFormDesc,
          welcomeMessage: prodFormWelcome,
          redirectUrl: cleanRedirectUrl,
          isActive: prodFormActive,
          icon: prodFormIcon,
          theme: prodFormTheme,
          imageUrl: prodFormImageUrl,
          features: prodFormFeatures.split(',').map(f => f.trim()).filter(Boolean),
          isFeatured: prodFormFeatured
        })
      });
      if (res.ok) {
        await loadDbProducts();
        setEditingProductId(null);
        setProdFormId('');
        setProdFormName('');
        setProdFormDesc('');
        setProdFormWelcome('');
        setProdFormRedirect('');
        setProdFormIcon('Laptop');
        setProdFormTheme('prod_nexzentek');
        setProdFormImageUrl('');
        setProdFormFeatures('');
        setProdFormFeatured(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save product');
      }
    } catch (e) {
      console.error(e);
      alert('Connection error saving product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/products/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await loadDbProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="config-products-view">
      <div className="config-header-row">
        <div className="config-header-left">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 className="config-page-title">Services</h1>
              <span className="config-count-badge">{dbProducts.length} services</span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.86rem' }}>
              Manage services available to customers.
            </p>
          </div>
        </div>
        {!editingProductId && (
          <div className="rs-actions">
            <a
              href="/services"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                textDecoration: 'none',
                fontSize: '0.82rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700
              }}
            >
              <span>View Public Catalog</span>
              <ExternalLink size={14} />
            </a>
          <button
            type="button"
            className="btn-add-service rs-primary"
            onClick={() => {
              setEditingProductId('new');
              setProdFormId('prod_' + Math.random().toString(36).substr(2, 5));
              setProdFormName('');
              setProdFormDesc('');
              setProdFormWelcome('');
              setProdFormRedirect('');
              setProdFormIcon('Laptop');
              setProdFormTheme('prod_nexzentek');
              setProdFormImageUrl('');
              setProdFormFeatures('');
              setProdFormActive(true);
              setProdFormFeatured(false);
            }}
          >
            <Plus size={15} />
            <span>Add Service</span>
          </button>
          </div>
        )}
      </div>

      {editingProductId ? (
        <form className="glass-card config-form" onSubmit={handleSaveProduct}>
          <h3 className="form-title">
            {editingProductId === 'new' ? 'Add New Service' : 'Edit Service'}
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Service ID</label>
              <input
                type="text"
                className="form-input"
                disabled={editingProductId !== 'new'}
                value={prodFormId}
                onChange={e => setProdFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. prod_pos_system"
                required
              />
              <span className="field-hint">Alphanumeric and underscores only</span>
            </div>

            <div className="form-group">
              <label className="form-label">Service Name</label>
              <input
                type="text"
                className="form-input"
                value={prodFormName}
                onChange={e => setProdFormName(e.target.value)}
                placeholder="e.g. NexZen POS"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">
              Short Description ({prodFormDesc.length}/72 chars)
            </label>
            <input
              type="text"
              maxLength={72}
              className="form-input"
              value={prodFormDesc}
              onChange={e => setProdFormDesc(e.target.value)}
              placeholder="Fast billing, live stock tracking, and payment sync..."
              required
            />
            <span className="field-hint" style={{ color: prodFormDesc.length > 72 ? 'var(--color-danger-light)' : 'var(--text-muted)' }}>
              Interactive WhatsApp menus require row descriptions of 72 characters or fewer.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">First WhatsApp Reply Message</label>
            <textarea
              className="form-input"
              rows={3}
              value={prodFormWelcome}
              onChange={e => setProdFormWelcome(e.target.value)}
              placeholder="Welcome to NexZen POS! How can our team assist you today?"
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Website / Portal URL</label>
            <input
              type="text"
              className="form-input"
              value={prodFormRedirect}
              onChange={e => setProdFormRedirect(e.target.value)}
              onBlur={() => {
                const trimmed = prodFormRedirect.trim();
                if (trimmed && !/^https?:\/\//i.test(trimmed)) {
                  setProdFormRedirect(`https://${trimmed}`);
                }
              }}
              placeholder="e.g. evergreen.atlantafencecompany.co or https://..."
              required
            />
            <span className="field-hint">Accepts domain names or full URLs (https:// is added automatically if omitted)</span>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Showcase Icon</label>
            <select
              className="form-input"
              value={prodFormIcon}
              onChange={e => setProdFormIcon(e.target.value)}
              style={{ background: '#0e1117', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              required
            >
              {Object.keys(ICON_MAP).map(iconName => (
                <option key={iconName} value={iconName}>{iconName}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Accent Color Theme</label>
            <input
              type="text"
              className="form-input"
              value={prodFormTheme}
              onChange={e => setProdFormTheme(e.target.value)}
              placeholder="e.g. prod_nexzenpos"
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Service Logo / Image URL</label>
            <input
              type="text"
              className="form-input"
              value={prodFormImageUrl}
              onChange={e => setProdFormImageUrl(e.target.value)}
              placeholder="e.g. /24.png"
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Key Highlights (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={prodFormFeatures}
              onChange={e => setProdFormFeatures(e.target.value)}
              placeholder="e.g. Fast Checkout, Inventory Sync, Multi-Store Analytics"
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="prodFormActive"
              checked={prodFormActive}
              onChange={e => setProdFormActive(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
            />
            <label htmlFor="prodFormActive" className="form-label" style={{ margin: 0, cursor: 'pointer', userSelect: 'none' }}>
              Active &amp; Available on WhatsApp Menu
            </label>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem', borderRadius: '8px' }}>
            <input
              type="checkbox"
              id="prodFormFeatured"
              checked={prodFormFeatured}
              onChange={e => {
                if (e.target.checked) {
                  const currentFeatured = dbProducts.filter(p => p.isFeatured && p.id !== prodFormId);
                  if (currentFeatured.length >= 2) {
                    alert(`You can feature up to 2 main services at a time.\n\nCurrently featured:\n• ${currentFeatured.map(p => p.name).join('\n• ')}\n\nPlease unfeature one first before featuring this service.`);
                    return;
                  }
                }
                setProdFormFeatured(e.target.checked);
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b', marginTop: '2px' }}
            />
            <div>
              <label htmlFor="prodFormFeatured" className="form-label" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', color: '#fbbf24', fontWeight: 600 }}>
                ⭐ Quick Button (Show directly in WhatsApp chat)
              </label>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Shows directly as an instant button on WhatsApp so users see it immediately. (Max 2 products)
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={isSavingProduct}>
              {isSavingProduct ? 'Saving...' : 'Save Service'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditingProductId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="products-list-table">
          {/* WhatsApp Quick Reply Feature Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(16, 185, 129, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} fill="#d97706" color="#d97706" />
              <span>
                <strong style={{ color: '#b45309' }}>WhatsApp Quick Buttons:</strong>{' '}
                {dbProducts.filter(p => p.isFeatured).length > 0 ? (
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>
                    {dbProducts.filter(p => p.isFeatured).map(p => p.name).join(' & ')}
                  </span>
                ) : (
                  <span style={{ color: '#64748b' }}>None selected (showing top 2 automatically)</span>
                )}
                <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                  ({dbProducts.filter(p => p.isFeatured).length}/2 selected)
                </span>
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              These 2 services appear as quick buttons when customers message on WhatsApp.
            </span>
          </div>

          <div className="products-table-wrapper">
            <table className="config-table rs-card-table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Service</th>
                  <th>Description</th>
                  <th style={{ width: '170px' }}>Website</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '140px' }}>Quick Button</th>
                  <th className="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {dbProducts.map((p, index) => {
                  const iconName = toIconName(p);
                  const IconComponent = iconName ? ICON_MAP[iconName] : Package;
                  const displayUrl = p.redirectUrl
                    ? p.redirectUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
                    : '';
                  const isMenuOpen = actionMenuOpenId === p.id;
                  const isNearBottom = index >= dbProducts.length - 2 && dbProducts.length > 2;
                  return (
                    <tr key={p.id}>
                      <td className="rs-card-title">
                        <div className="table-service-cell">
                          <div className="table-service-thumb" title={`Service ID: ${p.id}`}>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} />
                            ) : (
                              <IconComponent size={14} style={{ color: 'var(--text-sub)' }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="table-service-name" title={`Service ID: ${p.id}`}>{p.name}</span>
                            {p.isFeatured && (
                              <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Star size={10} fill="#fbbf24" /> Quick Button
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Description">
                        <div className="table-desc-cell">{p.description}</div>
                      </td>
                      <td data-label="Website">
                        {p.redirectUrl ? (
                          <a
                            href={p.redirectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="table-subtle-link"
                            title={p.redirectUrl}
                          >
                            <span className="subtle-link-text">{displayUrl}</span>
                            <ExternalLink size={12} className="subtle-link-icon" />
                          </a>
                        ) : (
                          <span className="table-muted-text">—</span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge-soft ${p.isActive !== false ? 'active' : 'hidden'}`}>
                          <span className="status-dot" />
                          <span>{p.isActive !== false ? 'Active' : 'Hidden'}</span>
                        </span>
                      </td>
                      <td data-label="Quick Button">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(p)}
                          title={p.isFeatured ? "Click to remove from the main WhatsApp menu" : "Click to feature on the main WhatsApp menu"}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: p.isFeatured ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: p.isFeatured ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            color: p.isFeatured ? '#fbbf24' : '#64748b',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Star size={11} fill={p.isFeatured ? '#fbbf24' : 'none'} color={p.isFeatured ? '#fbbf24' : '#64748b'} />
                          <span>{p.isFeatured ? 'Quick Button' : 'Catalog'}</span>
                        </button>
                      </td>
                      <td className="td-actions rs-card-actions">
                        <div className="kebab-menu-container">
                          <button
                            type="button"
                            className={`kebab-trigger-btn ${isMenuOpen ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpenId(isMenuOpen ? null : p.id);
                            }}
                            title="More actions"
                            aria-label="More actions"
                            aria-expanded={isMenuOpen}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isMenuOpen && (
                            <div className={`kebab-dropdown-menu ${isNearBottom ? 'dropdown-up' : ''}`}>
                              <button
                                type="button"
                                className="kebab-menu-item"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  handleToggleFeatured(p);
                                }}
                              >
                                <Star size={13} fill={p.isFeatured ? '#fbbf24' : 'none'} color="#fbbf24" />
                                <span>{p.isFeatured ? 'Remove Quick Button' : 'Set as Quick Button'}</span>
                              </button>
                              <button
                                type="button"
                                className="kebab-menu-item"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setEditingProductId(p.id);
                                  setProdFormId(p.id);
                                  setProdFormName(p.name);
                                  setProdFormDesc(p.description || '');
                                  setProdFormWelcome(p.welcomeMessage || '');
                                  setProdFormRedirect(p.redirectUrl || '');
                                  setProdFormIcon(toIconName(p) || 'Laptop');
                                  setProdFormTheme(p.theme || 'prod_nexzentek');
                                  setProdFormImageUrl(p.imageUrl || '');
                                  setProdFormFeatures(Array.isArray(p.features) ? p.features.join(', ') : p.features || '');
                                  setProdFormActive(p.isActive !== false);
                                  setProdFormFeatured(p.isFeatured === true);
                                }}
                              >
                                <Edit2 size={13} />
                                <span>Edit Service</span>
                              </button>
                              <button
                                type="button"
                                className="kebab-menu-item"
                                onClick={(e) => handleCopyId(p.id, e)}
                                title={`ID: ${p.id}`}
                              >
                                {copiedId === p.id ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
                                <span>{copiedId === p.id ? 'Copied ID!' : 'Copy ID'}</span>
                              </button>
                              <div className="kebab-menu-divider" />
                              <button
                                type="button"
                                className="kebab-menu-item danger"
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  handleDeleteProduct(p.id);
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete Service</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
