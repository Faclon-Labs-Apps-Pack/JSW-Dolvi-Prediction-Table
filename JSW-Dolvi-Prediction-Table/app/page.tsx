"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import { DataAccess } from "connector-userid-ts"

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
function exportToExcel(data: any[], selectedDate: Date, predictionData: Record<number, number>, consumptionData: Record<number, number>) {
  // 1. shape the data
  const rows = data.map((slot) => ({
    Zone: slot.zone,
    "Time Slot": slot.timeSlot,
    "Slot No.": `Slot ${slot.slotNo.toString().padStart(2, "0")}`,
    "Final Prediction (kWh)": predictionData[slot.slotNo] !== undefined ? predictionData[slot.slotNo].toFixed(1) : "-",
    "Total Injection Units (After loss-5.18%)": predictionData[slot.slotNo] !== undefined ? (predictionData[slot.slotNo] * 0.9672).toFixed(2) : "-",
    "Actual Consumption (kWh)": consumptionData[slot.slotNo] !== undefined ? consumptionData[slot.slotNo].toFixed(2) : "-",
    "Final Prediction (MW)": predictionData[slot.slotNo] !== undefined ? (predictionData[slot.slotNo] / 250).toFixed(2) : "-",
    "Actual Consumption (MW)": consumptionData[slot.slotNo] !== undefined ? (consumptionData[slot.slotNo] / 250).toFixed(2) : "-",
    "Capped Actual Consumption (kWh)": consumptionData[slot.slotNo] !== undefined ? Math.min(4643, consumptionData[slot.slotNo]).toFixed(1) : "-",
    "Over Injection (kWh)": (() => {
      if (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
        const totalInjection = predictionData[slot.slotNo] * 0.9672;
        const actualConsumption = consumptionData[slot.slotNo];
        const overInjection = Math.max(0, totalInjection - actualConsumption);
        return overInjection.toFixed(1);
      }
      return "-";
    })(),
    "MSEB (₹)": (() => {
      if (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
        const totalInjection = predictionData[slot.slotNo] * 0.9672;
        const actualConsumption = consumptionData[slot.slotNo];
        const mseb = Math.max(0, actualConsumption - totalInjection);
        return mseb.toFixed(1);
      }
      return "-";
    })(),
  }))

  // Calculate totals for the exported data
  let totalActualConsumption = 0
  let totalOverInjection = 0
  let totalMSEB = 0
  let validDataCount = 0
  
  data.forEach((slot) => {
    if (predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
      const actualConsumption = consumptionData[slot.slotNo]
      const totalInjection = predictionData[slot.slotNo] * 0.9681
      const overInjection = Math.max(0, totalInjection - actualConsumption)
      const mseb = Math.max(0, actualConsumption - totalInjection)
      
      totalActualConsumption += actualConsumption
      totalOverInjection += overInjection
      totalMSEB += mseb
      validDataCount++
    }
  })

  // Add totals row
  const totalsRow = {
    Zone: "TOTAL",
    "Time Slot": "-",
    "Slot No.": "-",
    "Final Prediction (kWh)": "-",
    "Total Injection Units (After loss-5.18%)": "-",
    "Actual Consumption (kWh)": validDataCount > 0 ? totalActualConsumption.toFixed(2) : "-",
    "Final Prediction (MW)": "-",
    "Actual Consumption (MW)": "-",
    "Capped Actual Consumption (kWh)": "-",
    "Over Injection (kWh)": validDataCount > 0 ? totalOverInjection.toFixed(1) : "-",
    "MSEB (₹)": validDataCount > 0 ? totalMSEB.toFixed(1) : "-",
  }

  // Add the totals row to the data
  rows.push(totalsRow)

  // 2. build workbook / worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, "Trend Analysis")

  // 3. write to an ArrayBuffer
  const wbArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })

  // 4. create a Blob and trigger download
  const blob = new Blob([wbArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
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

  // Function to convert date to IST and get start/end times for API query
  const getISTTimeRange = (date: Date) => {
    // Create IST date range (user selected date in IST)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // IST start: 6th July 00:00 IST
    const istStart = new Date(year, month, day, 0, 0, 0, 0);
    
    // IST end: 7th July 00:00 IST  
    const istEnd = new Date(year, month, day + 1, 0, 0, 0, 0);
    
    // Convert IST to UTC for API query
    // IST is UTC+5:30, so subtract 5.5 hours to get UTC
    // const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    // const utcStart = new Date(istStart.getTime() - istOffset);
    // const utcEnd = new Date(istEnd.getTime() - istOffset);
    
    
    
    return {
      startTime: istStart,
      endTime: istEnd
    };
  };

  // Function to fetch consumption data from new API endpoint
  const fetchConsumptionData = async (date: Date) => {
    try {
      const { startTime: dayStartTime } = getISTTimeRange(date);
      const consumptionMap: Record<number, number> = {};
      
      // Create all API calls as promises for parallel execution
      const apiCalls = [];
      
      for (let slot = 1; slot <= 96; slot++) {
        // Calculate 15-minute slot time range in UTC
        const slotStartUTC = new Date(dayStartTime.getTime() + (slot - 1) * 15 * 60 * 1000);
        const slotEndUTC = new Date(dayStartTime.getTime() + slot * 15 * 60 * 1000);
        
        const baseUrl = `https://datads-ext.iosense.io/api/apiLayer/getStartEndDPV2`;
        
        // Create D12 API call
        const d12Params = new URLSearchParams({
          device: "JSWDLV_A",
          sensor: "D12",
          startTime: slotStartUTC.getTime().toString(),
          endTime: slotEndUTC.getTime().toString(),
          disableThreshold: "true",
          customIntervalInSec: "0"
        });
        
        // Create D13 API call
        const d13Params = new URLSearchParams({
          device: "JSWDLV_A", 
          sensor: "D13",
          startTime: slotStartUTC.getTime().toString(),
          endTime: slotEndUTC.getTime().toString(),
          disableThreshold: "true",
          customIntervalInSec: "0"
        });
        
        // Add both API calls for this slot
        apiCalls.push({
          slot,
          d12Promise: fetch(`${baseUrl}?${d12Params}`).then(res => res.json()),
          d13Promise: fetch(`${baseUrl}?${d13Params}`).then(res => res.json())
        });
      }
      
      // Execute all API calls in parallel
      const results = await Promise.all(
        apiCalls.map(async ({ slot, d12Promise, d13Promise }) => {
          try {
            const [data1, data2] = await Promise.all([d12Promise, d13Promise]);
            
            // Calculate consumption: (endTime.value - startTime.value) for each sensor
            let d12Consumption = 0;
            let d13Consumption = 0;
            
            if (data1?.endTime?.value && data1?.startTime?.value) {
              d12Consumption = parseFloat(data1.endTime.value) - parseFloat(data1.startTime.value);
            }
            
            if (data2?.endTime?.value && data2?.startTime?.value) {
              d13Consumption = parseFloat(data2.endTime.value) - parseFloat(data2.startTime.value);
            }
            
            // Total consumption = D12 + D13
            const totalConsumption = d12Consumption + d13Consumption;
            
            return { slot, totalConsumption };
          } catch (error) {
            return { slot, totalConsumption: 0 };
          }
        })
      );
      
      // Process results into consumptionMap
      results.forEach(({ slot, totalConsumption }) => {
        if (totalConsumption > 0) {
          consumptionMap[slot] = totalConsumption;
        }
      });
      
      setConsumptionData(consumptionMap);
      
    } catch (error) {
      setConsumptionData({});
    }
  };

  // Function to fetch prediction data from API
  const fetchPredictionData = async (date: Date) => {
    setIsLoading(true);
    try {
      const { startTime, endTime } = getISTTimeRange(date);
      

      
      // Initialize DataAccess - TODO: Replace with actual credentials
      const dataAccess = new DataAccess({
        userId: "67e275d00faafe50ca744b29", // TODO: Replace with actual user ID
        dataUrl: "datads-ext.iosense.io", // TODO: Replace with actual data URL
        dsUrl: "datads-ext.iosense.io", // TODO: Replace with actual DS URL
        tz: "UTC" // IST timezone
      });
      
      

      const result = await dataAccess.dataQuery({
        deviceId: "JSWDLV_PREDICTION",
        sensorList: ["D2"],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        cal: true,
        alias: false,
        unix: false
      });
      
        
        
        // Map the result to time slots (assuming 96 slots for 24 hours)
        const dataMap: Record<number, number> = {};
        
        if (result && result.length > 0) {
          
          // Process the data and map to time slots
          result.forEach((dataPoint: any, index: number) => {
            
            if (dataPoint.timestamp && dataPoint.D2 !== null && dataPoint.D2 !== undefined) {
              const time = new Date(dataPoint.timestamp);
              
              // Convert UTC time to IST for slot calculation
              const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
              // const istTime = new Date(time.getTime() + istOffset);
              const istTime = new Date(time.getTime());
              const hour = istTime.getHours();
              const minute = istTime.getMinutes();
              
                              // Calculate slot number (96 slots for 24 hours, 15-minute intervals)
                const slotNumber = Math.floor((hour * 60 + minute) / 15) + 1;
              

              
              if (slotNumber >= 1 && slotNumber <= 96) {
                dataMap[slotNumber] = parseFloat(dataPoint.D2) || 0;
              }
            }
          });
                  }
          
          setPredictionData(dataMap);
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
      console.log('Auto-refreshing data...');
      setLastRefreshTime(new Date());
      fetchPredictionData(selectedDate);
      fetchConsumptionData(selectedDate);
    }, 300000); // 5 minutes

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
            const totalInjectionA = predictionData[a.slotNo] * 0.9681
            const actualConsumptionA = consumptionData[a.slotNo]
            aValue = Math.max(0, totalInjectionA - actualConsumptionA)
          }
          if (predictionData[b.slotNo] !== undefined && consumptionData[b.slotNo] !== undefined) {
            const totalInjectionB = predictionData[b.slotNo] * 0.9681
            const actualConsumptionB = consumptionData[b.slotNo]
            bValue = Math.max(0, totalInjectionB - actualConsumptionB)
          }
          break
        case 'mseb':
          // Calculate MSEB for sorting
          if (predictionData[a.slotNo] !== undefined && consumptionData[a.slotNo] !== undefined) {
            const totalInjectionA = predictionData[a.slotNo] * 0.9681
            const actualConsumptionA = consumptionData[a.slotNo]
            aValue = Math.max(0, actualConsumptionA - totalInjectionA)
          }
          if (predictionData[b.slotNo] !== undefined && consumptionData[b.slotNo] !== undefined) {
            const totalInjectionB = predictionData[b.slotNo] * 0.9681
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
  
  // Calculate totals for the filtered slots
  const calculateTotals = () => {
    let totalActualConsumption = 0
    let totalOverInjection = 0
    let totalMSEB = 0
    let validDataCount = 0
    
    finalSlots.forEach((slot) => {
      if (!isLoading && predictionData[slot.slotNo] !== undefined && consumptionData[slot.slotNo] !== undefined) {
        const actualConsumption = consumptionData[slot.slotNo]
        const totalInjection = predictionData[slot.slotNo] * 0.9681
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
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
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
                      const totalInjection = predictionData[slot.slotNo] * 0.9672;
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
                    
                    // Green highlighting ONLY works when viewing today's date (currentTimeSlot !== null)
                    // Highlights only the last slot (current + 2) in Final Prediction (MW) column
                    // BUT only if the slot has actual data (not "-")
                    const shouldHighlightFinalPredictionMW = currentTimeSlot !== null && 
                      slot.slotNo === currentTimeSlot + 2 &&
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
                              (predictionData[slot.slotNo] * 0.9672).toFixed(2) : 
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
