# New Dashboard Design Documentation

## Overview

The new dashboard design represents a significant architectural evolution from the previous static layout to a modern, responsive, and interactive interface. This redesign introduces a component-based architecture using CSS Grid for layout management, enhanced user experience features, and seamless integration with existing services.

### Key Differences from Old Design

- **Modular Architecture**: Moved from monolithic components to a modular, reusable component structure
- **CSS Grid Layout**: Replaced flexbox-based layouts with CSS Grid for better responsive behavior
- **Touch-Optimized Interface**: Added swipe navigation and touch interactions
- **Real-Time Updates**: Integrated live data synchronization with alert notifications
- **RTL Support**: Full Arabic Right-to-Left layout support
- **Animation & Transitions**: Smooth transitions and micro-interactions for better UX
- **Global Search**: Integrated search functionality across all data entities
- **Quick Actions**: Floating action buttons for rapid task execution

## Architecture

### CSS Grid Layout Structure

The dashboard uses a responsive CSS Grid system that adapts to different screen sizes:

```css
.grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] grid-rows-[auto_1fr] h-screen gap-0
```

This creates a layout with:
- **Header**: Spans full width on mobile, top row on desktop
- **Sidebar**: Responsive behavior with mobile overlay
- **Main Content**: Dynamic content area with tabbed interface

### Component Hierarchy

```
EnhancedDashboard (Page)
├── NewDashboardLayout (Container)
    ├── EnhancedHeader (Top Navigation)
    ├── LeftSidebarStatistics (Left Panel)
    ├── DynamicTabsCarousel (Main Content)
    │   ├── QuickAccessDashboard (Today Tab)
    │   ├── DashboardAnalytics (Statistics Tab)
    │   └── SmartAlerts (Alerts Tab)
    └── FloatingQuickActions (Bottom Actions)
```

### State Management

The dashboard integrates with multiple Zustand stores:
- **Global Store**: Manages alerts, search, and UI state
- **Patient Store**: Patient data management
- **Payment Store**: Payment records and calculations
- **Appointment Store**: Appointment scheduling
- **Settings Store**: Clinic configuration and preferences

## Components Breakdown

### EnhancedHeader

The header component provides navigation, search, and quick access features.

**Key Features:**
- Global search with keyboard shortcut (F key)
- Settings and refresh controls
- Notification badge for unread alerts
- Clinic logo and name integration
- Mobile-responsive menu toggle

```tsx
interface EnhancedHeaderProps {
  onRefresh?: () => void
  onOpenSettings?: () => void
  onSearchResultSelect?: (result: any) => void
  onToggleMobileSidebar?: () => void
}
```

**Logo Integration:**
The header displays the clinic logo with fallback to clinic name initials:

```tsx
<div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
  {clinicLogo ? (
    <img src={clinicLogo} alt="Clinic Logo" className="w-full h-full object-cover rounded-xl" />
  ) : (
    <span className="text-white text-xs font-bold">{clinicName.slice(0, 3)}</span>
  )}
</div>
```

### LeftSidebarStatistics

Displays key metrics and statistics in an organized sidebar layout.

**Statistics Cards:**
- Total Patients
- Pending Payments
- Urgent Alerts
- Today's Appointments

```tsx
const stats = [
  {
    title: 'إجمالي المرضى',
    value: patients.length,
    icon: Users,
    color: 'text-blue-600'
  },
  // ... more stats
]
```

**Real-Time Updates:**
Calculates urgent alerts based on today's appointments and pending payments:

```tsx
const urgentAlerts = todayAppointments + (pendingAmount > 0 ? 1 : 0) + unreadAlertsCount
```

### DynamicTabsCarousel

Main content area with tabbed navigation and touch support.

**Tabs:**
1. **Today**: Quick access dashboard with recent activities
2. **Statistics**: Analytics and comprehensive reports
3. **Alerts**: Smart alerts and notifications

**Touch Navigation:**
Implements swipe gestures for mobile navigation:

```tsx
const onTouchStart = (e: React.TouchEvent) => {
  setTouchStart(e.targetTouches[0].clientX)
}

const onTouchEnd = () => {
  const distance = touchStart - touchEnd
  if (Math.abs(distance) > minSwipeDistance) {
    navigateTab(distance > 0 ? 'next' : 'prev')
  }
}
```

### FloatingQuickActions

Bottom-positioned floating action buttons for quick operations.

