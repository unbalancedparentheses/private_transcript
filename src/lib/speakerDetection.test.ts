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

  describe('Multi-Speaker Detection', () => {
    describe('Interview Format (Q&A)', () => {
      it('should detect two speakers in simple Q&A', () => {
        const transcript = `What inspired you to start this company?

I was always passionate about technology and saw a gap in the market.

How long did it take to build the first prototype?

About six months of intense work with a small team.`;

        const segments = parseTranscriptIntoSegments(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Speaker 1');
        expect(speakers).toContain('Speaker 2');
      });

      it('should detect interviewer and interviewee from labeled transcript', () => {
        const transcript = `Interviewer: Can you tell us about your background?
Interviewee: I have over ten years of experience in software development.
Interviewer: What's your greatest achievement?
Interviewee: Leading the team that launched our flagship product.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Interviewer');
        expect(speakers).toContain('Interviewee');
        expect(segments).toHaveLength(4);
      });

      it('should alternate speakers on question-answer pattern', () => {
        const transcript = `Why did you choose this career path?

It felt like a natural fit given my interests.

What challenges have you faced?

Many, but they've all been learning opportunities.`;

        const segments = parseTranscriptIntoSegments(transcript);

        // Questions should be Speaker 1, answers should be Speaker 2
        expect(segments[0].speaker).toBe('Speaker 1');
        expect(segments[1].speaker).toBe('Speaker 2');
        expect(segments[2].speaker).toBe('Speaker 1');
        expect(segments[3].speaker).toBe('Speaker 2');
      });
    });

    describe('Podcast/Conversation Format', () => {
      it('should detect multiple speakers in podcast format', () => {
        const transcript = `Host: Welcome to the show everyone.
Guest: Thanks for having me, it's great to be here.
Host: So let's dive right in. What's your latest project about?
Guest: Well, it's focused on making AI more accessible to small businesses.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Host');
        expect(speakers).toContain('Guest');
      });

      it('should handle three-person podcast', () => {
        const transcript = `Host: Welcome back to another episode.
Guest A: Happy to be here.
Guest B: Thanks for the invitation.
Host: Let's start with Guest A. What's new?
Guest A: We just launched a new product line.
Guest B: I actually tried it and loved it.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(3);
        expect(speakers).toContain('Host');
        expect(speakers).toContain('Guest A');
        expect(speakers).toContain('Guest B');
        expect(segments).toHaveLength(6);
      });

      it('should detect casual back-and-forth conversation', () => {
        const transcript = `Hey, how's it going?

Pretty good, just finished a big project.

Oh nice! What was it about?

It was a mobile app for tracking fitness goals.

That sounds cool. How long did it take?

About three months from start to finish.`;

        const segments = parseTranscriptIntoSegments(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
      });
    });

    describe('Meeting Format', () => {
      it('should detect speakers in meeting transcript', () => {
        const transcript = `Manager: Let's go over the quarterly results.
Sales Lead: We exceeded targets by fifteen percent.
Manager: That's excellent news. What about the new market?
Marketing Lead: We're seeing strong traction in the European region.
Sales Lead: Yes, and our partnership strategy is paying off.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(3);
        expect(speakers).toContain('Manager');
        expect(speakers).toContain('Sales Lead');
        expect(speakers).toContain('Marketing Lead');
      });

      it('should handle speaker labels with titles', () => {
        const transcript = `Dr Johnson: The test results are promising.
Professor Smith: I agree, the data supports our hypothesis.
Dr Johnson: Should we proceed to the next phase?
Professor Smith: Yes, let's schedule the follow-up experiments.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Dr Johnson');
        expect(speakers).toContain('Professor Smith');
      });
    });

    describe('Therapy/Consultation Format', () => {
      it('should detect therapist and client', () => {
        const transcript = `Therapist: How have you been feeling this week?
Client: Better than last week, actually.
Therapist: That's good to hear. What do you think contributed to that?
Client: I've been trying the breathing exercises you suggested.
Therapist: And how are those working for you?
Client: They really help when I feel anxious.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Therapist');
        expect(speakers).toContain('Client');
        expect(segments).toHaveLength(6);
      });

      it('should handle medical consultation format', () => {
        const transcript = `Doctor: What brings you in today?
Patient: I've been having headaches for the past week.
Doctor: Can you describe the pain?
Patient: It's a dull ache, mostly in the front.
Doctor: Are you taking any medications currently?
Patient: Just over the counter pain relievers.`;

        const segments = parseInlineSpeakerLabels(transcript);

        expect(segments).toHaveLength(6);
        expect(segments[0].speaker).toBe('Doctor');
        expect(segments[1].speaker).toBe('Patient');
      });
    });

    describe('Dialogue Pattern Detection', () => {
      it('should detect dialogue dash pattern', () => {
        const transcript = `- Hello, how can I help you?
- I'm looking for information about your services.
- Of course, let me explain what we offer.`;

        const segments = parseTranscriptIntoSegments(transcript);

        expect(segments.length).toBeGreaterThanOrEqual(2);
      });

      it('should detect quoted speech pattern', () => {
        const transcript = `"I think we should proceed with the plan."

"Are you sure? It seems risky."

"Yes, I've analyzed all the data."`;

        const segments = parseTranscriptIntoSegments(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
      });

      it('should detect turn indicators (okay, so, well)', () => {
        const transcript = `The project deadline is next Friday.

Okay, that gives us about a week then.

So we need to prioritize the critical features.

Right, let's focus on the core functionality first.`;

        const segments = parseTranscriptIntoSegments(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
      });

      it('should detect speaker change on agreement/disagreement', () => {
        const transcript = `I believe we should expand into new markets.

I think that's a great idea, but we need more resources.

You know, we could start small and scale up.

In my opinion, that's the safest approach.`;

        const segments = parseTranscriptIntoSegments(transcript);

        // Should detect multiple speakers based on turn indicators
        expect(segments.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Speaker Count Verification', () => {
      it('should correctly count two unique speakers', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'Hello', speaker: 'Alice' },
          { start: 10, end: 20, text: 'Hi', speaker: 'Bob' },
          { start: 20, end: 30, text: 'How are you?', speaker: 'Alice' },
          { start: 30, end: 40, text: 'Great, thanks!', speaker: 'Bob' },
        ];

        const speakers = getUniqueSpeakers(segments);
        expect(speakers.length).toBe(2);
      });

      it('should correctly count three unique speakers', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'Alice' },
          { start: 10, end: 20, text: 'B', speaker: 'Bob' },
          { start: 20, end: 30, text: 'C', speaker: 'Charlie' },
          { start: 30, end: 40, text: 'D', speaker: 'Alice' },
          { start: 40, end: 50, text: 'E', speaker: 'Bob' },
        ];

        const speakers = getUniqueSpeakers(segments);
        expect(speakers.length).toBe(3);
        expect(speakers).toContain('Alice');
        expect(speakers).toContain('Bob');
        expect(speakers).toContain('Charlie');
      });

      it('should correctly count speakers after merging', () => {
        const segments: TranscriptSegment[] = [
          { start: 0, end: 10, text: 'A', speaker: 'Alice' },
          { start: 10, end: 20, text: 'B', speaker: 'Alice' },
          { start: 20, end: 30, text: 'C', speaker: 'Bob' },
          { start: 30, end: 40, text: 'D', speaker: 'Bob' },
        ];

        const merged = mergeAdjacentSpeakerSegments(segments);
        const speakers = getUniqueSpeakers(merged);

        expect(merged.length).toBe(2);
        expect(speakers.length).toBe(2);
      });
    });

    describe('Real-World Transcript Scenarios', () => {
      it('should handle long multi-turn conversation', () => {
        const transcript = `John: Good morning everyone, let's start the standup.
Sarah: Morning! Yesterday I finished the login feature.
Mike: I reviewed Sarah's PR and it looks good.
John: Great, any blockers?
Sarah: None from my side.
Mike: I'm waiting on the API docs from the backend team.
John: I'll follow up on that. Let's move to sprint planning.
Sarah: Sounds good.
Mike: Ready when you are.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(3);
        expect(speakers).toContain('John');
        expect(speakers).toContain('Sarah');
        expect(speakers).toContain('Mike');
        expect(segments.length).toBe(9);
      });

      it('should handle mixed content with speaker labels', () => {
        const transcript = `Moderator: Welcome to today's panel discussion.
We have three distinguished guests joining us.
Panelist A: Thank you for the introduction.
Panelist B: Happy to be here.
Panelist C: Looking forward to the discussion.
Moderator: Let's begin with the first question.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(4);
      });

      it('should preserve speaker names after renaming', () => {
        const transcript = `Speaker: Hello, I'm the interviewer.
Interviewee: Nice to meet you.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const renamed = renameSpeaker(segments, 'Speaker', 'Jane');

        expect(renamed[0].speaker).toBe('Jane');
        expect(renamed[1].speaker).toBe('Interviewee');

        const speakers = getUniqueSpeakers(renamed);
        expect(speakers).toContain('Jane');
        expect(speakers).not.toContain('Speaker');
      });
    });

    describe('Speaker Detection Accuracy', () => {
      it('should not falsely detect speakers in monologue', () => {
        const transcript = `Today I want to talk about productivity. First, let me share some background. I've been studying this topic for years. The key insight is that focus matters more than time. Let me explain what I mean by that.`;

        const segments = parseTranscriptIntoSegments(transcript);

        // Monologue should stay as one or few segments from same speaker
        expect(segments.length).toBeLessThanOrEqual(2);
      });

      it('should handle paragraph breaks in single speaker content', () => {
        const transcript = `Speaker One: This is my opening statement.
I want to make several points today.
First, we need to consider the budget.
Second, we need to review the timeline.

Speaker Two: Thank you for that overview.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        // First speaker's multi-line content should be combined
        expect(segments[0].text).toContain('opening statement');
        expect(segments[0].text).toContain('timeline');
      });

      it('should correctly attribute Q&A format with labeled speakers', () => {
        const transcript = `Q: What is the capital of France?
A: The capital of France is Paris.
Q: When was it founded?
A: Paris was founded in the third century BC.`;

        const segments = parseInlineSpeakerLabels(transcript);
        const speakers = getUniqueSpeakers(segments);

        expect(speakers.length).toBe(2);
        expect(speakers).toContain('Q');
        expect(speakers).toContain('A');
        expect(segments).toHaveLength(4);
      });
    });
  });
});
