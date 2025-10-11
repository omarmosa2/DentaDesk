import React, { useState, useEffect } from 'react'
import { ImageIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface DentalImageProps {
  imagePath: string
  alt?: string
  className?: string
  onLoad?: () => void
  onError?: () => void
}

export const DentalImage: React.FC<DentalImageProps> = ({
  imagePath,
  alt = 'Dental image',
  className = '',
  onLoad,
  onError
}) => {
  const { isDarkMode } = useTheme()
  const [imageData, setImageData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      if (!imagePath) {
        setHasError(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setHasError(false)

        // Check if Electron API is available
        if (window.electronAPI && window.electronAPI.files && window.electronAPI.files.getDentalImage) {
          console.log('Loading dental image:', imagePath)
          const dataUrl = await window.electronAPI.files.getDentalImage(imagePath)

          if (isMounted) {
            setImageData(dataUrl)
            setIsLoading(false)
            onLoad?.()
          }
        } else {
          console.warn('Electron API not available for image loading')
          if (isMounted) {
            setHasError(true)
            setIsLoading(false)
            onError?.()
          }
        }
      } catch (error) {
        console.error('Error loading dental image:', error)
        if (isMounted) {
          setHasError(true)
          setIsLoading(false)
          onError?.()
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [imagePath, onLoad, onError])

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isDarkMode ? "bg-gray-800" : "bg-gray-100",
        className
      )}>
        <div className="animate-pulse">
          <ImageIcon className={cn(
            "w-6 h-6",
            isDarkMode ? "text-gray-500" : "text-gray-400"
          )} />
        </div>
      </div>
    )
  }

  if (hasError || !imageData) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isDarkMode ? "bg-gray-800" : "bg-gray-100",
        className
      )}>
        <div className={cn(
          "text-center",
          isDarkMode ? "text-gray-500" : "text-gray-400"
        )}>
          <ImageIcon className="w-6 h-6 mx-auto mb-1" />
          <div className="text-xs">فشل في تحميل الصورة</div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageData}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={() => {
        setHasError(true)
        onError?.()
      }}
    />
  )
}

export default DentalImage