**Actions:**
- Add Patient (Shortcut: A)
- Book Appointment (Shortcut: S)
- Record Payment (Shortcut: D)

```tsx
const actions = [
  {
    label: 'إضافة مريض',
    icon: UserPlus,
    color: 'bg-blue-500 hover:bg-blue-600',
    shortcut: 'A'
  },
  // ... more actions
]
```

### NewDashboardLayout

Main container component that orchestrates all dashboard elements.

**Responsiveness:**
- Mobile: Single column with overlay sidebar
- Tablet: Two-column layout
- Desktop: Three-column grid with expanded sidebar

**Layout Grid:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] grid-rows-[auto_1fr] h-screen gap-0">
```

## Features

### RTL Arabic Support

Full right-to-left layout support with:
- `dir="rtl"` attribute on root elements
- RTL-specific CSS classes (rtl:flex-row-reverse)
- Arabic text alignment and positioning

### Responsive Design Patterns

**Breakpoint Strategy:**
- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (sidebar overlay)
- Desktop: > 1024px (persistent sidebar)

**Mobile Optimizations:**
- Touch-friendly button sizes (minimum 44px)
- Swipe navigation gestures
- Collapsible sidebar with overlay

### Touch Interactions

**Swipe Navigation:**
- Horizontal swipe to switch between tabs
- Minimum swipe distance: 50px
- Momentum-based transitions

**Touch Feedback:**
- Visual scale animations on button press
- Ripple effects for better tactile response

### Animation and Visual Effects

**Transition Types:**
- Page transitions with opacity and transform
- Loading states with spinner animations
- Hover effects with scale and color changes

**Performance Considerations:**
- Hardware acceleration with transform3d
- Reduced motion support for accessibility
- Debounced transitions during rapid interactions

## Dark Mode Integration

### Implementation Details

The dashboard implements a comprehensive dark mode system that seamlessly adapts all components to light and dark themes. The implementation uses CSS custom properties combined with Tailwind CSS utility classes and Zustand state management.

#### Core Architecture

The dark mode system consists of three main layers:

1. **State Management**: `useSettingsStore` manages theme state with localStorage persistence
2. **Context Provider**: `ThemeProvider` handles theme application and system preference detection
3. **Theme Classes**: `useThemeClasses` hook provides theme-aware CSS classes for components

#### State Management Structure

```tsx
interface ThemeState {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}
```

#### Theme Application Logic

The theme is applied through CSS classes on the document root element:

```tsx
useEffect(() => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, [isDarkMode])
```

### Theme Variables

The dashboard uses a comprehensive set of CSS custom properties and Tailwind classes organized by theme:

#### CSS Custom Properties (Light Theme)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

#### CSS Custom Properties (Dark Theme)
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 94.1%;
}
```

### Component Coverage

#### Core Dashboard Components
- **EnhancedHeader**: Logo, navigation, search with theme-adaptive colors
- **LeftSidebarStatistics**: Statistics cards with theme-aware backgrounds and text
- **DynamicTabsCarousel**: Tab navigation with smooth theme transitions
- **FloatingQuickActions**: Action buttons with theme-specific shadows and effects

#### Theme-Aware Components
All dashboard components support dark mode through the `useThemeClasses` hook:

```tsx
const themeClasses = useThemeClasses()

// Apply theme-aware classes
<div className={themeClasses.card}>
  <div className={themeClasses.textPrimary}>
    Content
  </div>
</div>
```

#### Chart Components
Dashboard analytics use theme-aware chart configurations:

```tsx
const chartConfig = getChartConfig(isDarkMode)
// Applies dark/light theme colors and grid styles
```

### Theme Switching

#### Manual Theme Control
Users can toggle themes through:
- Theme toggle button in EnhancedHeader
- Settings panel integration
- Keyboard shortcuts

#### Automatic Theme Detection
The system automatically detects system preference:

```tsx
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (storedTheme) {
  shouldBeDark = storedTheme === 'dark'
} else {
  shouldBeDark = systemPrefersDark
}
```

#### Performance Considerations
- **Immediate Application**: Theme is applied instantly to prevent flash of unstyled content
- **Smooth Transitions**: 300ms transitions for visual continuity
- **State Persistence**: Theme preference saved to localStorage
- **No Layout Shifts**: Theme changes don't affect component dimensions

### RTL Compatibility

Dark mode works seamlessly with Arabic RTL layouts:

