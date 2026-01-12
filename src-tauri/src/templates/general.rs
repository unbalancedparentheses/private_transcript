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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_templates_returns_expected_count() {
        let templates = get_templates();
        assert_eq!(templates.len(), 3);
    }

    #[test]
    fn test_meeting_summary_is_default() {
        let templates = get_templates();
        let meeting_summary = templates.iter().find(|t| t.0 == "Meeting Summary");
        assert!(meeting_summary.is_some());
        assert!(meeting_summary.unwrap().3); // is_default = true
    }

    #[test]
    fn test_quick_summary_not_default() {
        let templates = get_templates();
        let quick_summary = templates.iter().find(|t| t.0 == "Quick Summary");
        assert!(quick_summary.is_some());
        assert!(!quick_summary.unwrap().3); // is_default = false
    }

    #[test]
    fn test_detailed_notes_not_default() {
        let templates = get_templates();
        let detailed = templates.iter().find(|t| t.0 == "Detailed Notes");
        assert!(detailed.is_some());
        assert!(!detailed.unwrap().3); // is_default = false
    }

    #[test]
    fn test_all_templates_have_valid_structure() {
        let templates = get_templates();
        for (name, description, prompt, _is_default) in templates {
            assert!(!name.is_empty(), "Template name should not be empty");
            assert!(!description.is_empty(), "Template description should not be empty");
            assert!(!prompt.is_empty(), "Template prompt should not be empty");
            assert!(prompt.contains("{transcript}"), "Template prompt should contain {{transcript}} placeholder");
        }
    }

    #[test]
    fn test_exactly_one_default_template() {
        let templates = get_templates();
        let default_count = templates.iter().filter(|t| t.3).count();
        assert_eq!(default_count, 1, "Should have exactly one default template");
    }
}
