import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

interface WordmarkProps {
  size?: 'compact' | 'full'
  className?: string
}

export function MediCareLogo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <rect
          width="40"
          height="40"
          rx="8"
          fill="currentColor"
          className="text-sky-600"
        />
        <path
          d="M20 10v20M10 20h20"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function MediCareWordmark({ size = 'compact', className = '' }: WordmarkProps) {
  const sizeClasses = {
    compact: 'text-lg font-bold',
    full: 'text-2xl font-bold'
  }

  return (
    <div className={`${sizeClasses[size]} ${className} text-blue-600 dark:text-blue-400`}>
      MediCare
    </div>
  )
}