#### RTL-Specific Considerations
- Text alignment remains right-aligned in both themes
- Icon positioning adapts to RTL flow
- Color contrast maintained in both light and dark themes
- Animations respect RTL direction

#### RTL Theme Classes
```tsx
// RTL-aware theme classes
const rtlClasses = isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'
```

## Currency System Integration

### Currency Context

The dashboard integrates a comprehensive currency system that handles multi-currency support, formatting, and real-time updates across all financial components.

#### Core Architecture

The currency system consists of:

1. **CurrencyContext**: Provides currency state and formatting functions
2. **SettingsStore**: Manages currency preferences and persistence
3. **Utils Library**: Handles currency formatting and conversions

#### Context Structure

```tsx
interface CurrencyContextType {
  currentCurrency: string
  currencyConfig: CurrencyConfig
  useArabicNumerals: boolean
  setCurrency: (currency: string) => void
  formatAmount: (amount: number) => string
  // ... additional methods
}
```

### Formatting Options

#### Supported Currencies

The system supports major Middle Eastern and international currencies:

- **USD**: US Dollar ($)
- **SAR**: Saudi Riyal (ر.س)
- **AED**: UAE Dirham (د.إ)
- **EGP**: Egyptian Pound (ج.م)
- **EUR**: Euro (€)
- **GBP**: British Pound (£)
- **KWD**: Kuwaiti Dinar (د.ك)
- **QAR**: Qatari Riyal (ر.ق)
- **BHD**: Bahraini Dinar (د.ب)
- **OMR**: Omani Rial (ر.ع)
- **SYP**: Syrian Pound (ل.س)
- **TRY**: Turkish Lira (₺)

#### Formatting Features

```tsx
// Standard formatting
formatCurrency(1234.56, 'SAR') // "١,٢٣٤٫٥٦ ر.س"

// With Arabic numerals
formatCurrency(1234.56, 'SAR', true) // "١,٢٣٤٫٥٦ ر.س"

// Symbol-only format
formatCurrencySymbol(1234.56, 'SAR') // "ر.س"
```

### Real-time Updates

#### Currency Propagation

Currency changes propagate through the dashboard via React context:

```tsx
// Currency context automatically updates all subscribers
<CurrencyProvider>
  <DashboardComponents />
</CurrencyProvider>
```

#### Settings Integration

Currency preferences are automatically saved and restored:

```tsx
// Settings store integration
const { currency, setCurrency } = useSettingsStore()
const { currentCurrency, setCurrency: setContextCurrency } = useCurrency()

// Changes sync between context and settings
```

### Arabic Numerals

#### Arabic-Indic Support

The system supports Arabic-Indic numerals for RTL currencies:

```tsx
// Convert Western to Arabic numerals
function convertToArabicNumerals(formattedString: string): string {
  // Replaces 0-9 with ٠-٩
  return formattedString.replace(/\d/g, digit => arabicNumerals[digit])
}
```

#### Configuration Options

Users can configure numeral display:

- **Western numerals**: 1,234.56
- **Arabic numerals**: ١,٢٣٤٫٥٦
- **Per-currency settings**: Different numerals for different currencies

### Multi-currency Support

#### Currency Switching

Seamless currency switching across the dashboard:

```tsx
const handleCurrencyChange = (newCurrency: string) => {
  setCurrency(newCurrency)
  // All components automatically re-render with new currency
}
```

#### Currency Information

Rich currency metadata for each supported currency:

```tsx
interface CurrencyConfig {
  code: string        // ISO code
  symbol: string      // Currency symbol
  name: string        // English name
  nameAr: string      // Arabic name
  decimals: number    // Decimal places
  locale: string      // Formatting locale
  position: 'before' | 'after'  // Symbol position
}
```

## Integration Features

### Combined Functionality

#### Theme and Currency Integration

The dashboard seamlessly combines dark mode and currency features:

```tsx
// Combined theme and currency usage
const themeClasses = useThemeClasses()
const { formatAmount, currentCurrency } = useCurrency()

<div className={themeClasses.card}>
  <span className={themeClasses.textPrimary}>
    {formatAmount(1234.56)}
  </span>
</div>
```

#### Cross-Component Consistency

All components maintain consistent theming and currency formatting:

- Statistics cards show amounts in selected currency
- Charts use theme-aware colors and currency labels
- Forms validate and format input in current currency
- Reports export with proper currency formatting

### Settings Integration

#### Theme Preferences

Users can configure theme behavior:

