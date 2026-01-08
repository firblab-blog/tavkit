import { useState, useEffect, useRef } from 'react'
import Icon from '../../common/Icon'

interface NextSessionProps {
  campaignId: string
}

export default function NextSession({ campaignId }: NextSessionProps) {
  const [nextSessionDate, setNextSessionDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`next-session-${campaignId}`)
    if (stored) {
      setNextSessionDate(new Date(stored))
    }
  }, [campaignId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  const formatSessionDate = (date: Date) => {
    const now = new Date()
    const diffInMs = date.getTime() - now.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

    if (diffInMs < 0) {
      return {
        text: 'Session was scheduled for ' + date.toLocaleDateString(),
        status: 'past',
      }
    }

    if (diffInDays === 0) {
      if (diffInHours === 0) {
        return { text: 'Session starts soon!', status: 'imminent' }
      }
      return { text: `Session in ${diffInHours} hours`, status: 'today' }
    }

    if (diffInDays === 1) {
      return { text: 'Session tomorrow', status: 'soon' }
    }

    if (diffInDays < 7) {
      return { text: `Session in ${diffInDays} days`, status: 'soon' }
    }

    return {
      text: `Next session: ${date.toLocaleDateString()}`,
      status: 'future',
    }
  }

  const openModal = () => {
    if (nextSessionDate) {
      const d = nextSessionDate
      setDateValue(d.toISOString().split('T')[0])
      setTimeValue(d.toTimeString().slice(0, 5))
    } else {
      setDateValue('')
      setTimeValue('19:00')
    }
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (dateValue) {
      const dateTimeStr = timeValue ? `${dateValue}T${timeValue}` : `${dateValue}T19:00`
      const date = new Date(dateTimeStr)
      if (!isNaN(date.getTime())) {
        setNextSessionDate(date)
        localStorage.setItem(`next-session-${campaignId}`, date.toISOString())
        setIsModalOpen(false)
      }
    }
  }

  const handleClearDate = () => {
    setNextSessionDate(null)
    localStorage.removeItem(`next-session-${campaignId}`)
  }

  const modal = isModalOpen && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-background-card border border-border rounded-lg p-6 w-full max-w-sm shadow-xl"
      >
        <h3 className="text-lg font-semibold text-text mb-4">Schedule Next Session</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1.5">Date</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1.5">Time</label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!dateValue}
            className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-background font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )

  if (!nextSessionDate) {
    return (
      <>
        <div className="bg-background-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="Calendar" className="w-5 h-5 text-text-muted" />
              <span className="text-text-muted">No upcoming session scheduled</span>
            </div>
            <button
              onClick={openModal}
              className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-background text-sm font-medium rounded transition-colors"
            >
              Schedule Session
            </button>
          </div>
        </div>
        {modal}
      </>
    )
  }

  const { text, status } = formatSessionDate(nextSessionDate)
  const statusColors = {
    past: 'text-text-muted border-text-muted/20',
    imminent: 'text-red-400 border-red-400/40 animate-pulse',
    today: 'text-yellow-400 border-yellow-400/40',
    soon: 'text-primary border-primary/40',
    future: 'text-blue-400 border-blue-400/40',
  }

  return (
    <>
      <div
        className={`bg-background-panel border-2 rounded-lg p-4 ${statusColors[status as keyof typeof statusColors]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="Calendar" className="w-5 h-5" />
            <div>
              <p className="font-semibold">{text}</p>
              {status === 'imminent' && <p className="text-sm opacity-70">Get ready to run!</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openModal}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Edit date"
            >
              <Icon name="Edit" className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearDate}
              className="p-2 hover:bg-background rounded transition-colors"
              title="Clear date"
            >
              <Icon name="X" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {modal}
    </>
  )
}
