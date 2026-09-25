import React from 'react';
import type { AdminUser, WhatsAppTemplate } from '../../types';
import { ServiceCatalog } from './ServiceCatalog';
import { WhatsAppTemplates } from './WhatsAppTemplates';
import { TokensSettings } from './TokensSettings';
import { WhatsAppAnalytics } from './WhatsAppAnalytics';
import { StaffManagement } from './StaffManagement';

interface ConfigHubProps {
  currentUser: AdminUser | null;
  configSubTab: 'products' | 'templates' | 'settings' | 'analytics' | 'staff';
  setConfigSubTab: (tab: 'products' | 'templates' | 'settings' | 'analytics' | 'staff') => void;
  dbProducts: any[];
  loadDbProducts: () => Promise<void>;
  templates: WhatsAppTemplate[];
  isTemplatesLoading: boolean;
  isSimulatedTemplates: boolean;
  loadTemplates: () => Promise<void>;
  apiBase: string;
  getAuthHeaders: () => Record<string, string>;
}

export const ConfigHub: React.FC<ConfigHubProps> = ({
  currentUser,
  configSubTab,
  setConfigSubTab,
  dbProducts,
  loadDbProducts,
  templates,
  isTemplatesLoading,
  isSimulatedTemplates,
  loadTemplates,
  apiBase,
  getAuthHeaders
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Safeguard: if non-superadmin lands on settings, analytics, or staff, reset to products
  React.useEffect(() => {
    if (currentUser && !isSuperAdmin && (configSubTab === 'settings' || configSubTab === 'analytics' || configSubTab === 'staff')) {
      setConfigSubTab('products');
    }
  }, [currentUser, isSuperAdmin, configSubTab, setConfigSubTab]);

  return (
    <div className="config-content">
      {configSubTab === 'products' && (
        <ServiceCatalog
          dbProducts={dbProducts}
          loadDbProducts={loadDbProducts}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {configSubTab === 'templates' && (
        <WhatsAppTemplates
          templates={templates}
          isTemplatesLoading={isTemplatesLoading}
          isSimulatedTemplates={isSimulatedTemplates}
          loadTemplates={loadTemplates}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {isSuperAdmin && configSubTab === 'staff' && (
        <StaffManagement
          currentUser={currentUser}
          products={dbProducts}
          apiBase={apiBase}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {isSuperAdmin && configSubTab === 'settings' && (
        <TokensSettings getAuthHeaders={getAuthHeaders} />
      )}

      {isSuperAdmin && configSubTab === 'analytics' && (
        <WhatsAppAnalytics getAuthHeaders={getAuthHeaders} />
      )}
    </div>
  );
};

