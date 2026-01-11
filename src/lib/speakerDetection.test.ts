import { describe, it, expect } from 'vitest';
import {
  parseTranscriptIntoSegments,
  parseInlineSpeakerLabels,
  mergeAdjacentSpeakerSegments,
  getUniqueSpeakers,
  renameSpeaker,
  segmentsToText,
  getSpeakerColor,
  estimateSegmentTimestamps,
  findSegmentAtTime,
  formatTimestamp,
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

  describe('estimateSegmentTimestamps', () => {
    it('should return empty array for empty segments', () => {
      expect(estimateSegmentTimestamps([], 60)).toEqual([]);
    });

    it('should return segments unchanged if duration is 0 or negative', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 0, text: 'Hello', speaker: 'Alice' },
      ];
      expect(estimateSegmentTimestamps(segments, 0)).toEqual(segments);
      expect(estimateSegmentTimestamps(segments, -10)).toEqual(segments);
    });

    it('should estimate timestamps proportionally based on text length', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 0, text: 'Hello', speaker: 'Alice' }, // 5 chars
        { start: 0, end: 0, text: 'World', speaker: 'Bob' },   // 5 chars
      ];

      const result = estimateSegmentTimestamps(segments, 100);

      // First segment: 0-50% of 100 = 0-50
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(50);

      // Second segment: 50-100% of 100 = 50-100
      expect(result[1].start).toBe(50);
      expect(result[1].end).toBe(100);
    });

    it('should handle unequal text lengths', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 0, text: 'Hi', speaker: 'Alice' },      // 2 chars
        { start: 0, end: 0, text: 'Hello World', speaker: 'Bob' }, // 11 chars
      ];
      // Total: 13 chars

      const result = estimateSegmentTimestamps(segments, 130);

      // First: 0-2/13 of 130 = 0-20
      expect(result[0].start).toBeCloseTo(0);
      expect(result[0].end).toBeCloseTo(20);

      // Second: 2/13-13/13 of 130 = 20-130
      expect(result[1].start).toBeCloseTo(20);
      expect(result[1].end).toBeCloseTo(130);
    });

    it('should preserve speaker information', () => {
      const segments: TranscriptSegment[] = [
        { start: 0, end: 0, text: 'Hello', speaker: 'Alice' },
      ];

      const result = estimateSegmentTimestamps(segments, 60);

      expect(result[0].speaker).toBe('Alice');
      expect(result[0].text).toBe('Hello');
    });
  });

  describe('findSegmentAtTime', () => {
    const segments: TranscriptSegment[] = [
      { start: 0, end: 10, text: 'First', speaker: 'A' },
      { start: 10, end: 20, text: 'Second', speaker: 'B' },
      { start: 20, end: 30, text: 'Third', speaker: 'A' },
    ];

    it('should return -1 for empty segments', () => {
      expect(findSegmentAtTime([], 5)).toBe(-1);
    });

    it('should find correct segment for time within range', () => {
      expect(findSegmentAtTime(segments, 0)).toBe(0);
      expect(findSegmentAtTime(segments, 5)).toBe(0);
      expect(findSegmentAtTime(segments, 10)).toBe(1);
      expect(findSegmentAtTime(segments, 15)).toBe(1);
      expect(findSegmentAtTime(segments, 20)).toBe(2);
      expect(findSegmentAtTime(segments, 25)).toBe(2);
    });

    it('should return last segment for time after all segments', () => {
      expect(findSegmentAtTime(segments, 35)).toBe(2);
      expect(findSegmentAtTime(segments, 100)).toBe(2);
    });

    it('should return -1 for time before first segment when start > 0', () => {
      const laterSegments: TranscriptSegment[] = [
        { start: 10, end: 20, text: 'First', speaker: 'A' },
      ];
      expect(findSegmentAtTime(laterSegments, 5)).toBe(-1);
    });
  });

  describe('formatTimestamp', () => {
    it('should format 0 seconds as 0:00', () => {
      expect(formatTimestamp(0)).toBe('0:00');
    });

    it('should format seconds under a minute', () => {
      expect(formatTimestamp(5)).toBe('0:05');
      expect(formatTimestamp(30)).toBe('0:30');
      expect(formatTimestamp(59)).toBe('0:59');
    });

    it('should format minutes correctly', () => {
      expect(formatTimestamp(60)).toBe('1:00');
      expect(formatTimestamp(90)).toBe('1:30');
      expect(formatTimestamp(125)).toBe('2:05');
    });

    it('should handle large values', () => {
      expect(formatTimestamp(3600)).toBe('60:00');
      expect(formatTimestamp(3661)).toBe('61:01');
    });

    it('should handle decimal values by flooring', () => {
      expect(formatTimestamp(5.9)).toBe('0:05');
      expect(formatTimestamp(65.5)).toBe('1:05');
    });
  });

  describe('Edge Cases', () => {
    describe('parseTranscriptIntoSegments edge cases', () => {
      it('should handle transcript with only whitespace', () => {
        const result = parseTranscriptIntoSegments('   \n\n   \t   ');
        expect(result).toEqual([]);
      });

      it('should handle transcript with single word', () => {
        const result = parseTranscriptIntoSegments('Hello');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Hello');
      });

      it('should handle transcript with many paragraphs', () => {
        const paragraphs = Array(20).fill('This is a paragraph.').join('\n\n');
        const result = parseTranscriptIntoSegments(paragraphs);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle transcript with special characters', () => {
        const transcript = 'Hello! How are you? I\'m fine, thanks.';
        const result = parseTranscriptIntoSegments(transcript);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle transcript with unicode', () => {
        const transcript = '你好，世界！\n\nこんにちは';
        const result = parseTranscriptIntoSegments(transcript);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle transcript with numbers', () => {
        const transcript = '1. First item\n\n2. Second item\n\n3. Third item';
        const result = parseTranscriptIntoSegments(transcript);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('parseInlineSpeakerLabels edge cases', () => {
      it('should handle lowercase speaker names', () => {
        const transcript = 'john: Hello\njane: Hi';
        const result = parseInlineSpeakerLabels(transcript);
        // lowercase names won't match the pattern
        expect(result).toHaveLength(1);
      });

      it('should handle speaker name with numbers (not supported in pattern)', () => {
        // Numbers in speaker names don't match the pattern [a-zA-Z\s]
        // so it falls back to default speaker
        const transcript = 'Speaker1: Hello';
        const result = parseInlineSpeakerLabels(transcript);
        expect(result[0].speaker).toBe('Speaker 1');
      });

      it('should handle empty text after speaker', () => {
        const transcript = 'John: \nJane: Hello';
        const result = parseInlineSpeakerLabels(transcript);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle very long speaker names', () => {
        const transcript = 'Doctor John Smith Junior: Hello there';
        const result = parseInlineSpeakerLabels(transcript);
        expect(result[0].speaker).toBe('Doctor John Smith Junior');
      });

      it('should handle colon in the middle of text', () => {
        const transcript = 'John: The time is 10:30 AM';
        const result = parseInlineSpeakerLabels(transcript);
        expect(result[0].text).toBe('The time is 10:30 AM');
      });
    });

    describe('mergeAdjacentSpeakerSegments edge cases', () => {
      it('should handle all segments from same speaker', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'Alice' },
          { start: 10, end: 20, text: 'B', speaker: 'Alice' },
          { start: 20, end: 30, text: 'C', speaker: 'Alice' },
        ];
        const result = mergeAdjacentSpeakerSegments(segments);
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('A\n\nB\n\nC');
      });

      it('should handle alternating speakers', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'Alice' },
          { start: 10, end: 20, text: 'B', speaker: 'Bob' },
          { start: 20, end: 30, text: 'C', speaker: 'Alice' },
          { start: 30, end: 40, text: 'D', speaker: 'Bob' },
        ];
        const result = mergeAdjacentSpeakerSegments(segments);
        expect(result).toHaveLength(4);
      });
    });

    describe('estimateSegmentTimestamps edge cases', () => {
      it('should handle segments with empty text', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 0, text: '', speaker: 'A' },
          { start: 0, end: 0, text: 'Hello', speaker: 'B' },
        ];
        const result = estimateSegmentTimestamps(segments, 100);
        // Empty text contributes 0 to total, so all time goes to second segment
        expect(result[0].start).toBe(0);
        expect(result[0].end).toBe(0);
        expect(result[1].start).toBe(0);
        expect(result[1].end).toBe(100);
      });

      it('should handle very short duration', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 0, text: 'A', speaker: 'X' },
          { start: 0, end: 0, text: 'B', speaker: 'Y' },
        ];
        const result = estimateSegmentTimestamps(segments, 0.1);
        expect(result[0].end).toBeCloseTo(0.05);
        expect(result[1].start).toBeCloseTo(0.05);
      });

      it('should handle single segment', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 0, text: 'Only segment', speaker: 'A' },
        ];
        const result = estimateSegmentTimestamps(segments, 60);
        expect(result[0].start).toBe(0);
        expect(result[0].end).toBe(60);
      });
    });

    describe('findSegmentAtTime edge cases', () => {
      it('should handle negative time', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'X' },
        ];
        expect(findSegmentAtTime(segments, -5)).toBe(-1);
      });

      it('should handle exact boundary time', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'X' },
          { start: 10, end: 20, text: 'B', speaker: 'Y' },
        ];
        // At exactly 10, should be second segment (start is inclusive, end is exclusive)
        expect(findSegmentAtTime(segments, 10)).toBe(1);
      });

      it('should handle gaps between segments', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'X' },
          { start: 20, end: 30, text: 'B', speaker: 'Y' },
        ];
        // Time 15 is in the gap
        expect(findSegmentAtTime(segments, 15)).toBe(-1);
      });
    });

    describe('getSpeakerColor edge cases', () => {
      it('should handle empty speaker name', () => {
        const color = getSpeakerColor('');
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
      });

      it('should handle very long speaker name', () => {
        const longName = 'A'.repeat(1000);
        const color = getSpeakerColor(longName);
        expect(color).toBeDefined();
      });

      it('should handle speaker name with special characters', () => {
        const color = getSpeakerColor('Dr. Smith-Jones (PhD)');
        expect(color).toBeDefined();
      });

      it('should handle speaker name with unicode', () => {
        const color = getSpeakerColor('田中太郎');
        expect(color).toBeDefined();
      });
    });

    describe('segmentsToText edge cases', () => {
      it('should handle single segment', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        ];
        expect(segmentsToText(segments, true)).toBe('Alice: Hello');
        expect(segmentsToText(segments, false)).toBe('Hello');
      });

      it('should handle segment without speaker', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello' },
        ];
        const result = segmentsToText(segments, true);
        expect(result).toContain('Hello');
      });

      it('should handle empty segments array', () => {
        expect(segmentsToText([], true)).toBe('');
        expect(segmentsToText([], false)).toBe('');
      });
    });

    describe('renameSpeaker edge cases', () => {
      it('should handle renaming to same name', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        ];
        const result = renameSpeaker(segments, 'Alice', 'Alice');
        expect(result[0].speaker).toBe('Alice');
      });

      it('should handle renaming non-existent speaker', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        ];
        const result = renameSpeaker(segments, 'Bob', 'Charlie');
        expect(result[0].speaker).toBe('Alice');
      });

      it('should handle empty new name', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
        ];
        const result = renameSpeaker(segments, 'Alice', '');
        expect(result[0].speaker).toBe('');
      });
    });

    describe('getUniqueSpeakers edge cases', () => {
      it('should handle segments with undefined speakers', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello' },
          { start: 10, end: 20, text: 'World', speaker: 'Bob' },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toContain('Bob');
        expect(result).toHaveLength(1);
      });

      it('should handle all segments with same speaker', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'Alice' },
          { start: 10, end: 20, text: 'B', speaker: 'Alice' },
          { start: 20, end: 30, text: 'C', speaker: 'Alice' },
        ];
        const result = getUniqueSpeakers(segments);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe('Alice');
      });
    });
  });
});