- **Manual toggle**: Immediate light/dark switching
- **System preference**: Follows OS theme setting
- **Auto-switching**: Based on time of day

#### Currency Configuration

Currency settings panel includes:

- **Default currency**: Primary currency for display
- **Numeral style**: Western or Arabic numerals
- **Formatting options**: Decimal places, separators
- **Multi-currency display**: Show amounts in multiple currencies

### Performance Considerations

#### Optimized Theme Switching

- **CSS Custom Properties**: Fast theme switching without layout recalculation
- **Class-Based Theming**: Minimal DOM manipulation
- **Lazy Loading**: Theme styles loaded only when needed
- **Transition Optimization**: Hardware-accelerated animations

#### Currency Performance

- **Memoized Formatting**: Cached currency formatting results
- **Efficient Updates**: Context-based propagation without full re-renders
- **Lazy Evaluation**: Currency formatting computed on-demand

### Accessibility

#### Theme Accessibility

- **Color Contrast**: WCAG-compliant contrast ratios maintained in both themes
- **Focus Indicators**: Theme-aware focus styles
- **Motion Preferences**: Respects `prefers-reduced-motion`
- **High Contrast**: Enhanced visibility options

#### Currency Accessibility

- **Screen Reader Support**: Currency symbols and names announced properly
- **Semantic Markup**: Proper ARIA labels for currency values
- **Keyboard Navigation**: Currency switching accessible via keyboard
- **RTL Support**: Full screen reader compatibility with Arabic content

## Integration

### Services Integration

**SmartAlertsService:**
- Real-time alert notifications
- Alert lifecycle management (create, update, dismiss)
- Event-driven updates

**GlobalSearchService:**
- Cross-entity search functionality
- Result ranking and filtering
- Search history management

**QuickAccessService:**
- Dashboard metrics and KPIs
- Recent activities tracking
- Performance analytics

### Hooks Integration

**useRealTimeAlerts:**
Manages real-time alert updates with event listeners:

```tsx
useEffect(() => {
  const handleDataChanged = () => {
    refreshAlerts()
  }

  window.addEventListener('patient-added', handleDataChanged)
  // ... more event listeners

  return () => {
    // Cleanup listeners
  }
}, [refreshAlerts])
```

**useStableSettings:**
Prevents flickering during theme changes:

```tsx
export function useStableClinicName(): string {
  const { settings } = useStableSettings()
  return settings?.clinic_name || 'عيادة الأسنان'
}
```

### Store Integration

**Global Store Actions:**
- `syncAllData()`: Refreshes all dashboard data
- `loadAlerts()`: Updates alert notifications
- `performGlobalSearch()`: Executes search queries

## Usage Instructions

### Basic Implementation

```tsx
import EnhancedDashboard from '@/pages/EnhancedDashboard'

function App() {
  const handleNavigateToPatients = () => {
    // Navigation logic
  }

  return (
    <EnhancedDashboard
      onNavigateToPatients={handleNavigateToPatients}
      onNavigateToAppointments={handleNavigateToAppointments}
      onNavigateToPayments={handleNavigateToPayments}
      onAddPatient={handleAddPatient}
      onAddAppointment={handleAddAppointment}
      onAddPayment={handleAddPayment}
    />
  )
}
```

### Customization Example

```tsx
// Custom theme colors
const customColors = {
  primary: '#your-primary-color',
  secondary: '#your-secondary-color'
}

// Custom layout configuration
const layoutConfig = {
  sidebarWidth: '320px',
  headerHeight: '80px',
  borderRadius: '12px'
}
```

### Event Handling

```tsx
const handleSearchResultSelect = (result: any) => {
  switch (result.type) {
    case 'patient':
      // Navigate to patient details
      break
    case 'appointment':
      // Open appointment modal
      break
    // ... handle other types
  }
}
```

### Theme Management

#### Theme Toggle Integration

```tsx
import { useTheme } from '@/contexts/ThemeContext'

function DashboardHeader() {
  const { isDarkMode, toggleDarkMode, setDarkMode } = useTheme()

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg hover:bg-accent transition-colors"
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
```

#### Theme-Aware Components

```tsx
import { useThemeClasses } from '@/contexts/ThemeContext'

function StatisticsCard({ title, value }) {
  const themeClasses = useThemeClasses()

  return (
    <div className={themeClasses.card}>
      <h3 className={themeClasses.textSecondary}>{title}</h3>
      <p className={themeClasses.textPrimary}>{value}</p>
    </div>
  )
}
```

