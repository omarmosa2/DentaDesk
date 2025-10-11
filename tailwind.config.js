/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Card backgrounds for light mode
    'bg-green-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50',
    'bg-blue-50', 'bg-purple-50', 'bg-emerald-50', 'bg-cyan-50',
    'bg-indigo-50', 'bg-pink-50', 'bg-slate-50', 'bg-gray-50',

    // Card backgrounds for dark mode
    'dark:bg-green-950', 'dark:bg-yellow-950', 'dark:bg-orange-950', 'dark:bg-red-950',
    'dark:bg-blue-950', 'dark:bg-purple-950', 'dark:bg-emerald-950', 'dark:bg-cyan-950',
    'dark:bg-indigo-950', 'dark:bg-pink-950', 'dark:bg-slate-950', 'dark:bg-gray-950',

    // Card borders for light mode
    'border-green-200', 'border-yellow-200', 'border-orange-200', 'border-red-200',
    'border-blue-200', 'border-purple-200', 'border-emerald-200', 'border-cyan-200',
    'border-indigo-200', 'border-pink-200', 'border-slate-200', 'border-gray-200',

    // Card borders for dark mode
    'dark:border-green-800', 'dark:border-yellow-800', 'dark:border-orange-800', 'dark:border-red-800',
    'dark:border-blue-800', 'dark:border-purple-800', 'dark:border-emerald-800', 'dark:border-cyan-800',
    'dark:border-indigo-800', 'dark:border-pink-800', 'dark:border-slate-800', 'dark:border-gray-800',

    // Icon colors for light mode
    'text-green-700', 'text-yellow-700', 'text-orange-700', 'text-red-700',
    'text-blue-700', 'text-purple-700', 'text-emerald-700', 'text-cyan-700',
    'text-indigo-700', 'text-pink-700', 'text-slate-700', 'text-gray-700',

    // Icon colors for dark mode
    'dark:text-green-300', 'dark:text-yellow-300', 'dark:text-orange-300', 'dark:text-red-300',
    'dark:text-blue-300', 'dark:text-purple-300', 'dark:text-emerald-300', 'dark:text-cyan-300',
    'dark:text-indigo-300', 'dark:text-pink-300', 'dark:text-slate-300', 'dark:text-gray-300',

    // Custom card classes
    'card-green', 'card-blue', 'card-purple', 'card-emerald', 'card-yellow', 'card-orange', 'card-red', 'card-indigo', 'card-gray', 'card-cyan',

    // Common utility classes
    'transition-all', 'duration-200', 'hover:shadow-lg', 'border', 'rounded-lg',

    // Additional dark mode classes for cards
    'bg-white', 'dark:bg-card', 'border-slate-200', 'dark:border-slate-700',
    'text-slate-700', 'dark:text-slate-300', 'text-slate-800', 'dark:text-slate-200',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
			dental: {
				'50': '#f0f9ff',
				'100': '#e0f2fe',
				'200': '#bae6fd',
				'300': '#7dd3fc',
				'400': '#38bdf8',
				'500': '#3b82f6',  // Updated to match image blue
				'600': '#2563eb',
				'700': '#1d4ed8',
				'800': '#1e40af',
				'900': '#1e3a8a',
				'950': '#172554'
			},
			medical: {
				'50': '#f0fdf4',
				'100': '#dcfce7',
				'200': '#bbf7d0',
				'300': '#86efac',
				'400': '#4ade80',
				'500': '#10b981',  // Updated to soft teal
				'600': '#059669',
				'700': '#047857',
				'800': '#065f46',
				'900': '#064e3b',
				'950': '#022c22'
			},
			status: {
				scheduled: '#3b82f6',  // Calming blue
				completed: '#10b981',  // Soft teal
				cancelled: '#ef4444',  // Soft red
				'no-show': '#64748b',  // Slate gray
				'in-progress': '#f59e0b', // Warm amber
				confirmed: '#10b981'   // Soft teal
			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))',
  				'7': 'hsl(var(--chart-7))',
  				'8': 'hsl(var(--chart-8))',
  				'grid': 'hsl(var(--chart-grid))',
  				'axis': 'hsl(var(--chart-axis))',
  				'text': 'hsl(var(--chart-text))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
			// Enhanced dark mode colors with smooth gradients and blue tint
			dark: {
				background: '#0f1419',           /* Deep charcoal with blue tint */
				'background-secondary': '#1a1f2e', /* Slate gray with blue undertone */
				'background-tertiary': '#1e2432',  /* Medium slate */
				card: '#1a1f2e',                 /* Card backgrounds with blue tint */
				'card-hover': '#252b3a',         /* Hover states with subtle lift */
				'card-elevated': '#1e2432',      /* Elevated surfaces */
				border: '#334155',               /* Light borders with blue tint */
				'border-medium': '#475569',      /* Medium borders */
				'border-strong': '#64748b',      /* Strong borders */
				'border-accent': '#3b82f6',      /* Accent borders */
				text: '#f8fafc',                 /* Soft white for comfort */
				'text-secondary': '#e2e8f0',     /* Light gray with blue tint */
				'text-tertiary': '#cbd5e1',      /* Medium gray */
				'text-muted': '#94a3b8',         /* Muted gray */
				'text-subtle': '#64748b',        /* Subtle gray */
				primary: '#3b82f6',              /* Calming blue */
				'primary-hover': '#2563eb',      /* Deeper blue */
				'primary-pressed': '#1d4ed8',    /* Deep blue */
				secondary: '#10b981',            /* Soft teal */
				'secondary-hover': '#059669',    /* Deeper teal */
				'secondary-pressed': '#047857',  /* Deep teal */
				destructive: '#ef4444',          /* Soft red */
				'destructive-hover': '#dc2626',  /* Deeper red */
				'destructive-pressed': '#b91c1c', /* Deep red */
				warning: '#f59e0b',              /* Warm amber */
				'warning-hover': '#d97706',      /* Deeper amber */
				'warning-pressed': '#b45309',    /* Deep amber */
				success: '#10b981',              /* Soft teal */
				'success-hover': '#059669',      /* Deeper teal */
				'success-pressed': '#047857',    /* Deep teal */
				info: '#3b82f6',                 /* Calming blue */
				'info-hover': '#2563eb',         /* Deeper blue */
				'info-pressed': '#1d4ed8'        /* Deep blue */
			}
  		},
  		fontFamily: {
  			sans: [
  				'Tajawal',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Oxygen',
  				'Ubuntu',
  				'Cantarell',
  				'Fira Sans',
  				'Droid Sans',
  				'Helvetica Neue',
  				'sans-serif'
  			],
  			arabic: [
  				'Tajawal',
  				'Noto Sans Arabic',
  				'Amiri',
  				'Scheherazade New',
  				'sans-serif'
  			],
  			tajawal: [
  				'Tajawal',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			'xs': ['14px', { lineHeight: '20px' }],
  			'sm': ['16px', { lineHeight: '24px' }],
  			'base': ['18px', { lineHeight: '28px' }],
  			'lg': ['20px', { lineHeight: '30px' }],
  			'xl': ['24px', { lineHeight: '32px' }],
  			'2xl': ['28px', { lineHeight: '36px' }],
  			'3xl': ['32px', { lineHeight: '40px' }],
  			'4xl': ['36px', { lineHeight: '44px' }],
  			'5xl': ['48px', { lineHeight: '56px' }],
  			'6xl': ['60px', { lineHeight: '68px' }],
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-in-fast': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'slide-in-from-top': {
  				from: {
  					transform: 'translateY(-100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-from-bottom': {
  				from: {
  					transform: 'translateY(100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-in-fast': 'fade-in-fast 0.1s ease-out',
  			'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
  			'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
