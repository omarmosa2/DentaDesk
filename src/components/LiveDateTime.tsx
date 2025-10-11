/**
 * Live Date Time Component
 * Displays current date and time in Arabic with Gregorian calendar ONLY
 * Updates every second to show real-time clock
 * التقويم الميلادي فقط - لا يستخدم التقويم الهجري
 */

import React, { useState, useEffect } from 'react'

export default function LiveDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatGregorianDateTime = (date: Date): string => {
    // Using Gregorian calendar system ONLY - التقويم الميلادي فقط
    const day = date.getDate()
    const month = date.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()

    // Format date as DD/MM/YYYY (Gregorian format)
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')
    const formattedHours = hours.toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    const formattedSeconds = seconds.toString().padStart(2, '0')

    // Format: 20/06/2025 - 12:30:45 (Gregorian calendar)
    const dateNumbers = `${formattedDay}/${formattedMonth}/${year}`
    const timeNumbers = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`

    return `${dateNumbers} - ${timeNumbers}`
  }

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-xs">📅</span>
      <span>{formatGregorianDateTime(currentDateTime)}</span>
    </div>
  )
}
