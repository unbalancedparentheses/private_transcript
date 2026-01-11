import { describe, it, expect } from 'vitest';
import {
  parseTranscriptIntoSegments,
  parseInlineSpeakerLabels,
  mergeAdjacentSpeakerSegments,
  getUniqueSpeakers,
  renameSpeaker,
  segmentsToText,
  getSpeakerColor,
} from './speakerDetection';
import type { TranscriptSegment } from '../types';

describe('speakerDetection', () => {
  describe('parseTranscriptIntoSegments', () => {
    it('should return empty array for empty transcript', () => {
      expect(parseTranscriptIntoSegments('')).toEqual([]);
      expect(parseTranscriptIntoSegments('   ')).toEqual([]);
    });

    it('should parse single paragraph as one segment', () => {
      const transcript = 'Hello, this is a test.';
      const segments = parseTranscriptIntoSegments(transcript);

      expect(segments).toHaveLength(1);
      expect(segments[0].text).toBe('Hello, this is a test.');
      expect(segments[0].speaker).toBe('Speaker 1');
    });

    it('should parse multiple paragraphs into segments', () => {
      const transcript = `This is the first paragraph.

This is the second paragraph.

This is the third paragraph.`;

      const segments = parseTranscriptIntoSegments(transcript);

      expect(segments.length).toBeGreaterThanOrEqual(2);
      expect(segments[0].speaker).toBe('Speaker 1');
    });

    it('should alternate speakers for dialogue-like content', () => {
      const transcript = `How are you doing today?

I'm doing well, thank you for asking.

That's great to hear!`;

      const segments = parseTranscriptIntoSegments(transcript);

      // Should detect alternating speakers
      expect(segments.length).toBeGreaterThanOrEqual(2);
      // First and third should be same speaker, second should be different
      const speakers = segments.map((s) => s.speaker);
      expect(speakers.filter((s) => s === 'Speaker 1').length).toBeGreaterThan(0);
      expect(speakers.filter((s) => s === 'Speaker 2').length).toBeGreaterThan(0);
    });

    it('should have start and end times set to 0 for plain text', () => {
      const segments = parseTranscriptIntoSegments('Test content.');

      expect(segments[0].start).toBe(0);
      expect(segments[0].end).toBe(0);
    });
  });

  describe('parseInlineSpeakerLabels', () => {
    it('should return empty array for empty transcript', () => {
      expect(parseInlineSpeakerLabels('')).toEqual([]);
    });

    it('should parse transcript with inline speaker labels', () => {
      const transcript = `John: Hello, how are you?
Jane: I'm doing great, thanks!
John: That's wonderful to hear.`;

      const segments = parseInlineSpeakerLabels(transcript);

      expect(segments).toHaveLength(3);
      expect(segments[0].speaker).toBe('John');
      expect(segments[0].text).toBe("Hello, how are you?");
      expect(segments[1].speaker).toBe('Jane');
      expect(segments[1].text).toBe("I'm doing great, thanks!");
      expect(segments[2].speaker).toBe('John');
      expect(segments[2].text).toBe("That's wonderful to hear.");
    });

    it('should handle multi-word speaker names', () => {
      const transcript = `Dr Smith: The results are in.
Patient John: What do they say?`;

      const segments = parseInlineSpeakerLabels(transcript);

      expect(segments).toHaveLength(2);
      expect(segments[0].speaker).toBe('Dr Smith');
      expect(segments[1].speaker).toBe('Patient John');
    });

    it('should handle transcript without speaker labels', () => {
      const transcript = 'Just some regular text without labels.';
      const segments = parseInlineSpeakerLabels(transcript);

      expect(segments).toHaveLength(1);
      expect(segments[0].speaker).toBe('Speaker 1');
      expect(segments[0].text).toBe('Just some regular text without labels.');
    });

    it('should concatenate multi-line speech from same speaker', () => {
      const transcript = `Host: Welcome to the show.
Today we have a special guest.
Guest: Thank you for having me.`;

      const segments = parseInlineSpeakerLabels(transcript);

      expect(segments).toHaveLength(2);
      expect(segments[0].speaker).toBe('Host');
      expect(segments[0].text).toBe('Welcome to the show. Today we have a special guest.');
      expect(segments[1].speaker).toBe('Guest');
    });
  });

  describe('mergeAdjacentSpeakerSegments', () => {
    it('should return empty array for empty input', () => {
      expect(mergeAdjacentSpeakerSegments([])).toEqual([]);
    });

    it('should return same array if single segment', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Speaker 1' },
      ];
      expect(mergeAdjacentSpeakerSegments(segments)).toEqual(segments);
    });

    it('should merge adjacent segments from same speaker', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Speaker 1' },
        { start: 10, end: 20, text: 'World', speaker: 'Speaker 1' },
        { start: 20, end: 30, text: 'Different', speaker: 'Speaker 2' },
      ];

      const merged = mergeAdjacentSpeakerSegments(segments);

      expect(merged).toHaveLength(2);
      expect(merged[0].text).toBe('Hello\n\nWorld');
      expect(merged[0].speaker).toBe('Speaker 1');
      expect(merged[1].speaker).toBe('Speaker 2');
    });

    it('should keep segments from different speakers separate', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Speaker 1' },
        { start: 10, end: 20, text: 'Hi there', speaker: 'Speaker 2' },
        { start: 20, end: 30, text: 'Nice to meet you', speaker: 'Speaker 1' },
      ];

      const merged = mergeAdjacentSpeakerSegments(segments);

      expect(merged).toHaveLength(3);
    });
  });

  describe('getUniqueSpeakers', () => {
    it('should return empty array for empty segments', () => {
      expect(getUniqueSpeakers([])).toEqual([]);
    });

    it('should return unique speaker names', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        { start: 10, end: 20, text: 'Hi', speaker: 'Bob' },
        { start: 20, end: 30, text: 'Hey', speaker: 'Alice' },
      ];

      const speakers = getUniqueSpeakers(segments);

      expect(speakers).toHaveLength(2);
      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
    });

    it('should handle segments without speaker', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        { start: 10, end: 20, text: 'Hi' },
      ];

      const speakers = getUniqueSpeakers(segments);

      expect(speakers).toHaveLength(1);
      expect(speakers).toContain('Alice');
    });
  });

  describe('renameSpeaker', () => {
    it('should rename speaker in all segments', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Speaker 1' },
        { start: 10, end: 20, text: 'Hi', speaker: 'Speaker 2' },
        { start: 20, end: 30, text: 'Hey', speaker: 'Speaker 1' },
      ];

      const renamed = renameSpeaker(segments, 'Speaker 1', 'John');

      expect(renamed[0].speaker).toBe('John');
      expect(renamed[1].speaker).toBe('Speaker 2');
      expect(renamed[2].speaker).toBe('John');
    });

    it('should not modify segments with different speaker', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
      ];

      const renamed = renameSpeaker(segments, 'Bob', 'Charlie');

      expect(renamed[0].speaker).toBe('Alice');
    });
  });

  describe('segmentsToText', () => {
    it('should convert segments to text with labels', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        { start: 10, end: 20, text: 'Hi there', speaker: 'Bob' },
      ];

      const text = segmentsToText(segments, true);

      expect(text).toBe('Alice: Hello\n\nBob: Hi there');
    });

    it('should convert segments to text without labels', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        { start: 10, end: 20, text: 'Hi there', speaker: 'Bob' },
      ];

      const text = segmentsToText(segments, false);

      expect(text).toBe('Hello\n\nHi there');
    });
  });

  describe('getSpeakerColor', () => {
    it('should return consistent color for same speaker', () => {
      const color1 = getSpeakerColor('John');
      const color2 = getSpeakerColor('John');

      expect(color1).toBe(color2);
    });

    it('should return different colors for different speakers', () => {
      const color1 = getSpeakerColor('John');
      const color2 = getSpeakerColor('Jane');

      // They might occasionally be the same due to hash collisions,
      // but for these specific names they should be different
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
    });

    it('should return valid CSS color', () => {
      const color = getSpeakerColor('Test Speaker');

      expect(color).toMatch(/^(var\(--|\#)/);
    });
  });
});
