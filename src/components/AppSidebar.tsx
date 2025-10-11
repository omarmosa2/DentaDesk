import * as React from "react"
import {
  Activity,
  CalendarDays,
  DollarSign,
  Shield,
  Stethoscope,
  User2,
  UserCheck,
  Microscope, // Added Microscope import
  Receipt, // Added Receipt import
  FileBarChart, // Added FileBarChart import
  Wrench, // Added Wrench import for dental treatments
  Database, // Added Database import for backup
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useStableClinicName, useStableDoctorName, useStableClinicLogo } from "@/hooks/useStableSettings"

// Navigation items data
const navigationItems = [
  {
    title: "لوحة التحكم",
    url: "dashboard",
    icon: Activity,
  },
  {
    title: "المرضى",
    url: "patients",
    icon: UserCheck,
  },
  {
    title: "المواعيد",
    url: "appointments",
    icon: CalendarDays,
  },
  {
    title: "الواردات",
    url: "payments",
    icon: DollarSign,
  },
  // {
  //   title: "المخزون",
  //   url: "inventory",
  //   icon: Package,
  // },
  {
    title: "المختبرات",
    url: "labs",
    icon: Microscope,
  },
  // {
  //   title: "الأدوية والوصفات",
  //   url: "medications",
  //   icon: Pill,
  // },
  {
    title: "العلاجات",
    url: "dental-treatments",
    icon: Stethoscope,
  },
  // {
  //   title: "احتياجات العيادة",
  //   url: "clinic-needs",
  //   icon: ClipboardList,
  // },
///////////////////
  {
    title: "المصروفات",
    url: "expenses",
    icon: Receipt,
  },

  {
    title: "التقارير",
    url: "reports",
    icon: FileBarChart,
  },
  {
    title: "النسخ الاحتياطية",
    url: "production-backup",
    icon: Database,
    style: { fontSize: '15px' },
  },
  ///////////////////////////////
  // {
  //   title: "فاتورة تقديرية ",
  //   url: "external-estimate",
  //   icon: FileText,
  // },
  {
    title: "الإعدادات",
    url: "settings",
    icon: Shield,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()

  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className="border-l border-border/50 dark:border-gray-700 shadow-xl rtl-layout bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 performance-optimized sidebar-performance loaded"
      {...props}
    >
      <SidebarHeader className="border-b border-border/50 dark:border-gray-700 dark:bg-gray-800 flex-shrink-0 performance-optimized layout-contained" style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'hsl(var(--background))',
        contain: 'layout style',
        willChange: 'auto'
      }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild >
              <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 dark:hover:bg-accent/20 transition-all duration-200 ease-out flex-rtl shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer">
                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 dark:from-blue-600 dark:to-blue-700 text-primary-foreground shadow-lg overflow-hidden ring-2 ring-primary/20 dark:ring-blue-500/20">
                  {clinicLogo && clinicLogo.trim() !== '' ? (
                    <img
                      src={clinicLogo}
                      alt="شعار العيادة"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Sidebar header logo failed to load:', clinicLogo)
                        // Fallback to default icon
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const fallbackIcon = document.createElement('div')
                          fallbackIcon.innerHTML = '<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                          parent.appendChild(fallbackIcon)
                        }
                      }}
                    />
                  ) : (
                    <Stethoscope className="size-6" />
                  )}
                </div>
                <div className="grid flex-1 text-right leading-tight ">
                  <span className="truncate font-bold text-l text-foreground dark:text-white">
                    {clinicName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground dark:text-gray-300 font-medium">
                    نظام إدارة العيادة
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 dark:bg-gray-800/20 flex-1 overflow-y-auto performance-optimized scroll-optimized flex-grow" style={{
        // maxHeight: 'calc(100vh - 140px)', // حساب ارتفاع الهيدر والفوتر
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgb(148 163 184 / 0.3) transparent',
        contain: 'layout style',
        willChange: 'auto',
        // Enhanced scroll performance
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}>
        <SidebarGroup className="space-y-2 flex-1 min-h-0 performance-optimized layout-contained" style={{
          contain: 'layout style',
          willChange: 'auto'
        }}>
          <SidebarGroupLabel className="text-sm font-bold text-muted-foreground dark:text-gray-300 uppercase tracking-wider px-3 py-2 text-right border-r-2 border-primary dark:border-blue-500">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 nav-rtl">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeTab === item.url}
                    onClick={() => onTabChange(item.url)}
                    className={`flex items-center gap-4 w-full text-right justify-start transition-all duration-200 ease-out py-4 px-6 text-base nav-item rounded-xl shadow-sm hover:shadow-md border group hover:scale-[1.02] focus:scale-[1.02] focus:outline-none focus:ring-2 ${
                      activeTab === item.url
                        ? 'bg-primary/10 dark:bg-blue-500/20 border-primary/30 dark:border-blue-500/30 text-primary dark:text-blue-400 font-semibold'
                        : 'hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30 dark:hover:from-blue-500/20 dark:hover:to-blue-500/10 border-transparent hover:border-primary/30 dark:hover:border-blue-500/30 text-foreground dark:text-gray-300'
                    }`}
                  >
                    <item.icon className={`size-5 nav-icon transition-all duration-300 ${
                      activeTab === item.url
                        ? 'text-primary dark:text-blue-400 scale-110'
                        : 'text-muted-foreground dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400'
                    }`} />
                    <span 
                      className={`font-medium transition-all duration-300 ${
                        activeTab === item.url
                          ? 'text-primary dark:text-blue-400 font-semibold'
                          : 'text-muted-foreground dark:text-gray-300'
                      }`}
                      style={item.style}
                    >{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
                 {/* Floating Quick Actions - redesigned as FAB */}
     

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 dark:border-border dark:bg-slate-900 flex-shrink-0 performance-optimized layout-contained" style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        background: 'hsl(var(--background))',
        marginTop: 'auto',
        contain: 'layout style',
        willChange: 'auto'
      }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 dark:from-accent/20 dark:to-accent/10 hover:from-accent/60 hover:to-accent/40 dark:hover:from-accent/30 dark:hover:to-accent/20 shadow-sm hover:shadow-md transition-all duration-200 ease-out hover:scale-[1.01] cursor-pointer">
              <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-purple-700 text-primary-foreground overflow-hidden ring-2 ring-primary/20 shadow-md">
                {clinicLogo && clinicLogo.trim() !== '' ? (
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      console.error('Sidebar footer logo failed to load:', clinicLogo)
                      // Fallback to default icon
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        const fallbackIcon = document.createElement('div')
                        fallbackIcon.innerHTML = '<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
                        parent.appendChild(fallbackIcon)
                      }
                    }}
                  />
                ) : (
                  <User2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-right leading-tight">
                <span className="truncate font-bold text-foreground dark:text-foreground text-sm">د. {doctorName}</span>
                <span className="truncate text-xs text-muted-foreground dark:text-muted-foreground font-medium">
                  {clinicName}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* SidebarRail disabled to remove the thin lines */}
    </Sidebar>
  )
}
