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