#### System Theme Detection

```tsx
// Automatic theme detection and application
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e) => {
    setDarkMode(e.matches)
  }

  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}, [])
```

### Currency Configuration

#### Currency Context Usage

```tsx
import { useCurrency } from '@/contexts/CurrencyContext'

function PaymentForm() {
  const {
    currentCurrency,
    formatAmount,
    setCurrency,
    setUseArabicNumerals
  } = useCurrency()

  const handleAmountChange = (amount: number) => {
    const formatted = formatAmount(amount)
    console.log(`Amount: ${formatted}`)
  }

  return (
    <div>
      <select
        value={currentCurrency}
        onChange={(e) => setCurrency(e.target.value)}
      >
        <option value="USD">USD ($)</option>
        <option value="SAR">SAR (ر.س)</option>
        <option value="AED">AED (د.إ)</option>
      </select>

      <input
        type="number"
        onChange={(e) => handleAmountChange(Number(e.target.value))}
        placeholder="Enter amount"
      />
    </div>
  )
}
```

#### Arabic Numerals Configuration

```tsx
function SettingsPanel() {
  const { useArabicNumerals, setUseArabicNumerals, formatAmount } = useCurrency()

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={useArabicNumerals}
          onChange={(e) => setUseArabicNumerals(e.target.checked)}
        />
        Use Arabic numerals (٠-٩)
      </label>

      <p>Preview: {formatAmount(1234.56)}</p>
    </div>
  )
}
```

#### Multi-Currency Display

```tsx
function MultiCurrencyWidget() {
  const { formatAmount, getSupportedCurrencies } = useCurrency()
  const currencies = getSupportedCurrencies()

  return (
    <div>
      {Object.entries(currencies).map(([code, config]) => (
        <div key={code}>
          <span>{config.name}: </span>
          <span>{formatAmount(1000, code)}</span>
        </div>
      ))}
    </div>
  )
}
```

#### Currency Formatting Hooks

```tsx
// Custom hooks for specific formatting needs
import { useFormatCurrency, useCurrencySymbol } from '@/contexts/CurrencyContext'

function PriceDisplay({ amount }) {
  const formatCurrency = useFormatCurrency()
  const symbol = useCurrencySymbol()

  return (
    <span>
      {formatCurrency(amount)} ({symbol})
    </span>
  )
}
```

### Troubleshooting Theme Issues

#### Common Theme Problems

**Theme Not Applying**
```tsx
// Check if CSS classes are properly set
const rootClasses = document.documentElement.classList
console.log('Dark class present:', rootClasses.contains('dark'))
```

**Flash of Wrong Theme**
```tsx
// Ensure theme is set before component mount
useEffect(() => {
  // Apply theme immediately
  const stored = localStorage.getItem('dental-clinic-theme')
  if (stored === 'dark') {
    document.documentElement.classList.add('dark')
  }
}, [])
```

**Theme Not Persisting**
```tsx
// Check localStorage and settings store
const storedTheme = localStorage.getItem('dental-clinic-theme')
const settingsTheme = useSettingsStore(state => state.isDarkMode)

console.log('Stored theme:', storedTheme)
console.log('Settings theme:', settingsTheme)
```

### Troubleshooting Currency Issues

#### Currency Not Updating

**Context Not Available**
```tsx
// Ensure component is wrapped with CurrencyProvider
import { CurrencyProvider } from '@/contexts/CurrencyContext'

function App() {
  return (
    <CurrencyProvider>
      <YourComponents />
    </CurrencyProvider>
  )
}
```

**Settings Not Loading**
```tsx
// Check settings store initialization
const { loadSettings, settings } = useSettingsStore()

useEffect(() => {
  if (!settings) {
    loadSettings()
  }
}, [settings, loadSettings])
```

**Arabic Numerals Not Working**
```tsx
// Verify Arabic numerals setting
const { useArabicNumerals, currentCurrency } = useCurrency()

console.log('Arabic numerals enabled:', useArabicNumerals)
console.log('Current currency:', currentCurrency)

// Test formatting
const testAmount = formatCurrency(123.45)
console.log('Formatted amount:', testAmount)
```

#### Performance Issues

**Slow Currency Formatting**
```tsx
// Memoize expensive formatting operations
const formattedAmount = useMemo(() => {
  return formatAmount(amount)
}, [amount, currentCurrency, useArabicNumerals])
```

