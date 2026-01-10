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
