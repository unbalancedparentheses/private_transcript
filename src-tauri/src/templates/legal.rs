/// Returns legal templates: (name, description, prompt, is_default)
pub fn get_templates() -> Vec<(&'static str, &'static str, &'static str, bool)> {
    vec![
        (
            "Deposition Summary",
            "Summarize key testimony from depositions",
            r#"Generate a deposition summary from this transcript.

**Witness Information:**
- Identify the deponent/witness
- Note the date and context if mentioned

**Key Testimony:**
List the most important statements with timestamps. Focus on:
- Facts relevant to the case
- Admissions or statements against interest
- Key dates, events, or sequences

**Contradictions/Issues:**
Flag any inconsistencies, evasive answers, or statements that may conflict with documents or prior testimony.

**Credibility Notes:**
Observations about the witness's demeanor, certainty of answers, or areas of apparent discomfort.

**Follow-up Needed:**
Suggest areas requiring additional investigation or questioning.

Use precise legal language and include timestamps for key statements.

Transcript:
{transcript}"#,
            true,
        ),
        (
            "Client Meeting",
            "Document client meetings and instructions",
            r#"Generate a client meeting summary.

**Meeting Purpose:**
State the reason for the meeting and attendees.

**Key Facts Discussed:**
Summarize important factual information shared by the client or discussed during the meeting.

**Client Instructions:**
Document any instructions, preferences, or decisions expressed by the client regarding their case.

**Legal Issues Identified:**
Note relevant legal issues, concerns, or strategic considerations discussed.

**Action Items:**
List next steps with responsible party and deadlines where applicable.

**Privileged Notes:**
[Mark any particularly sensitive strategy discussions or attorney impressions]

Transcript:
{transcript}"#,
            false,
        ),
        (
            "Witness Interview",
            "Document witness interview notes",
            r#"Generate a witness interview summary.

**Witness:**
- Name/identifier
- Relationship to case
- Date and location of interview

**Summary of Account:**
Provide a narrative summary of what the witness reported.

**Key Statements:**
List specific statements that may be relevant as evidence, with timestamps.

**Documents/Evidence Referenced:**
Note any documents, photos, or physical evidence the witness mentioned or identified.

**Credibility Assessment:**
Note any factors affecting witness credibility (bias, inconsistencies, demeanor).

**Follow-up Questions:**
Areas that need clarification or further investigation.

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
    fn test_deposition_summary_is_default() {
        let templates = get_templates();
        let depo = templates.iter().find(|t| t.0 == "Deposition Summary");
        assert!(depo.is_some());
        assert!(depo.unwrap().3); // is_default = true
    }

    #[test]
    fn test_client_meeting_exists() {
        let templates = get_templates();
        let meeting = templates.iter().find(|t| t.0 == "Client Meeting");
        assert!(meeting.is_some());
        assert!(!meeting.unwrap().3); // is_default = false
    }

    #[test]
    fn test_witness_interview_exists() {
        let templates = get_templates();
        let witness = templates.iter().find(|t| t.0 == "Witness Interview");
        assert!(witness.is_some());
        assert!(!witness.unwrap().3); // is_default = false
    }

    #[test]
    fn test_all_templates_have_transcript_placeholder() {
        let templates = get_templates();
        for (name, _description, prompt, _is_default) in templates {
            assert!(
                prompt.contains("{transcript}"),
                "Template '{}' should contain {{transcript}} placeholder",
                name
            );
        }
    }

    #[test]
    fn test_exactly_one_default_template() {
        let templates = get_templates();
        let default_count = templates.iter().filter(|t| t.3).count();
        assert_eq!(default_count, 1, "Should have exactly one default template");
    }

    #[test]
    fn test_all_templates_non_empty() {
        let templates = get_templates();
        for (name, description, prompt, _) in templates {
            assert!(!name.is_empty());
            assert!(!description.is_empty());
            assert!(!prompt.is_empty());
        }
    }
}