**Theme Switching Lag**
```tsx
// Use theme classes hook for batch updates
const themeClasses = useThemeClasses()

// Apply multiple theme classes at once
<div className={`${themeClasses.card} ${themeClasses.shadow}`}>
  {/* Content */}
</div>
```

## Customization

### Layout Customization

**Grid Column Widths:**
```css
/* Custom sidebar width */
md:grid-cols-[320px_1fr] /* Default: 280px */

/* Custom breakpoints */
xl:grid-cols-[400px_1fr] /* Large screens */
2xl:grid-cols-[450px_1fr] /* Extra large screens */
```

**Spacing Adjustments:**
```tsx
// Custom padding values
<div className="p-4 md:p-5 lg:p-6 xl:p-8">
```

### Component Theming

**Color Scheme Customization:**
```css
/* Custom gradient backgrounds */
from-blue-500 to-purple-600 /* Default header */
from-green-500 to-teal-600   /* Alternative */

/* Custom accent colors */
bg-blue-500 hover:bg-blue-600  /* Primary actions */
bg-red-500 hover:bg-red-600     /* Alert actions */
```

### Animation Configuration

**Transition Speeds:**
```tsx
// Custom transition duration
<div className="transition-all duration-200"> /* Faster */
<div className="transition-all duration-500"> /* Slower */
```

**Animation Types:**
- `opacity`: Fade transitions
- `transform`: Scale and position changes
- `scale`: Zoom effects
- `translate`: Slide animations

## Technical Details

### Performance Considerations

**Optimization Strategies:**
- Lazy loading of tab content
- Memoized components to prevent unnecessary re-renders
- Debounced search queries (300ms delay)
- Event listener cleanup to prevent memory leaks

**Bundle Size Impact:**
- Modular imports reduce initial bundle size
- Tree shaking removes unused components
- Code splitting for large analytics components

### Accessibility Features

**Keyboard Navigation:**
- Tab order follows logical content flow
- Enter/Space for button activation
- Escape to close modals
- Arrow keys for carousel navigation

**Screen Reader Support:**
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content updates
- Focus management for modal dialogs

**Motion Preferences:**
- `prefers-reduced-motion` CSS media query support
- Reduced animation intensity for accessibility
- Static alternatives for motion-sensitive users

### API References

#### Theme Context API

**`useTheme()` Hook**
```tsx
interface UseThemeReturn {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

const { isDarkMode, toggleDarkMode, setDarkMode } = useTheme()
```

**`useThemeClasses()` Hook**
```tsx
interface ThemeClasses {
  // Background classes
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgElevated: string

  // Text classes
  textPrimary: string
  textSecondary: string
  textMuted: string
  textHighContrast: string
  textMediumContrast: string

  // Border classes
  border: string
  borderLight: string
  borderFocus: string

  // Component classes
  card: string
  buttonPrimary: string
  buttonSecondary: string
  buttonGhost: string
  buttonOutline: string

  // Status classes
  statusScheduled: string
  statusCompleted: string
  statusCancelled: string
  statusNoShow: string
  statusInProgress: string

  // Navigation classes
  nav: string
  navItem: string
  navItemActive: string

  // Table classes
  table: string
  tableHeader: string
  tableRow: string
  tableCell: string

  // Dialog classes
  dialog: string
  dialogHeader: string
  dialogContent: string

  // Notification classes
  notificationSuccess: string
  notificationError: string
  notificationWarning: string
  notificationInfo: string

  // Alert classes
  alertError: string
  alertWarning: string
  alertSuccess: string
  alertInfo: string
}

const themeClasses = useThemeClasses()
```

**`getThemeColors()` Function**
```tsx
function getThemeColors(isDarkMode: boolean): ThemeColors

interface ThemeColors {
  primary: string
  primaryHover: string
  secondary: string
  secondaryHover: string
  success: string
  successHover: string
  warning: string
  warningHover: string
  error: string
  errorHover: string
  background: string
  surface: string
  surfaceElevated: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  borderLight: string
  accent: string
  accentHover: string
}
```

**`getStatusColors()` Function**
```tsx
function getStatusColors(isDarkMode: boolean): StatusColors

interface StatusColors {
  scheduled: {
    bg: string
    text: string
    border: string
  }
  completed: StatusColorConfig
  cancelled: StatusColorConfig
  inProgress: StatusColorConfig
}
```

#### Currency Context API

