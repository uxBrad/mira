import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatRelativeDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return formatDate(timestamp)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export const WCAG_CRITERIA = [
  { id: '1.1.1', name: 'Non-text Content', level: 'A', category: 'perception' },
  { id: '1.2.1', name: 'Audio-only and Video-only', level: 'A', category: 'perception' },
  { id: '1.2.2', name: 'Captions (Prerecorded)', level: 'A', category: 'perception' },
  { id: '1.2.3', name: 'Audio Description or Media Alternative', level: 'A', category: 'perception' },
  { id: '1.2.4', name: 'Captions (Live)', level: 'AA', category: 'perception' },
  { id: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA', category: 'perception' },
  { id: '1.3.1', name: 'Info and Relationships', level: 'A', category: 'perception' },
  { id: '1.3.2', name: 'Meaningful Sequence', level: 'A', category: 'perception' },
  { id: '1.3.3', name: 'Sensory Characteristics', level: 'A', category: 'perception' },
  { id: '1.3.4', name: 'Orientation', level: 'AA', category: 'perception' },
  { id: '1.3.5', name: 'Identify Input Purpose', level: 'AA', category: 'perception' },
  { id: '1.4.1', name: 'Use of Color', level: 'A', category: 'perception' },
  { id: '1.4.2', name: 'Audio Control', level: 'A', category: 'perception' },
  { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', category: 'perception' },
  { id: '1.4.4', name: 'Resize Text', level: 'AA', category: 'perception' },
  { id: '1.4.5', name: 'Images of Text', level: 'AA', category: 'perception' },
  { id: '1.4.10', name: 'Reflow', level: 'AA', category: 'perception' },
  { id: '1.4.11', name: 'Non-text Contrast', level: 'AA', category: 'perception' },
  { id: '1.4.12', name: 'Text Spacing', level: 'AA', category: 'perception' },
  { id: '1.4.13', name: 'Content on Hover or Focus', level: 'AA', category: 'perception' },
  { id: '2.1.1', name: 'Keyboard', level: 'A', category: 'action' },
  { id: '2.1.2', name: 'No Keyboard Trap', level: 'A', category: 'action' },
  { id: '2.1.4', name: 'Character Key Shortcuts', level: 'A', category: 'action' },
  { id: '2.2.1', name: 'Timing Adjustable', level: 'A', category: 'action' },
  { id: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', category: 'action' },
  { id: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A', category: 'perception' },
  { id: '2.4.1', name: 'Bypass Blocks', level: 'A', category: 'action' },
  { id: '2.4.2', name: 'Page Titled', level: 'A', category: 'cognition' },
  { id: '2.4.3', name: 'Focus Order', level: 'A', category: 'action' },
  { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', category: 'interaction' },
  { id: '2.4.5', name: 'Multiple Ways', level: 'AA', category: 'cognition' },
  { id: '2.4.6', name: 'Headings and Labels', level: 'AA', category: 'cognition' },
  { id: '2.4.7', name: 'Focus Visible', level: 'AA', category: 'action' },
  { id: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA', category: 'action' },
  { id: '2.5.1', name: 'Pointer Gestures', level: 'A', category: 'action' },
  { id: '2.5.2', name: 'Pointer Cancellation', level: 'A', category: 'action' },
  { id: '2.5.3', name: 'Label in Name', level: 'A', category: 'interaction' },
  { id: '2.5.4', name: 'Motion Actuation', level: 'A', category: 'action' },
  { id: '2.5.7', name: 'Dragging Movements', level: 'AA', category: 'action' },
  { id: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', category: 'action' },
  { id: '3.1.1', name: 'Language of Page', level: 'A', category: 'cognition' },
  { id: '3.1.2', name: 'Language of Parts', level: 'AA', category: 'cognition' },
  { id: '3.2.1', name: 'On Focus', level: 'A', category: 'interaction' },
  { id: '3.2.2', name: 'On Input', level: 'A', category: 'interaction' },
  { id: '3.2.3', name: 'Consistent Navigation', level: 'AA', category: 'cognition' },
  { id: '3.2.4', name: 'Consistent Identification', level: 'AA', category: 'cognition' },
  { id: '3.2.6', name: 'Consistent Help', level: 'A', category: 'cognition' },
  { id: '3.3.1', name: 'Error Identification', level: 'A', category: 'interaction' },
  { id: '3.3.2', name: 'Labels or Instructions', level: 'A', category: 'cognition' },
  { id: '3.3.3', name: 'Error Suggestion', level: 'AA', category: 'interaction' },
  { id: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', category: 'interaction' },
  { id: '3.3.7', name: 'Redundant Entry', level: 'A', category: 'interaction' },
  { id: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA', category: 'interaction' },
  { id: '4.1.1', name: 'Parsing', level: 'A', category: 'interaction' },
  { id: '4.1.2', name: 'Name, Role, Value', level: 'A', category: 'interaction' },
  { id: '4.1.3', name: 'Status Messages', level: 'AA', category: 'interaction' }
] as const

export type WcagCriterion = (typeof WCAG_CRITERIA)[number]

export const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical', description: 'Blocks access entirely for some users' },
  { value: 'serious', label: 'Serious', description: 'Causes significant difficulty for some users' },
  { value: 'moderate', label: 'Moderate', description: 'Causes some difficulty but has workarounds' },
  { value: 'minor', label: 'Minor', description: 'Minor inconvenience, minimal impact' }
] as const

export const CATEGORY_OPTIONS = [
  { value: 'perception', label: 'Perception', description: 'How users perceive visual, auditory, tactile content' },
  { value: 'cognition', label: 'Cognition', description: 'How users understand and process information' },
  { value: 'action', label: 'Action', description: 'Physical interactions and navigation' },
  { value: 'interaction', label: 'Interaction', description: 'How users interact with content and controls' }
] as const

export const STANDARDS_OPTIONS = [
  { value: 'WCAG 2.1 A', label: 'WCAG 2.1 A' },
  { value: 'WCAG 2.1 AA', label: 'WCAG 2.1 AA' },
  { value: 'WCAG 2.1 AAA', label: 'WCAG 2.1 AAA' },
  { value: 'WCAG 2.2 A', label: 'WCAG 2.2 A' },
  { value: 'WCAG 2.2 AA', label: 'WCAG 2.2 AA' },
  { value: 'WCAG 2.2 AAA', label: 'WCAG 2.2 AAA' },
  { value: 'ADA', label: 'ADA' },
  { value: 'Section 508', label: 'Section 508' },
  { value: 'EN 301 549', label: 'EN 301 549' }
] as const

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't Fix" }
] as const

export const PROJECT_STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' }
] as const
