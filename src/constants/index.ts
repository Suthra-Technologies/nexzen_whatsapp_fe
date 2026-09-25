import React from 'react';
import {
  Calendar,
  Coffee,
  Inbox,
  Laptop,
  Layers,
  PhoneCall,
  Settings,
  Shield,
  ShoppingBag,
  Sprout,
  TrendingUp,
  Users,
  Utensils,
  Wrench
} from 'lucide-react';
import type { CountryDialOption } from '../types';

export const API_BASE = (import.meta as any).env?.VITE_API_BASE || (() => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173' || window.location.hostname === 'localhost') {
      return 'http://localhost:3000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
})();

export const WS_BASE = (import.meta as any).env?.VITE_WS_BASE || (() => {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    // If running in development with vite on 5173, backend is on 3000
    if (window.location.port === '5173' || window.location.hostname === 'localhost') {
      return `${isHttps ? 'wss:' : 'ws:'}//localhost:3000/ws`;
    }
    return `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
  }
  return 'ws://localhost:3000/ws';
})();

export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Sprout,
  Wrench,
  Shield,
  Laptop,
  ShoppingBag,
  Users,
  TrendingUp,
  Utensils,
  Coffee,
  Calendar,
  Inbox,
  Layers,
  PhoneCall,
  Settings
};

export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = [
  { code: '+1', flag: '🇺🇸', label: 'US (+1)', name: 'United States', placeholder: '404 555 0199', hint: '10-digit US phone number' },
  { code: '+91', flag: '🇮🇳', label: 'IN (+91)', name: 'India', placeholder: '98765 43210', hint: '10-digit mobile number' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)', name: 'United Kingdom', placeholder: '7911 123456', hint: 'UK phone number' },
  { code: '+1-CA', flag: '🇨🇦', label: 'CA (+1)', name: 'Canada', placeholder: '416 555 0199', hint: '10-digit Canadian number' },
  { code: '+61', flag: '🇦🇺', label: 'AU (+61)', name: 'Australia', placeholder: '412 345 678', hint: 'Australian mobile number' },
  { code: '+971', flag: '🇦🇪', label: 'AE (+971)', name: 'UAE', placeholder: '50 123 4567', hint: 'UAE mobile number' },
  { code: 'other', flag: '🌐', label: 'Other', name: 'International', placeholder: '+1 404 555 0199', hint: 'Full international number with country code' }
];
