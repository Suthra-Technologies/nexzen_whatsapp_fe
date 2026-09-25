/**
 * Canonical WhatsApp Phone Number Normalization Utility
 * Standardizes international WhatsApp phone numbers into clean E.164 digits without leading '+', spaces, or symbols.
 */
export function normalizePhoneNumber(rawPhone?: string | null, countryCodeHint: string = ''): string {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^0-9]/g, '');
  if (!digits) return '';

  const cleanHint = String(countryCodeHint || '').replace(/[^0-9]/g, '');

  // Strip leading trunk zeros if present (e.g. 09347708120 -> 9347708120)
  if (digits.startsWith('0') && digits.length >= 11) {
    digits = digits.replace(/^0+/, '');
  }

  // Fix concatenated duplicate prefixes from previous legacy forms (e.g. 91191... or 191...)
  if (digits.startsWith('91191') && digits.length >= 15) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('191') && digits.length === 13) {
    const sub = digits.slice(3);
    if (/^[6-9]/.test(sub)) {
      digits = '91' + sub;
    }
  }

  // If 10 digits without country code, apply countryCodeHint or default heuristic
  if (digits.length === 10) {
    if (cleanHint && cleanHint !== 'other') {
      digits = cleanHint + digits;
    } else if (/^[6-9]/.test(digits)) {
      // Indian mobile numbers start with 6, 7, 8, 9
      digits = '91' + digits;
    } else {
      // Default North American NANP
      digits = '1' + digits;
    }
  } else if (cleanHint && cleanHint !== 'other' && !digits.startsWith(cleanHint) && digits.length < 12) {
    digits = cleanHint + digits;
  }

  return digits;
}

/**
 * Automatically parses a raw phone string into its matched country dial code and national digits.
 * Useful for prefilling or auto-detecting pasted numbers in modal inputs.
 */
export function parsePhoneAndCountry(rawPhone?: string | null): { countryCode: string; nationalNumber: string } {
  if (!rawPhone) return { countryCode: '+1', nationalNumber: '' };
  const cleaned = String(rawPhone).trim();
  const digits = cleaned.replace(/[^0-9]/g, '');

  if (!digits) return { countryCode: '+1', nationalNumber: '' };

  // 1. Check India (+91): either starts with 91 followed by 10 digits or was explicitly +91
  if ((digits.startsWith('91') && digits.length === 12 && /^[6-9]/.test(digits.slice(2))) ||
      (cleaned.startsWith('+91') && digits.startsWith('91'))) {
    return { countryCode: '+91', nationalNumber: digits.slice(2) };
  }

  // 2. Check UK (+44)
  if ((digits.startsWith('44') && (digits.length === 12 || digits.length === 11)) || cleaned.startsWith('+44')) {
    return { countryCode: '+44', nationalNumber: digits.slice(2) };
  }

  // 3. Check Australia (+61)
  if ((digits.startsWith('61') && digits.length === 11) || cleaned.startsWith('+61')) {
    return { countryCode: '+61', nationalNumber: digits.slice(2) };
  }

  // 4. Check UAE (+971)
  if ((digits.startsWith('971') && digits.length === 12) || cleaned.startsWith('+971')) {
    return { countryCode: '+971', nationalNumber: digits.slice(3) };
  }

  // 5. Check North America (+1)
  if ((digits.startsWith('1') && digits.length === 11) || cleaned.startsWith('+1')) {
    return { countryCode: '+1', nationalNumber: digits.slice(1) };
  }

  // 6. 10 digits without prefix
  if (digits.length === 10) {
    if (/^[6-9]/.test(digits)) {
      return { countryCode: '+91', nationalNumber: digits };
    }
    return { countryCode: '+1', nationalNumber: digits };
  }

  // 7. Fallback for other international formats
  if (cleaned.startsWith('+') || digits.length > 11) {
    return { countryCode: 'other', nationalNumber: cleaned.startsWith('+') ? cleaned : '+' + digits };
  }

  return { countryCode: '+1', nationalNumber: digits };
}
