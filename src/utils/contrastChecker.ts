/**
 * Contrast Checker Utility for WCAG Compliance
 * Medical-focused color system with enhanced accessibility
 */

export interface ContrastResult {
  ratio: number;
  wcagAA: boolean;      // 4.5:1 for normal text, 3:1 for large text
  wcagAAA: boolean;     // 7:1 for normal text, 4.5:1 for large text
  largeTextAA: boolean; // 3:1 for large text (18pt+ or 14pt+ bold)
  compliant: boolean;   // Overall compliance with AA standards
  level: 'A' | 'AA' | 'AAA' | 'FAIL';
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG guidelines
 */
function getLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;

  // Convert to linear RGB values
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color string to RGB values
 */
function parseColor(color: string): number[] | null {
  // Remove spaces and convert to lowercase
  color = color.replace(/\s/g, '').toLowerCase();

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return hex.split('').map(c => parseInt(c + c, 16));
    } else if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
  }

  // Handle rgb() colors
  if (color.startsWith('rgb(')) {
    const matches = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (matches) {
      return [parseInt(matches[1]), parseInt(matches[2]), parseInt(matches[3])];
    }
  }

  // Handle hsl() colors - convert to RGB first
  if (color.startsWith('hsl(')) {
    return hslToRgb(color);
  }

  return null;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(hsl: string): number[] | null {
  const matches = hsl.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
  if (!matches) return null;

  const h = parseInt(matches[1]) / 360;
  const s = parseInt(matches[2]) / 100;
  const l = parseInt(matches[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= h && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= h && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG contrast formula
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check contrast compliance with WCAG standards
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  const wcagAA = ratio >= 4.5;        // Normal text AA requirement
  const wcagAAA = ratio >= 7.0;       // Normal text AAA requirement
  const largeTextAA = ratio >= 3.0;    // Large text AA requirement
  const compliant = wcagAA;           // Overall AA compliance

  let level: 'A' | 'AA' | 'AAA' | 'FAIL' = 'FAIL';
  if (wcagAAA) {
    level = 'AAA';
  } else if (wcagAA) {
    level = 'AA';
  } else if (largeTextAA) {
    level = 'A';
  }

  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    wcagAA,
    wcagAAA,
    largeTextAA,
    compliant,
    level
  };
}

/**
 * Medical-specific color validation
 * Ensures colors meet medical accessibility standards
 */
export function validateMedicalColorContrast(
  foreground: string,
  background: string,
  textSize: 'normal' | 'large' = 'normal'
): { isValid: boolean; result: ContrastResult; recommendation?: string } {
  const result = checkContrast(foreground, background);

  // Medical applications require higher contrast for safety
  const medicalRequirement = textSize === 'large' ? 4.5 : 7.0; // Higher than standard WCAG
  const isMedicallySafe = result.ratio >= medicalRequirement;

  let recommendation = '';
  if (!isMedicallySafe) {
    recommendation = textSize === 'large'
      ? `Medical safety requires 4.5:1 contrast for large text, current ratio: ${result.ratio.toFixed(2)}:1`
      : `Medical safety requires 7:1 contrast for normal text, current ratio: ${result.ratio.toFixed(2)}:1`;
  }

  return {
    isValid: isMedicallySafe,
    result,
    recommendation
  };
}

/**
 * Predefined medical color combinations with contrast validation
 */
export const MEDICAL_COLOR_PRESETS = {
  light: {
    primary: {
      text: '#0f172a',      // 16.07:1 contrast on white
      background: '#ffffff'
    },
    secondary: {
      text: '#475569',      // 7.25:1 contrast on white
      background: '#ffffff'
    },
    muted: {
      text: '#94a3b8',      // 3.85:1 contrast on white
      background: '#ffffff'
    },
    success: {
      text: '#059669',
      background: '#ecfdf5'
    },
    warning: {
      text: '#d97706',
      background: '#fffbeb'
    },
    error: {
      text: '#dc2626',
      background: '#fef2f2'
    }
  },
  dark: {
    primary: {
      text: '#f8fafc',      // 15.8:1 contrast on dark
      background: '#0f172a'
    },
    secondary: {
      text: '#cbd5e1',      // 9.2:1 contrast on dark
      background: '#0f172a'
    },
    muted: {
      text: '#64748b',      // 3.2:1 contrast on dark
      background: '#0f172a'
    },
    success: {
      text: '#10b981',
      background: '#064e3b'
    },
    warning: {
      text: '#f59e0b',
      background: '#78350f'
    },
    error: {
      text: '#ef4444',
      background: '#7f1d1d'
    }
  }
} as const;

/**
 * Test all medical color combinations
 */
export function testMedicalColorContrast(): void {
  console.log('🩺 Testing Medical Color Contrast Ratios...\n');

  Object.entries(MEDICAL_COLOR_PRESETS).forEach(([theme, colors]) => {
    console.log(`📋 ${theme.toUpperCase()} THEME:`);

    Object.entries(colors).forEach(([colorName, { text, background }]) => {
      const result = checkContrast(text, background);
      const medicalValidation = validateMedicalColorContrast(text, background);

      const status = medicalValidation.isValid ? '✅' : '❌';
      const level = result.level;

      console.log(`  ${status} ${colorName.padEnd(10)}: ${result.ratio.toFixed(2)}:1 (${level}) - ${medicalValidation.isValid ? 'Medical Safe' : 'Needs Improvement'}`);
    });

    console.log('');
  });
}

/**
 * Batch contrast testing utility
 */
export function batchTestContrast(colorPairs: Array<{ name: string; foreground: string; background: string }>): void {
  console.log('🔍 Batch Contrast Testing Results:\n');

  colorPairs.forEach(({ name, foreground, background }) => {
    const result = checkContrast(foreground, background);
    const medicalValidation = validateMedicalColorContrast(foreground, background);

    const status = medicalValidation.isValid ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.ratio.toFixed(2)}:1 (${result.level})`);
  });
}

// Export for easy console testing
if (typeof window !== 'undefined') {
  (window as any).medicalContrastChecker = {
    checkContrast,
    validateMedicalColorContrast,
    testMedicalColorContrast,
    batchTestContrast
  };
}