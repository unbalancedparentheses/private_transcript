import type { TranscriptSegment } from '../types';

/**
 * Simple heuristic-based speaker detection
 * Detects speaker turns based on paragraph breaks, dialogue patterns,
 * and sentence structure changes.
 */

// Patterns that indicate dialogue/speaker turns
const DIALOGUE_PATTERNS = [
  /^["'].*["']$/,                    // Quoted speech
  /^[A-Z][a-z]+:\s/,                 // "Name: speech"
  /^(Speaker|Person|Interviewer|Interviewee|Host|Guest|Q|A)\s*\d*:\s/i, // Speaker labels
  /^[-–—]\s/,                        // Dialogue dash
];

// Filler patterns that often indicate speaker changes
const TURN_INDICATORS = [
  /^(okay|ok|so|well|right|yeah|yes|no|um|uh|alright)\b/i,
  /^(i think|i believe|i mean|you know|in my opinion)/i,
];

/**
 * Detect if a segment likely starts with a new speaker
 */
function isLikelySpeakerChange(
  currentText: string,
  previousText: string | null
): boolean {
  const trimmed = currentText.trim();

  // Check dialogue patterns
  for (const pattern of DIALOGUE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // If we have previous text, check for turn-taking patterns
  if (previousText) {
    // Question followed by answer
    if (previousText.trim().endsWith('?') && !trimmed.endsWith('?')) {
      return true;
    }

    // Check if starts with turn indicators (only if not the first segment)
    for (const pattern of TURN_INDICATORS) {
      if (pattern.test(trimmed)) return true;
    }
  }

  return false;
}

/**
 * Parse a plain text transcript into segments with speaker labels
 * Uses paragraph breaks and dialogue patterns to detect speaker turns
 */
export function parseTranscriptIntoSegments(transcript: string): TranscriptSegment[] {
  if (!transcript || transcript.trim() === '') {
    return [];
  }

  // Split by double newlines (paragraphs) or single newlines with empty lines
  const paragraphs = transcript
    .split(/\n\s*\n|\n(?=[-–—])|(?<=\.)\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [{
      start: 0,
      end: 0,
      text: transcript.trim(),
      speaker: 'Speaker 1'
    }];
  }

  const segments: TranscriptSegment[] = [];
  let currentSpeaker = 1;
  let lastSpeaker = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    const previousText = i > 0 ? paragraphs[i - 1] : null;

    // Check if this looks like a new speaker
    const isParagraphBreak = true; // We're already split by paragraphs
    const hasDialoguePattern = isLikelySpeakerChange(text, previousText);

    // Simple alternating for dialogue-like content
    // For paragraphs without clear patterns, assume alternating speakers
    if (i === 0) {
      currentSpeaker = 1;
    } else if (hasDialoguePattern || paragraphs.length <= 10) {
      // For short transcripts or clear dialogue, alternate speakers
      currentSpeaker = lastSpeaker === 1 ? 2 : 1;
    } else {
      // For longer content without clear patterns, be more conservative
      // Only change if there's a clear indicator
      if (hasDialoguePattern) {
        currentSpeaker = lastSpeaker === 1 ? 2 : 1;
      }
    }

    segments.push({
      start: 0, // Timestamps not available from plain text
      end: 0,
      text: text,
      speaker: `Speaker ${currentSpeaker}`
    });

    lastSpeaker = currentSpeaker;
  }

  return segments;
}

/**
 * Parse a transcript that already has inline speaker labels
 * Format: "Speaker Name: text" or "Name: text"
 */
export function parseInlineSpeakerLabels(transcript: string): TranscriptSegment[] {
  if (!transcript || transcript.trim() === '') {
    return [];
  }

  const lines = transcript.split('\n').filter(l => l.trim());
  const segments: TranscriptSegment[] = [];

  // Pattern to match "Name:" at start of line
  const speakerPattern = /^([A-Z][a-zA-Z\s]*?):\s*(.*)$/;

  let currentSpeaker = 'Speaker 1';
  let currentText = '';

  for (const line of lines) {
    const match = line.match(speakerPattern);

    if (match) {
      // Save previous segment if exists
      if (currentText.trim()) {
        segments.push({
          start: 0,
          end: 0,
          text: currentText.trim(),
          speaker: currentSpeaker
        });
      }

      currentSpeaker = match[1].trim();
      currentText = match[2];
    } else {
      // Continue current speaker's text
      currentText += (currentText ? ' ' : '') + line.trim();
    }
  }

  // Don't forget the last segment
  if (currentText.trim()) {
    segments.push({
      start: 0,
      end: 0,
      text: currentText.trim(),
      speaker: currentSpeaker
    });
  }

  return segments.length > 0 ? segments : [{
    start: 0,
    end: 0,
    text: transcript.trim(),
    speaker: 'Speaker 1'
  }];
}

/**
 * Merge adjacent segments from the same speaker
 */
export function mergeAdjacentSpeakerSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length <= 1) return segments;

  const merged: TranscriptSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    if (segments[i].speaker === current.speaker) {
      // Merge text
      current.text += '\n\n' + segments[i].text;
      current.end = segments[i].end;
    } else {
      merged.push(current);
      current = { ...segments[i] };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Get unique speaker names from segments
 */
export function getUniqueSpeakers(segments: TranscriptSegment[]): string[] {
  const speakers = new Set<string>();
  segments.forEach(s => {
    if (s.speaker) speakers.add(s.speaker);
  });
  return Array.from(speakers);
}

/**
 * Rename a speaker across all segments
 */
export function renameSpeaker(
  segments: TranscriptSegment[],
  oldName: string,
  newName: string
): TranscriptSegment[] {
  return segments.map(s => ({
    ...s,
    speaker: s.speaker === oldName ? newName : s.speaker
  }));
}

/**
 * Convert segments back to plain text with speaker labels
 */
export function segmentsToText(segments: TranscriptSegment[], includeLabels: boolean = true): string {
  if (!includeLabels) {
    return segments.map(s => s.text).join('\n\n');
  }

  return segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
}

/**
 * Generate speaker colors based on speaker name
 */
export function getSpeakerColor(speaker: string): string {
  const colors = [
    'var(--primary)',
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
  ];

  // Simple hash based on speaker name
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = ((hash << 5) - hash) + speaker.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Estimate timestamps for segments based on text position and audio duration.
 * This is a simple linear estimation - assumes constant speaking rate.
 */
export function estimateSegmentTimestamps(
  segments: TranscriptSegment[],
  audioDuration: number
): TranscriptSegment[] {
  if (segments.length === 0 || audioDuration <= 0) return segments;

  // Calculate total text length
  const totalLength = segments.reduce((sum, s) => sum + s.text.length, 0);
  if (totalLength === 0) return segments;

  // Estimate timestamps based on proportional text length
  let currentPosition = 0;
  return segments.map((segment) => {
    const startTime = (currentPosition / totalLength) * audioDuration;
    currentPosition += segment.text.length;
    const endTime = (currentPosition / totalLength) * audioDuration;

    return {
      ...segment,
      start: startTime,
      end: endTime,
    };
  });
}

/**
 * Find the segment that corresponds to a given audio timestamp
 */
export function findSegmentAtTime(
  segments: TranscriptSegment[],
  currentTime: number
): number {
  for (let i = 0; i < segments.length; i++) {
    if (currentTime >= segments[i].start && currentTime < segments[i].end) {
      return i;
    }
  }
  // If after all segments, return last one
  if (segments.length > 0 && currentTime >= segments[segments.length - 1].start) {
    return segments.length - 1;
  }
  return -1;
}

/**
 * Format seconds into mm:ss format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