**`useCurrency()` Hook**
```tsx
interface UseCurrencyReturn {
  // Current currency configuration
  currentCurrency: string
  currencyConfig: CurrencyConfig
  useArabicNumerals: boolean

  // Currency management
  setCurrency: (currency: string) => void
  setUseArabicNumerals: (useArabic: boolean) => void
  getSupportedCurrencies: () => { [key: string]: CurrencyConfig }

  // Formatting functions
  formatAmount: (amount: number, currency?: string, useArabicNumerals?: boolean) => string
  formatAmountSymbol: (amount: number, currency?: string, useArabicNumerals?: boolean) => string
  formatAmountWithConfig: (amount: number, config?: CurrencyConfig, useArabicNumerals?: boolean) => string

  // Currency information
  getCurrencySymbol: (currency?: string) => string
  getCurrencyName: (currency?: string, useArabic?: boolean) => string
  getCurrencyDecimals: (currency?: string) => number
}

const {
  currentCurrency,
  formatAmount,
  setCurrency,
  setUseArabicNumerals
} = useCurrency()
```

**Currency Configuration Interface**
```tsx
interface CurrencyConfig {
  code: string        // ISO currency code (e.g., 'USD', 'SAR')
  symbol: string      // Currency symbol (e.g., '$', 'ر.س')
  name: string        // English name (e.g., 'US Dollar')
  nameAr: string      // Arabic name (e.g., 'دولار أمريكي')
  decimals: number    // Decimal places (e.g., 2 for USD, 3 for KWD)
  locale: string      // Formatting locale (e.g., 'en-US', 'ar-SA')
  position: 'before' | 'after'  // Symbol position relative to amount
}
```

**Convenience Hooks**
```tsx
// Simple currency formatting
const formatCurrency = useFormatCurrency()

// Get current currency symbol
const symbol = useCurrencySymbol()

// Get current currency info
const { currency, config } = useCurrentCurrency()
```

#### Utility Functions

**Currency Formatting Functions**
```tsx
// Format currency with full control
function formatCurrency(
  amount: number,
  currency?: string,
  useArabicNumerals?: boolean
): string

// Format currency with symbol only
function formatCurrencySymbol(
  amount: number,
  currency?: string,
  useArabicNumerals?: boolean
): string

// Format with custom configuration
function formatCurrencyWithConfig(
  amount: number,
  config: CurrencyConfig,
  useArabicNumerals?: boolean
): string

// Get currency configuration
function getCurrencyConfig(currencyCode: string): CurrencyConfig

// Set default currency
function setDefaultCurrency(currency: string): void

// Get default currency
function getDefaultCurrency(): string
```

**Arabic Numeral Functions**
```tsx
// Convert string to Arabic numerals
function convertToArabicNumerals(formattedString: string): string

// Convert number to Arabic numerals with decimals
function toArabicNumeralsWithDecimal(numStr: string): string
```

#### Settings Store API

**Theme Management**
```tsx
interface SettingsStore {
  // Theme state
  isDarkMode: boolean

  // Theme actions
  toggleDarkMode(): void
  initializeDarkMode(): void
  setLanguage(language: string): void
}

// Usage
const { isDarkMode, toggleDarkMode } = useSettingsStore()
```

**Currency Management**
```tsx
interface SettingsStore {
  // Currency state
  currency: string
  useArabicNumerals: boolean

  // Currency actions
  setCurrency(currency: string): void
  setUseArabicNumerals(useArabicNumerals: boolean): void
}

// Usage
const { currency, setCurrency, useArabicNumerals, setUseArabicNumerals } = useSettingsStore()
```

#### Component Architecture

**Theme-Aware Component Pattern**
```tsx
function ThemeAwareComponent() {
  const themeClasses = useThemeClasses()
  const { formatAmount } = useCurrency()

  return (
    <div className={themeClasses.card}>
      <h3 className={themeClasses.textPrimary}>
        {formatAmount(1234.56)}
      </h3>
      <p className={themeClasses.textSecondary}>
        Description text
      </p>
    </div>
  )
}
```

**Currency-Aware Component Pattern**
```tsx
function CurrencyAwareComponent({ amount }: { amount: number }) {
  const { formatAmount, currentCurrency } = useCurrency()
  const themeClasses = useThemeClasses()

  return (
    <div className={themeClasses.card}>
      <span className={themeClasses.textPrimary}>
        {formatAmount(amount)}
      </span>
      <span className={themeClasses.textSecondary}>
        in {currentCurrency}
      </span>
    </div>
  )
}
```

