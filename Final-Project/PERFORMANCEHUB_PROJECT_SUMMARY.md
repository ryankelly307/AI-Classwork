# PerformanceHub — Project Summary for Claude Code

## What This Is
PerformanceHub is a React-based performance management tool built as a class final project. It helps functional managers collect employee feedback, assess performance against priorities, generate performance reviews, and quality-check the outputs. The app runs as a single `.jsx` artifact file using Anthropic's Claude API for AI-powered features.

## Tech Stack
- **Frontend**: Single-file React component (`performance-manager.jsx`)
- **Styling**: Inline styles with a dark royal blue theme (CSS vars in a `COLORS` object)
- **Fonts**: DM Serif Display + DM Sans via Google Fonts
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) called directly from the frontend — no backend
- **Document parsing**: mammoth.js for DOCX text extraction (the API doesn't accept DOCX natively)
- **State**: React useState/useEffect with localStorage persistence via `loadData()`/`saveData()`
- **No build system**: This is a standalone `.jsx` file rendered in Claude's artifact environment

## Architecture & Key Patterns

### Shared Helpers (top of file)
- `extractDocxText(dataUrl)` — Converts base64 DOCX to plain text via mammoth
- `isDocxFile(file)` / `isDocxName(name)` — DOCX detection helpers
- `fetchWithRetry(url, options, maxRetries, onRetry)` — Handles 429 rate limits with exponential backoff, used by all API calls
- `safeParseJSON(text)` — Robust JSON parser that handles non-JSON AI responses by searching for array/object patterns in the text
- `loadData()` / `saveData(data)` — localStorage persistence for feedback, employees, assessments

### Data Shape (localStorage)
```json
{
  "employees": [{ "name": "string", "id": number }],
  "feedback": [{
    "id": number, "date": "ISO string",
    "employeeName": "string", "reviewerName": "string",
    "relationship": "peer" | "manager" | "direct" | "self",
    "overallFeedback": "string", "strengths": "string", "improvements": "string",
    "ratingWhat": 1-3, "ratingHow": 1-3,
    "attachments": [{ "name", "type", "size", "isAudio" }],
    "source": "batch" (optional)
  }],
  "assessments": [{
    "id": number, "date": "ISO string",
    "employee": "string", "jobTitle": "string",
    "priorities": [{ "text": "string", "ratingWhat": 1-3, "ratingHow": 1-3 }],
    "avgWhat": number, "avgHow": number, "overallScore": number
  }],
  "priorities": []
}
```

### Shared State (lifted to main `PerformanceManager` component)
- `generatedReviews` — `{ [employeeName]: { review: string, guide: string } }` — Stores generated outputs per employee, shared between Generate and Quality Check tabs
- `sharedCompanyValues` — Typed company values text, shared between Generate and Quality Check
- `sharedExtractedValues` — RAG-extracted company values text, shared between Generate and Quality Check

### Rating Scales
All ratings use a consistent **1–3 scale** across the entire app:
- 1 = Below expectations
- 2 = Meets expectations  
- 3 = Exceeds expectations

Two dimensions everywhere:
- **What Was Accomplished** — Results, deliverables, goal attainment
- **How It Was Accomplished** — Behaviors, collaboration, values alignment

## The Four Tabs

### Tab 1: Collect Feedback
**Purpose**: Gather 360° feedback from multiple reviewers per employee.

**Key UX decisions**:
- **Streamlined multi-feedback flow**: Select an employee once (via quick-select buttons or typing a new name), then the form stays pinned to that employee. "Submit & Add Another" clears only the reviewer-specific fields and auto-focuses the reviewer name input for rapid entry. Employee selection persists.
- **Field order**: Overall Feedback → Key Strengths → Areas for Improvement (overall feedback was moved above strengths)
- **Summarized feedback cards**: Submitted feedback shows a truncated summary (180 chars max) with indicator tags rather than full text dump
- **Batch Import**: Upload a document/audio containing feedback for multiple employees → AI extracts and splits by employee → Preview → Import all at once. Tagged with "BATCH" badge.
- **File support**: PDF, Word (.docx via mammoth extraction), TXT, JSON, and audio (MP3, WAV, M4A, WEBM, OGG) — up to 10MB
- **Audio files**: Shown with 🎤 icon, sent to Claude API for transcription

### Tab 2: Assess Performance
**Purpose**: Define priorities per employee and rate each on the 1–3 scales.

**Key UX decisions**:
- **Two ways to define priorities**: Toggle between "Paste/Type" (textarea for OKRs, goals, job descriptions) or "Upload Document" (file upload with AI extraction)
- **Priority extraction is strict**: The AI prompt explicitly instructs to extract ONLY priorities stated in the source material — no inventing or inferring. Vague priorities are preserved as-is for the Quality Check to flag.
- **Job Title field**: Provided to the AI for role-relevant extraction
- **Feedback insights per priority**: Each priority card shows a "📊 Related Feedback" panel with keyword-matched feedback snippets (or general feedback if no keywords match). Includes average What/How scores from reviewers and individual reviewer scores `[W:2 H:3]` inline.
- **Assessment Summary**: Shows average What and How scores across all rated priorities

### Tab 3: Generate
**Purpose**: Produce two AI-generated documents per employee.

**Two outputs** (tabbed display):
1. **📄 Employee Review** — Formal review written TO the employee in second person. Synthesizes feedback into original narrative (explicitly instructed not to repeat verbatim feedback). Covers both What and How dimensions. Aligned to company values.
2. **🔒 Manager Guide** — CONFIDENTIAL discussion prep for the manager. Includes conversation flow with time estimates, talking points, handling difficult topics, probing questions, follow-up actions.

**Company Values RAG**:
- Toggle between "Type Values" and "Upload Values Doc"
- Upload accepts employee handbooks, codes of conduct, culture guides, audio
- AI extracts structured values: core values, behavioral standards, leadership competencies, key phrases
- Extracted values shown in preview panel with copy/clear
- Supplemental text field available when using document mode
- Both typed and extracted values combine and are shared with Quality Check tab

**Key behavior**:
- Button text: "Generate Performance Review and Manager Guide"
- Prompt instructs to SYNTHESIZE, not repeat feedback
- Generated outputs stored in shared `generatedReviews` state keyed by employee name
- Company values stored in shared `sharedCompanyValues` / `sharedExtractedValues`
- Tone selector: constructive, direct, supportive, formal
- Local fallback functions (`buildLocalReview`, `buildLocalGuide`) if API fails

### Tab 4: HR Quality Check (LLM-as-a-Judge)
**Purpose**: Evaluate generated reviews for quality, completeness, and compliance.

**Auto-populated**: Select an employee → review, manager guide, and company values automatically load from the Generate tab's shared state. No pasting required. Shows confirmation badges with document sizes.

**Two evaluations in one API call**:

1. **Priority Alignment Check** — Does the review address each of the employee's defined priorities? Reports covered priorities (green tags), missing priorities (red tags), and specific findings with severity levels. Also flags vaguely defined priorities as quality issues.

2. **Values & Tone Compliance** — Does the language/tone align with company values? Reports values well-reflected, values gaps, ethical concerns with severity, and specific language flags with problematic phrases and suggested rewrites.

**Results display**:
- Overall verdict (Pass / Needs Revision / Fail) with 1–5 quality score bar
- Top 3 recommendations
- Detailed breakdowns for each evaluation
- Severity-coded findings (high/medium/low)
- Color-coded throughout (green=pass, orange=needs revision, red=fail)

## UI/Design Details
- **Theme**: Dark royal blue — `bg: "#0B0E1A"`, `surface: "#141829"`, `accent: "#4A6CF7"`
- **Header**: Gradient from `#1A237E` to `#1A2060`
- **Input fields**: White background (`#FFFFFF`) with black text (`#1A1A1A`) for readability against the dark theme. Exception: priority name inputs inside dark cards use `COLORS.text` (light) with transparent background.
- **Star ratings**: Custom `StarRating` component with `max` prop (set to 3 everywhere)
- **File attachments**: Drag-and-drop zones with dashed borders, file type tags, audio distinguished with 🎤 icon and warm color
- **Quality Check button**: Purple (`#7C3AED`) to distinguish from other actions

## Known Issues / Considerations
- `localStorage` is used for persistence but the artifact environment may not support it reliably — the app works without it via in-memory state
- DOCX files must be converted to text via mammoth before sending to the API (API only accepts PDF, images, and plain text natively)
- Large audio files may hit API limits or take a while to process
- The `safeParseJSON` helper handles cases where the AI returns conversational text instead of JSON (common with edge-case inputs)
- Rate limiting (429) is handled with retry logic but can still fail after 3 attempts during heavy usage
- All API calls use `claude-sonnet-4-20250514` model
