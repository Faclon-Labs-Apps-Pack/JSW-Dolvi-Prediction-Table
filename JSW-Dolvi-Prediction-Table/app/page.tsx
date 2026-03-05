"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import ExcelJS from "exceljs"
import { getStoredToken, clearToken } from "@/iosense-sdk/auth/ssoAuth"
import {
  fetchPredictionData as sdkFetchPrediction,
  fetchConsumptionData as sdkFetchConsumption,
} from "@/iosense-sdk/data/dataFetcher"

const LOSS_FACTOR = 0.9672 // 3.28% transmission loss

// Custom Calendar Component
function CustomCalendar({
  selected,
  onSelect,
  onClose,
}: {
  selected?: Date
  onSelect: (date: Date) => void
  onClose: () => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const dateToUse = selected || new Date()
    return new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 1)
  })

  const today = new Date()
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleDateClick = (day: number) => {
    // Prevent selection of future dates
    if (isFutureDate(day)) {
      return
    }
    
    const selectedDate = new Date(year, month, day)
    onSelect(selectedDate)
    onClose()
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year
  }

  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
  }

  const isFutureDate = (day: number) => {
    const dateToCheck = new Date(year, month, day)
    // Use client's local timezone for today's date
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dateToCheck > todayDateOnly
  }

  // Generate calendar days
  const calendarDays = []

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] p-3 w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPreviousMonth} className="p-1 hover:bg-gray-100 rounded transition-colors" type="button">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-medium text-sm">
          {monthNames[month]} {year}
        </div>
        <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors" type="button">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                onClick={() => handleDateClick(day)}
                type="button"
                disabled={isFutureDate(day)}
                className={cn(
                  "w-full h-full text-sm rounded transition-colors flex items-center justify-center",
                  isSelected(day) && "bg-blue-600 text-white hover:bg-blue-700",
                  isToday(day) && !isSelected(day) && "bg-gray-100 font-medium",
                  isFutureDate(day) 
                    ? "text-gray-300 cursor-not-allowed bg-gray-50" 
                    : "hover:bg-gray-100",
                )}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Format date function
