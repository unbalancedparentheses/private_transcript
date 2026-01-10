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