#### Best Practices

**State Management**
```tsx
// ✅ Good: Use hooks for component-level state
function MyComponent() {
  const { isDarkMode } = useTheme()
  const { formatAmount } = useCurrency()

  // Component logic
}

// ❌ Avoid: Direct store access in components
function MyComponent() {
  const isDarkMode = useSettingsStore(state => state.isDarkMode)

  // Component logic
}
```

**Performance Optimization**
```tsx
// ✅ Good: Memoize expensive operations
const formattedAmount = useMemo(() => {
  return formatAmount(amount)
}, [amount, currentCurrency, useArabicNumerals])

// ✅ Good: Use theme classes for batch updates
const themeClasses = useThemeClasses()
<div className={`${themeClasses.card} ${themeClasses.shadow}`}>
```

**Error Handling**
```tsx
// ✅ Good: Handle currency formatting errors
try {
  const formatted = formatCurrency(amount, currency)
  return formatted
} catch (error) {
  console.error('Currency formatting failed:', error)
  return amount.toString()
}
```

## Migration Guide

### From Old Dashboard

**Step 1: Update Imports**
```tsx
// Old
import Dashboard from '@/pages/Dashboard'

// New
import EnhancedDashboard from '@/pages/EnhancedDashboard'
```

**Step 2: Update Props Interface**
```tsx
// Old props (if any)
<Dashboard />

// New props with navigation handlers
<EnhancedDashboard
  onNavigateToPatients={handleNavigateToPatients}
  onNavigateToAppointments={handleNavigateToAppointments}
  onNavigateToPayments={handleNavigateToPayments}
  onAddPatient={handleAddPatient}
  onAddAppointment={handleAddAppointment}
  onAddPayment={handleAddPayment}
/>
```

**Step 3: Update Routing**
```tsx
// Old route
<Route path="/dashboard" component={Dashboard} />

// New route
<Route path="/dashboard" component={EnhancedDashboard} />
```

**Step 4: CSS Grid Compatibility**
Ensure your CSS framework supports CSS Grid:
```css
/* Required for grid layout */
display: grid;
grid-template-columns: 280px 1fr;
grid-template-rows: auto 1fr;
```

### Data Migration

**Settings Migration:**
The new dashboard automatically migrates existing settings:
- Clinic name and logo
- Theme preferences
- User preferences

**Alert System Migration:**
Existing alerts are automatically converted to the new format:
- Alert types mapping
- Priority levels
- Notification preferences

### Breaking Changes

**Removed Features:**
- Old static layout components
- Legacy navigation methods
- Deprecated API endpoints

**New Required Dependencies:**
- Zustand stores (globalStore, settingsStore)
- New service integrations
- Updated TypeScript interfaces

## Troubleshooting

### Common Issues

**Sidebar Not Responsive**
```tsx
// Check grid classes
<div className="md:grid-cols-[280px_1fr]"> // Correct
<div className="grid-cols-2">               // Incorrect
```

**Touch Events Not Working**
```tsx
// Ensure touch handlers are properly attached
<div
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
>
```

**RTL Layout Issues**
```tsx
// Ensure RTL direction is set
<div className="rtl" dir="rtl">
  {/* RTL content */}
</div>
```

### Performance Issues

**Slow Loading Times**
- Check network tab for large assets
- Verify lazy loading is working
- Monitor bundle size with build tools

**Memory Leaks**
- Ensure event listeners are cleaned up
- Check for circular references in stores
- Monitor component unmounting

### Integration Problems

**Store Connection Issues**
```tsx
// Verify store imports
import { useGlobalStore } from '@/store/globalStore'
import { usePatientStore } from '@/store/patientStore'
```

**Service Integration Failures**
- Check API endpoints are accessible
- Verify authentication tokens
- Monitor network requests in browser dev tools

**Real-Time Updates Not Working**
- Check WebSocket connections
- Verify event listener setup
- Monitor console for event-related errors

### Mobile-Specific Issues

**Touch Responsiveness**
- Test on actual devices, not just browser emulation
- Check touch target sizes (minimum 44px)
- Verify swipe gesture thresholds

**Viewport Problems**
```html
<!-- Ensure proper viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

This documentation provides comprehensive guidance for implementing and maintaining the new dashboard design. For additional support or questions, refer to the development team or check the component source code for implementation details.