/// Returns general templates: (name, description, prompt, is_default)
pub fn get_templates() -> Vec<(&'static str, &'static str, &'static str, bool)> {
    vec![
        (
            "Meeting Summary",
            "Standard meeting notes with action items",
            r#"Generate a concise meeting summary.

**Summary:**
2-3 sentence overview of the meeting purpose and outcome.

**Attendees:**
List participants if mentioned.

**Key Discussion Points:**
- Point 1
- Point 2
- Point 3
[Continue as needed]

**Decisions Made:**
- Decision 1
- Decision 2
[List any decisions reached]

**Action Items:**
- [ ] [Task description] — [Owner if mentioned] — [Due date if mentioned]
- [ ] [Task description] — [Owner if mentioned]
[Continue for all action items]

**Open Questions:**
List any unresolved questions or topics deferred to future discussion.

**Next Meeting:**
Topic, timing, and attendees if discussed.

Transcript:
{transcript}"#,
            true,
        ),
        (
            "Quick Summary",
            "Brief bullet-point summary",
            r#"Generate a brief summary of this recording.

**Main Topic:**
One sentence describing what this recording is about.

**Key Points:**
- [Key point 1]
- [Key point 2]
- [Key point 3]
- [Key point 4]
- [Key point 5]

**Notable Quotes:**
Include 1-2 important verbatim quotes if relevant.

**Action Items:**
- [ ] [Any tasks or follow-ups mentioned]

Keep the summary concise and scannable.

Transcript:
{transcript}"#,
            false,
        ),
        (
            "Detailed Notes",
            "Comprehensive chronological notes",
            r#"Generate detailed notes from this recording.

**Overview:**
Brief description of the recording content and context.

**Detailed Notes:**

[Timestamp] **Topic/Section:**
- Detail 1
- Detail 2
- Relevant quotes or specifics

[Continue chronologically through the recording]

**Summary of Key Takeaways:**
1. [Takeaway 1]
2. [Takeaway 2]
3. [Takeaway 3]

**Questions/Follow-ups:**
- [Any questions raised or follow-up items]

Transcript:
{transcript}"#,
            false,
        ),
    ]
}
