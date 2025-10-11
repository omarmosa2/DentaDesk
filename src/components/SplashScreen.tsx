import React, { useState, useEffect } from 'react'
import { Shield } from 'lucide-react'
import { useTheme, useThemeClasses } from '../contexts/ThemeContext'
import { useStableClinicName, useStableClinicLogo } from '../hooks/useStableSettings'
import { Button } from './ui/button'

interface SplashScreenProps {
  onComplete: () => void
  duration?: number // in milliseconds
}

export default function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const { isDarkMode } = useTheme()
  const themeClasses = useThemeClasses()
  const clinicName = useStableClinicName()
  const clinicLogo = useStableClinicLogo()

  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const next = prev + (100 / (duration / 50))
        return next >= 100 ? 100 : next
      })
    }, 50)

    // Auto complete after duration
    const timer = setTimeout(() => {
      handleComplete()
    }, duration)

    // Keyboard event handler
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        handleComplete()
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [duration])

  const handleComplete = () => {
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 500) // Wait for fade out animation
  }

  return (
    <div 
      className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-sky-50'}`}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-secondary/10 to-accent/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-accent/10 to-primary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 px-4">
        {/* Logo Container */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Logo Circle */}
            <div className={`relative w-40 h-40 rounded-full ${themeClasses.card} backdrop-blur-xl border-2 border-primary/30 shadow-2xl flex items-center justify-center overflow-hidden`}>
              {clinicLogo ? (
                <img 
                  src={clinicLogo} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Shield className="w-20 h-20 text-primary drop-shadow-lg" />
              )}
            </div>
          </div>
        </div>

        {/* Clinic Name */}
        <div className="space-y-3">
          <h1 className={`text-5xl font-bold ${themeClasses.textPrimary} arabic-enhanced drop-shadow-lg animate-fade-in`}>
            {clinicName}
          </h1>
          <p className={`text-2xl ${themeClasses.textSecondary} arabic-enhanced font-medium animate-fade-in`} style={{animationDelay: '0.2s'}}>
            نظام إدارة العيادة السنية
          </p>
        </div>

        {/* Welcome Message */}
        <div className={`${themeClasses.card} backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-border/50 max-w-md mx-auto animate-fade-in`} style={{animationDelay: '0.4s'}}>
          <p className={`text-xl ${themeClasses.textPrimary} arabic-enhanced font-semibold mb-2`}>
            مرحباً بك
          </p>
          <p className={`text-base ${themeClasses.textSecondary} arabic-enhanced`}>
            نحن سعداء بخدمتك
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto space-y-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
          <div className={`h-2 rounded-full ${themeClasses.card} overflow-hidden shadow-inner`}>
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Loading Dots */}
          <div className="flex justify-center items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Skip Button */}
        <div className="pt-4 animate-fade-in" style={{animationDelay: '0.8s'}}>
          <Button
            variant="outline"
            onClick={handleComplete}
            className={`${themeClasses.card} backdrop-blur-md hover:scale-105 transition-all duration-300 border-primary/30 hover:border-primary/50 shadow-lg`}
          >
            <span className="arabic-enhanced font-semibold">تخطي (Space)</span>
          </Button>
        </div>

        {/* Footer */}
        <div className={`text-sm ${themeClasses.textSecondary} arabic-enhanced animate-fade-in`} style={{animationDelay: '1s'}}>
          DentaDesk - نظام إدارة العيادات السنية
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}

