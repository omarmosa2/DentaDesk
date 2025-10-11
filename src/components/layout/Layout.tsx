import React, { useState, memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName } from '@/hooks/useStableSettings'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Stethoscope,
  Package,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Treatments', href: '/treatments', icon: Stethoscope },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Backup', href: '/backup', icon: Shield },
]

function LayoutComponent({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isDarkMode = useSettingsStore(state => state.isDarkMode)
  const toggleDarkMode = useSettingsStore(state => state.toggleDarkMode)
  const clinicName = useStableClinicName()

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with smooth gradients */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-800/90 dark:bg-slate-800/90 border-r border-slate-700 dark:border-slate-600 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 backdrop-blur-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo and clinic name */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 dark:border-slate-600">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100 dark:text-slate-100">
                  {clinicName}
                </h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-slate-300 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-600 dark:bg-blue-600 text-white shadow-lg"
                      : "text-slate-300 dark:text-slate-300 hover:text-slate-100 dark:hover:text-slate-100 hover:bg-slate-700 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400 dark:text-slate-400">
                Version 1.0.0
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="w-8 h-8 p-0 text-slate-300 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-700"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with smooth gradients */}
        <header className="bg-slate-800/90 dark:bg-slate-800/90 border-b border-slate-700 dark:border-slate-600 px-4 py-3 flex items-center justify-between lg:px-6 backdrop-blur-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mr-2 text-slate-300 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-semibold text-slate-100 dark:text-slate-100">
              {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick actions could go here */}
            <div className="text-sm text-slate-300 dark:text-slate-300">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </header>

        {/* Page content with smooth gradients */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-slate-900 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default memo(LayoutComponent)
