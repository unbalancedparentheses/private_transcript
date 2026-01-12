/// Returns therapy templates: (name, description, prompt, is_default)
pub fn get_templates() -> Vec<(&'static str, &'static str, &'static str, bool)> {
    vec![
        (
            "SOAP Note",
            "Standard SOAP format for therapy sessions",
            r#"Generate a SOAP note from this therapy session transcript.

**Subjective:** Summarize what the client reported about their symptoms, feelings, thoughts, and concerns. Include direct quotes where relevant.

**Objective:** Note observable behaviors, affect, appearance, speech patterns, and mental status observations during the session.

**Assessment:** Provide clinical interpretation of the session, including progress toward treatment goals, diagnostic impressions, and therapeutic patterns identified.

**Plan:** Outline next steps including treatment interventions, homework assignments, referrals, and plans for the next session.

Keep each section concise (2-4 sentences). Use professional clinical language.

Transcript:
{transcript}"#,
            true,
        ),
        (
            "DAP Note",
            "Data-Assessment-Plan format",
            r#"Generate a DAP note from this therapy session transcript.

**Data:** Document objective and subjective information from the session including:
- Client statements and reported experiences
- Observable behaviors and affect
- Topics discussed and themes explored

**Assessment:** Provide your clinical assessment including:
- Client's current functioning and presentation
- Progress toward treatment goals
- Therapeutic themes and patterns
- Clinical impressions

**Plan:** Detail the treatment plan including:
- Focus areas for next session
- Interventions to continue or modify
- Homework or between-session tasks
- Any referrals or coordination needed

Keep the note concise and clinically appropriate.

Transcript:
{transcript}"#,
            false,
        ),
        (
            "BIRP Note",
            "Behavior-Intervention-Response-Plan format",
            r#"Generate a BIRP note from this therapy session transcript.

**Behavior:** Describe the client's presenting behaviors, statements, and affect during the session.

**Intervention:** Document the therapeutic interventions used during the session (e.g., CBT techniques, exploration, reflection, psychoeducation).

**Response:** Note how the client responded to the interventions, including any insights, resistance, or progress observed.

**Plan:** Outline the plan for continued treatment and next session focus.

Use professional clinical language.

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
    fn test_soap_note_is_default() {
        let templates = get_templates();
        let soap = templates.iter().find(|t| t.0 == "SOAP Note");
        assert!(soap.is_some());
        assert!(soap.unwrap().3); // is_default = true
    }

    #[test]
    fn test_dap_note_exists() {
        let templates = get_templates();
        let dap = templates.iter().find(|t| t.0 == "DAP Note");
        assert!(dap.is_some());
        assert!(!dap.unwrap().3); // is_default = false
    }

    #[test]
    fn test_birp_note_exists() {
        let templates = get_templates();
        let birp = templates.iter().find(|t| t.0 == "BIRP Note");
        assert!(birp.is_some());
        assert!(!birp.unwrap().3); // is_default = false
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
