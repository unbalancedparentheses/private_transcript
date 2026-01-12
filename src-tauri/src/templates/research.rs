/// Returns research templates: (name, description, prompt, is_default)
pub fn get_templates() -> Vec<(&'static str, &'static str, &'static str, bool)> {
    vec![
        (
            "Interview Summary",
            "Summarize qualitative research interviews",
            r#"Generate a qualitative research interview summary.

**Participant:** [Use anonymized participant ID only]

**Interview Context:**
Brief description of the interview setting, duration, and rapport.

**Key Themes:**
Identify the main themes that emerged from this interview:

- **Theme 1:** [Name]
  - Description with supporting quotes
  - Relevant timestamps

- **Theme 2:** [Name]
  - Description with supporting quotes
  - Relevant timestamps

- **Theme 3:** [Name]
  - Description with supporting quotes
  - Relevant timestamps

**Notable Quotes:**
List 3-5 significant verbatim quotes that capture important insights, with timestamps.

**Emerging Patterns:**
Note any patterns connecting to previous interviews or research questions.

**Researcher Memo:**
Reflexive notes on the interview process, surprising findings, or methodological observations.

**Questions for Follow-up:**
Topics or areas that warrant deeper exploration.

Transcript:
{transcript}"#,
            true,
        ),
        (
            "Thematic Analysis",
            "Extract themes and codes from interviews",
            r#"Perform an initial thematic analysis of this interview transcript.

**Participant ID:** [Anonymized]

**Initial Codes:**
List initial codes identified in the data with brief descriptions and example quotes:

1. [Code name] - [Brief description]
   - Example: "[quote]" (timestamp)

2. [Code name] - [Brief description]
   - Example: "[quote]" (timestamp)

[Continue for all identified codes]

**Potential Themes:**
Group related codes into potential broader themes:

- **Theme:** [Name]
  - Related codes: [list]
  - Description

**Data Characteristics:**
- Frequency of topics
- Emotional intensity of discussions
- Areas of agreement/disagreement with prior participants

**Analytical Memos:**
Notes on patterns, surprises, contradictions, or theoretical connections.

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
        assert_eq!(templates.len(), 2);
    }

    #[test]
    fn test_interview_summary_is_default() {
        let templates = get_templates();
        let interview = templates.iter().find(|t| t.0 == "Interview Summary");
        assert!(interview.is_some());
        assert!(interview.unwrap().3); // is_default = true
    }

    #[test]
    fn test_thematic_analysis_exists() {
        let templates = get_templates();
        let thematic = templates.iter().find(|t| t.0 == "Thematic Analysis");
        assert!(thematic.is_some());
        assert!(!thematic.unwrap().3); // is_default = false
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