function formatDate(date: Date, format: string): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  if (format === "dd MMMM yyyy") {
    return `${day.toString().padStart(2, "0")} ${months[month]} ${year}`
  }
  if (format === "yyyy-MM-dd") {
    return `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
  }
  if (format === "dd MMM yyyy") {
    return `${day.toString().padStart(2, "0")} ${months[month].slice(0, 3)} ${year}`
  }

  return date.toLocaleDateString()
}

// Function to determine zone based on time
function getZone(hour: number): string {
  if (hour >= 0 && hour < 6) return "Zone A"
  if (hour >= 6 && hour < 9) return "Zone B"
  if (hour >= 9 && hour < 17) return "Zone C"
  if (hour >= 17 && hour < 24) return "Zone D"
  return "Zone A"
}

// Function to get zone color
function getZoneColor(zone: string): string {
  switch (zone) {
    case "Zone A":
      return "bg-green-100 text-green-800"
    case "Zone B":
      return "bg-orange-100 text-orange-800"
    case "Zone C":
      return "bg-red-100 text-red-800"
    case "Zone D":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

// Generate 96 time slots (15-minute intervals)
function generateTimeSlots() {
  const slots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const endMinute = minute + 15
      const endHour = endMinute >= 60 ? hour + 1 : hour
      const adjustedEndMinute = endMinute >= 60 ? 0 : endMinute
      const endTime =
        endHour >= 24
          ? "00:00"
          : `${endHour.toString().padStart(2, "0")}:${adjustedEndMinute.toString().padStart(2, "0")}`

      slots.push({
        slotNo: slots.length + 1,
        timeSlot: `${startTime} - ${endTime}`,
        zone: getZone(hour),
        hour,
      })
    }
  }
  return slots
}

// --- helper to export the visible data to Excel (browser-safe)
async function exportToExcel(data: any[], selectedDate: Date, predictionData: Record<number, number>, consumptionData: Record<number, number>) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Trend Analysis")

  worksheet.columns = [
    { header: "Zone", key: "zone", width: 10 },
    { header: "Time Slot", key: "timeSlot", width: 16 },
    { header: "Slot No.", key: "slotNo", width: 10 },
    { header: "Final Prediction (kWh)", key: "predKwh", width: 22 },
    { header: "Total Injection Units (After 3.28% loss)", key: "injection", width: 36 },
    { header: "Actual Consumption (kWh)", key: "actualKwh", width: 24 },
    { header: "Final Prediction (MW)", key: "predMw", width: 22 },
    { header: "Actual Consumption (MW)", key: "actualMw", width: 22 },
    { header: "Capped Actual Consumption (kWh)", key: "capped", width: 30 },
    { header: "Over Injection (kWh)", key: "overInj", width: 20 },
    { header: "MSEB (₹)", key: "mseb", width: 14 },
  ]

  data.forEach((slot) => {
    const hasPred = predictionData[slot.slotNo] !== undefined
    const hasCons = consumptionData[slot.slotNo] !== undefined
    const pred = hasPred ? predictionData[slot.slotNo] : null
    const cons = hasCons ? consumptionData[slot.slotNo] : null
    const injection = pred !== null ? pred * LOSS_FACTOR : null

    worksheet.addRow({
      zone: slot.zone,
      timeSlot: slot.timeSlot,
      slotNo: `Slot ${slot.slotNo.toString().padStart(2, "0")}`,
      predKwh: pred !== null ? pred.toFixed(1) : "-",
      injection: injection !== null ? injection.toFixed(2) : "-",
      actualKwh: cons !== null ? cons.toFixed(2) : "-",
      predMw: pred !== null ? (pred / 250).toFixed(2) : "-",
      actualMw: cons !== null ? (cons / 250).toFixed(2) : "-",
      capped: cons !== null ? Math.min(4643, cons).toFixed(1) : "-",
      overInj:
        injection !== null && cons !== null
          ? Math.max(0, injection - cons).toFixed(1)
          : "-",
      mseb:
        injection !== null && cons !== null
          ? Math.max(0, cons - injection).toFixed(1)
          : "-",
    })
  })

  // Calculate and add totals row
  let totalActualConsumption = 0
  let totalOverInjection = 0
  let totalMSEB = 0
  let validDataCount = 0

  data.forEach((slot) => {
    if (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
      const actualConsumption = consumptionData[slot.slotNo]
      const totalInjection = predictionData[slot.slotNo] * LOSS_FACTOR
      totalActualConsumption += actualConsumption
      totalOverInjection += Math.max(0, totalInjection - actualConsumption)
      totalMSEB += Math.max(0, actualConsumption - totalInjection)
      validDataCount++
    }
  })

  worksheet.addRow({
    zone: "TOTAL",
    timeSlot: "-",
    slotNo: "-",
    predKwh: "-",
    injection: "-",
    actualKwh: validDataCount > 0 ? totalActualConsumption.toFixed(2) : "-",
    predMw: "-",
    actualMw: "-",
    capped: "-",
    overInj: validDataCount > 0 ? totalOverInjection.toFixed(1) : "-",
    mseb: validDataCount > 0 ? totalMSEB.toFixed(1) : "-",
  })

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Trend_Analysis_${formatDate(selectedDate, "yyyy-MM-dd")}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function TrendAnalysis() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date() // Uses client's local timezone
    today.setHours(0, 0, 0, 0) // Reset time to midnight for consistent date comparison
    return today
  })
  const [selectedZones, setSelectedZones] = useState<string[]>(["Zone A", "Zone B", "Zone C", "Zone D"])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [predictionData, setPredictionData] = useState<Record<number, number>>({})
  const [consumptionData, setConsumptionData] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  const currentTimeSlotRef = useRef<HTMLTableRowElement>(null)

  // Function to get current time slot number (1-96) using client's local timezone
  const getCurrentTimeSlot = () => {
    const now = new Date() // Uses client's local timezone automatically
    const hours = now.getHours()
    const minutes = now.getMinutes()
    
    // Calculate which 15-minute slot we're in
    const totalMinutes = hours * 60 + minutes
    const slotNumber = Math.floor(totalMinutes / 15) + 1
    
    // Ensure it's within valid range (1-96)
    return Math.min(Math.max(slotNumber, 1), 96)
  }

  // Check if selected date is today (using client's local timezone)
  const isSelectedDateToday = () => {
    const today = new Date() // Client's local time
    return selectedDate.toDateString() === today.toDateString()
  }


  // Fetch consumption data via IOsense SDK (2 authenticated requests for the whole day)
  const fetchConsumptionData = async (date: Date) => {
    const token = getStoredToken()
    if (!token) return
    try {
      const data = await sdkFetchConsumption(token, date)
      setConsumptionData(data)
    } catch (err: any) {
      if (err?.message === "AUTH_EXPIRED") {
        clearToken()
        window.location.reload()
        return
      }
      setConsumptionData({})
    }
  }

  // Fetch prediction data via IOsense SDK (1 authenticated request for the whole day)
  const fetchPredictionData = async (date: Date) => {
    setIsLoading(true)
    try {
      const token = getStoredToken()
      if (!token) return

      const result = await sdkFetchPrediction(token, date)
      setPredictionData(result)
    } catch (error) {
      setPredictionData({});
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when selected date changes
  useEffect(() => {
    setLastRefreshTime(new Date());
    fetchPredictionData(selectedDate);
    fetchConsumptionData(selectedDate);
  }, [selectedDate]);

  // Auto-refresh data every 5 minutes (only when viewing today's date)
  useEffect(() => {
    if (!isSelectedDateToday()) {
      return; // Don't auto-refresh for historical dates
    }

    const refreshInterval = setInterval(() => {
      setLastRefreshTime(new Date());
      fetchPredictionData(selectedDate);
      fetchConsumptionData(selectedDate);
    }, 30000); // 30 seconds

    // Cleanup interval on unmount or when date changes
    return () => {
      clearInterval(refreshInterval);
    };
  }, [selectedDate]); // Re-setup interval when date changes

  // Generate time slots and get current slot (ONLY if viewing today's date in client timezone)
  const timeSlots = generateTimeSlots()
  // currentTimeSlot will be null for any date that is NOT today - this disables both highlighting and auto-scroll
  const currentTimeSlot = isSelectedDateToday() ? getCurrentTimeSlot() : null
  const filteredSlots = timeSlots.filter((slot) => selectedZones.includes(slot.zone))
  
  // Find the latest slot with prediction data (most recent non-empty slot)
  const getLatestDataSlot = () => {
    if (!predictionData || Object.keys(predictionData).length === 0) return null
    // Get all slots with data, sorted in ascending order
    const slots = Object.keys(predictionData)
      .map(Number)
      .filter(slot => predictionData[slot] !== undefined && predictionData[slot] !== null)
      .sort((a, b) => a - b)
    
    // Find the last continuous slot with data
    let latestSlot = null
    for (let i = 1; i <= 96; i++) {
      if (predictionData[i] !== undefined && predictionData[i] !== null) {
        latestSlot = i
      }
    }
    return latestSlot
  }

  // Sorting functionality
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }
  
  const getSortedSlots = () => {
    if (!sortConfig) {
      // Return slots in normal order
      return filteredSlots
    }
    
    const sorted = [...filteredSlots].sort((a, b) => {
      let aValue: any = 0
      let bValue: any = 0
      
      // Calculate sorting values based on the key
      switch (sortConfig.key) {
        case 'timeSlot':
          aValue = a.timeSlot
          bValue = b.timeSlot
          break
        case 'slotNo':
          aValue = a.slotNo
          bValue = b.slotNo
          break
        case 'overInjection':
          // Calculate over injection for sorting
          if (predictionData[a.slotNo] !== undefined && consumptionData[a.slotNo] !== undefined) {
            const totalInjectionA = predictionData[a.slotNo] * LOSS_FACTOR
            const actualConsumptionA = consumptionData[a.slotNo]
            aValue = Math.max(0, totalInjectionA - actualConsumptionA)
          }
          if (predictionData[b.slotNo] !== undefined && consumptionData[b.slotNo] !== undefined) {
            const totalInjectionB = predictionData[b.slotNo] * LOSS_FACTOR
            const actualConsumptionB = consumptionData[b.slotNo]
            bValue = Math.max(0, totalInjectionB - actualConsumptionB)
          }
          break
        case 'mseb':
          // Calculate MSEB for sorting
          if (predictionData[a.slotNo] !== undefined && consumptionData[a.slotNo] !== undefined) {
            const totalInjectionA = predictionData[a.slotNo] * LOSS_FACTOR
            const actualConsumptionA = consumptionData[a.slotNo]
            aValue = Math.max(0, actualConsumptionA - totalInjectionA)
          }
          if (predictionData[b.slotNo] !== undefined && consumptionData[b.slotNo] !== undefined) {
            const totalInjectionB = predictionData[b.slotNo] * LOSS_FACTOR
            const actualConsumptionB = consumptionData[b.slotNo]
            bValue = Math.max(0, actualConsumptionB - totalInjectionB)
          }
          break
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    
    return sorted
  }
  
  const finalSlots = getSortedSlots()
  const latestDataSlot = getLatestDataSlot()
  
  // Calculate totals for the filtered slots
  const calculateTotals = () => {
    let totalActualConsumption = 0
    let totalOverInjection = 0
    let totalMSEB = 0
    let validDataCount = 0
    
    finalSlots.forEach((slot) => {
      if (!isLoading && predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
        const actualConsumption = consumptionData[slot.slotNo]
        const totalInjection = predictionData[slot.slotNo] * LOSS_FACTOR
        const overInjection = Math.max(0, totalInjection - actualConsumption)
        const mseb = Math.max(0, actualConsumption - totalInjection)
        
        totalActualConsumption += actualConsumption
        totalOverInjection += overInjection
        totalMSEB += mseb
        validDataCount++
      }
    })
    
    return {
      actualConsumption: validDataCount > 0 ? totalActualConsumption : 0,
      overInjection: validDataCount > 0 ? totalOverInjection : 0,
      mseb: validDataCount > 0 ? totalMSEB : 0,
      hasValidData: validDataCount > 0
    }
  }
  
  const totals = calculateTotals()

  // Auto-scroll ONLY works when viewing today's date in client timezone
  useEffect(() => {
    if (currentTimeSlotRef.current && isSelectedDateToday()) {
      setTimeout(() => {
        const tableContainer = currentTimeSlotRef.current?.closest('.overflow-y-auto')
        const currentRow = currentTimeSlotRef.current
        
        if (tableContainer && currentRow) {
          // Get the header height to offset the scroll position
          const headerElement = tableContainer.querySelector('thead')
          const headerHeight = headerElement?.getBoundingClientRect().height || 0
          
          // Calculate the position to scroll to
          const rowTop = currentRow.getBoundingClientRect().top
          const containerTop = tableContainer.getBoundingClientRect().top
          const currentScrollTop = tableContainer.scrollTop
          
          // Calculate the target scroll position to align row with header bottom
          const targetScrollTop = currentScrollTop + (rowTop - containerTop) - headerHeight
          
          tableContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          })
        } else {
          // Fallback to normal scroll
          currentTimeSlotRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100) // Small delay to ensure table is rendered
    }
  }, [selectedDate, finalSlots])

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isCalendarOpen])

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) => (prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]))
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: "#eeeeee" }}>
      <div className="w-full h-[calc(100vh-2rem)]">
        {/* Main Container */}
        <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-gray-900">Trend Analysis</h1>
              <div className="flex items-center gap-4">
              {/* Date Picker */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={cn(
                    "w-[240px] px-3 py-2 text-left font-normal bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-md transition-colors flex items-center",
                    !selectedDate && "text-gray-500",
                  )}
                  style={{ fontFamily: "Noto Sans, sans-serif" }}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                  {selectedDate ? (
                    <span className="text-gray-900 font-medium">{formatDate(selectedDate, "dd MMMM yyyy")}</span>
                  ) : (
                    <span>Pick a date</span>
                  )}
                </button>

                {isCalendarOpen && (
                  <CustomCalendar
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => exportToExcel(finalSlots, selectedDate, predictionData, consumptionData)}
                title="Export to Excel"
                className="hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
              </Button>
              </div>
            </div>
            {/* Note about 2 MW reduction */}
            <div className="mt-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Note:</span> 2 MW has been reduced from the final prediction for Zone C due to lower MSEB tariff rates since 1st November, 2025.
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="relative overflow-y-auto h-full rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-50" style={{ backgroundColor: "#F4F5F6" }}>
                  <tr>
                    <th
                      className="px-2 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <select
                        className="text-xs rounded-md px-1 py-1 text-gray-700 font-bold w-full"
                        style={{ backgroundColor: "#F4F5F6" }}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "all") {
                            setSelectedZones(["Zone A", "Zone B", "Zone C", "Zone D"])
                          } else {
                            setSelectedZones([value])
                          }
                        }}
                        value={selectedZones.length === 4 ? "all" : selectedZones[0] || "all"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="all">Zone (All)</option>
                        <option value="Zone A">Zone A</option>
                        <option value="Zone B">Zone B</option>
                        <option value="Zone C">Zone C</option>
                        <option value="Zone D">Zone D</option>
                      </select>
                    </th>
                    <th
                      className="px-2 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-24"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <button
                        onClick={() => handleSort('timeSlot')}
                        className="flex flex-col items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                      >
                        <div className="text-center leading-tight">
                          <div>Time Slot</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {sortConfig?.key === 'timeSlot' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </button>
                    </th>
                    <th
                      className="px-2 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-16"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <button
                        onClick={() => handleSort('slotNo')}
                        className="flex flex-col items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                      >
                        <div className="text-center leading-tight">
                          <div>Slot No.</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {sortConfig?.key === 'slotNo' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </button>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Final Prediction</div>
                        <div>(kWh)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Total Injection</div>
                        <div>(After 3.28% loss)</div>
                        <div>(kWh)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Actual Consumption</div>
                        <div>(kWh)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Final Prediction</div>
                        <div>(MW)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Actual Consumption</div>
                        <div>(MW)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <div className="text-center leading-tight">
                        <div>Capped Actual</div>
                        <div>Consumption</div>
                        <div>(kWh)</div>
                      </div>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-r border-gray-200 w-24"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <button
                        onClick={() => handleSort('overInjection')}
                        className="flex flex-col items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                      >
                        <div className="text-center leading-tight">
                          <div>Over Injection</div>
                          <div>(kWh)</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {sortConfig?.key === 'overInjection' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </button>
                    </th>
                    <th
                      className="px-1 py-2 text-left font-semibold text-xs border-b border-gray-200 w-20"
                      style={{ backgroundColor: "#F4F5F6", color: "#333333" }}
                    >
                      <button
                        onClick={() => handleSort('mseb')}
                        className="flex flex-col items-center gap-1 hover:bg-gray-100 p-1 rounded transition-colors text-xs w-full"
                      >
                        <div className="text-center leading-tight">
                          <div>MSEB</div>
                          <div>(kWh)</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {sortConfig?.key === 'mseb' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {finalSlots.map((slot, index) => {
                    // Calculate Over Injection: Max(0, Total Injection - Capped Actual Consumption)
                    let overInjectionValue = "0.0";
                    let msebValue = 0;
                    
                    if (!isLoading && predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
                      const totalInjection = predictionData[slot.slotNo] * LOSS_FACTOR;
                      const actualConsumption = consumptionData[slot.slotNo];
                      const overInjection = Math.max(0, totalInjection - actualConsumption);
                      const mseb = Math.max(0, actualConsumption - totalInjection);
                      
                      overInjectionValue = overInjection.toFixed(1);
                      msebValue = mseb;
                    } else {
                      // Use dash values when data not available
                      overInjectionValue = "-";
                      msebValue = 0;
                    }

                    // Check if we should highlight over injection (only for real calculated values > 0)
                    const shouldHighlightOverInjection = !isLoading && 
                      predictionData[slot.slotNo] !== undefined && 
                      consumptionData[slot.slotNo] !== undefined && 
                      Number.parseFloat(overInjectionValue) > 0;

                    // Check if we should highlight MSEB (only for real calculated values > 0)
                    const shouldHighlightMSEB = !isLoading && 
                      predictionData[slot.slotNo] !== undefined && 
                      consumptionData[slot.slotNo] !== undefined && 
                      msebValue > 0;

                    // Check if this is the current time slot (only highlight if viewing today)
                    const isCurrentTimeSlot = currentTimeSlot !== null && slot.slotNo === currentTimeSlot
                    
                    // Green highlighting based on latest data slot
                    // Highlights only the slot with the latest prediction data in Final Prediction (MW) column
                    const shouldHighlightFinalPredictionMW = latestDataSlot !== null && 
                      slot.slotNo === latestDataSlot &&
                      predictionData[slot.slotNo] !== undefined
                    
                    return (
                      <tr 
                        key={slot.slotNo}
                        ref={isCurrentTimeSlot ? currentTimeSlotRef : null}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td
                          className="px-2 py-2 border-b border-r border-gray-200 font-normal text-xs"
                          style={{ color: "#333333" }}
                        >
                          <span className={cn(
                            "rounded-full px-1 py-0.5 text-xs font-medium", 
                            getZoneColor(slot.zone)
                          )}>
                            {slot.zone}
                          </span>
                        </td>
                        <td
                          className="px-2 py-2 font-mono text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {slot.timeSlot}
                        </td>
                        <td
                          className="px-2 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          Slot {slot.slotNo.toString().padStart(2, "0")}
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (predictionData[slot.slotNo] !== undefined ? 
                              predictionData[slot.slotNo].toFixed(1) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (predictionData[slot.slotNo] !== undefined ? 
                              (predictionData[slot.slotNo] * LOSS_FACTOR).toFixed(2) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (consumptionData[slot.slotNo] !== undefined ? 
                              consumptionData[slot.slotNo].toFixed(2) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ 
                            backgroundColor: shouldHighlightFinalPredictionMW ? "#52C788" : "transparent",
                            color: shouldHighlightFinalPredictionMW ? "white" : "#333333",
                            borderColor: shouldHighlightFinalPredictionMW ? "#52C788" : undefined
                          }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (predictionData[slot.slotNo] !== undefined ? 
                              (predictionData[slot.slotNo] / 250).toFixed(2) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (consumptionData[slot.slotNo] !== undefined ? 
                              (consumptionData[slot.slotNo] / 250).toFixed(2) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{ color: "#333333" }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (consumptionData[slot.slotNo] !== undefined ? 
                              Math.min(4643, consumptionData[slot.slotNo]).toFixed(1) : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-r border-gray-200 font-normal text-center"
                          style={{
                            color: shouldHighlightOverInjection ? "#D92D20" : "#333333",
                            backgroundColor: shouldHighlightOverInjection ? "#FFE4DC" : "transparent",
                          }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined ? 
                              overInjectionValue : 
                              "-"
                            )
                          }
                        </td>
                        <td
                          className="px-1 py-2 text-xs border-b border-gray-200 font-normal text-center"
                          style={{
                            color: shouldHighlightMSEB ? "#D92D20" : "#333333",
                            backgroundColor: shouldHighlightMSEB ? "#FFE4DC" : "transparent",
                          }}
                        >
                          {isLoading ? 
                            "Loading..." : 
                            (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined ? 
                              msebValue.toFixed(1) : 
                              "-"
                            )
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-40" style={{ backgroundColor: "#F8F9FA" }}>
                  <tr className="border-t-2 border-gray-300">
                    <td className="px-2 py-3 text-xs font-bold text-center border-r border-gray-200" style={{ color: "#333333" }}>
                      TOTAL
                    </td>
                    <td className="px-2 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-2 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs font-bold text-center border-r border-gray-200" style={{ color: "#333333" }}>
                      {isLoading ? "Loading..." : totals.hasValidData ? totals.actualConsumption.toFixed(2) : "-"}
                    </td>
                    <td className="px-1 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs border-r border-gray-200">-</td>
                    <td className="px-1 py-3 text-xs font-bold text-center border-r border-gray-200" style={{ color: "#333333" }}>
                      {isLoading ? "Loading..." : totals.hasValidData ? totals.overInjection.toFixed(1) : "-"}
                    </td>
                    <td className="px-1 py-3 text-xs font-bold text-center" style={{ color: "#333333" }}>
                      {isLoading ? "Loading..." : totals.hasValidData ? totals.mseb.toFixed(1) : "-"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <div>
                Showing {finalSlots.length} of {timeSlots.length} time slots for {formatDate(selectedDate, "dd MMM yyyy")}
                {selectedZones.length < 4 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Filtered by: {selectedZones.join(", ")})
                  </span>
                )}
              </div>
              {isSelectedDateToday() && (
                <div className="text-xs text-gray-500">
                  Auto-refresh: Last updated {lastRefreshTime.getHours().toString().padStart(2, '0')}:{lastRefreshTime.getMinutes().toString().padStart(2, '0')}:{lastRefreshTime.getSeconds().toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
