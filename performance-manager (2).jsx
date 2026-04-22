import { useState, useEffect, useRef } from "react";
import * as mammoth from "mammoth";

// ─── DOCX Text Extraction Helper ───
async function extractDocxText(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
  return result.value;
}

function isDocxFile(file) {
  return file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || file.name?.toLowerCase().endsWith(".docx");
}

function isDocxName(name) {
  return name?.toLowerCase().endsWith(".docx") || name?.toLowerCase().endsWith(".doc");
}

// ─── API Fetch with Retry (handles 429 rate limits) ───
async function fetchWithRetry(url, options, maxRetries = 3, onRetry) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(2000 * Math.pow(2, attempt), 15000);
      const waitSec = Math.ceil(waitMs / 1000);
      if (onRetry) onRetry(`Rate limited — retrying in ${waitSec}s…`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`API error: ${response.status}`);
  }
  throw new Error("Max retries exceeded — please try again in a minute.");
}

// ─── Safe JSON Parser (handles non-JSON AI responses) ───
function safeParseJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  // Try parsing as-is first
  try { return JSON.parse(cleaned); } catch {}
  // Try to find JSON array in the response
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  // Try to find JSON object in the response
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  // Nothing worked — throw a helpful error
  const preview = cleaned.substring(0, 80);
  throw new Error(`AI did not return valid data. Response: "${preview}…" — Try rephrasing your input or adding more detail.`);
}

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
`;

const COLORS = {
  bg: "#0B0E1A",
  surface: "#141829",
  surfaceAlt: "#1C2137",
  border: "#2A3050",
  text: "#E8EAF0",
  textMuted: "#8B92A8",
  accent: "#4A6CF7",
  accentLight: "#1A2454",
  accentHover: "#3B5CE0",
  warm: "#E0944C",
  warmLight: "#2A2218",
  danger: "#E05555",
  dangerLight: "#2A1A1A",
  gold: "#D4A843",
  goldLight: "#2A2414",
};

const styles = {
  app: {
    fontFamily: "'DM Sans', sans-serif",
    background: COLORS.bg,
    minHeight: "100vh",
    color: COLORS.text,
  },
  header: {
    background: "linear-gradient(135deg, #1A237E 0%, #283593 50%, #1A2060 100%)",
    color: "#fff",
    padding: "28px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
  },
  logo: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 26,
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  nav: {
    display: "flex",
    gap: 4,
  },
  navBtn: (active) => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: active ? "rgba(255,255,255,0.2)" : "transparent",
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  main: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px",
  },
  card: {
    background: COLORS.surface,
    borderRadius: 14,
    border: `1px solid ${COLORS.border}`,
    padding: 28,
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22,
    marginBottom: 6,
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "#1A1A1A",
    background: "#FFFFFF",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "#1A1A1A",
    background: "#FFFFFF",
    outline: "none",
    resize: "vertical",
    minHeight: 80,
    boxSizing: "border-box",
    lineHeight: 1.5,
  },
  btnPrimary: {
    padding: "11px 24px",
    borderRadius: 8,
    border: "none",
    background: COLORS.accent,
    color: "#fff",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  btnSecondary: {
    padding: "10px 20px",
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.text,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    background: COLORS.dangerLight,
    color: COLORS.danger,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  tag: (color, bgColor) => ({
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    background: bgColor,
    color: color,
    fontSize: 12,
    fontWeight: 600,
  }),
  ratingBar: (pct, color) => ({
    height: 8,
    borderRadius: 4,
    background: COLORS.surfaceAlt,
    position: "relative",
    overflow: "hidden",
    flex: 1,
  }),
  ratingFill: (pct, color) => ({
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: `${pct}%`,
    borderRadius: 4,
    background: color,
    transition: "width 0.4s ease",
  }),
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    color: COLORS.textMuted,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  fadeIn: {
    animation: "fadeIn 0.3s ease",
  },
};

// ─── Data Storage Helpers ───
const STORAGE_KEY = "perf_mgr_data";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { employees: [], feedback: [], priorities: [], assessments: [] };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

// ─── Rating Stars Component ───
function StarRating({ value, onChange, size = 22, max = 3 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: size,
            color: star <= (hover || value) ? COLORS.gold : COLORS.border,
            transition: "color 0.15s",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Collect Feedback ───
function FeedbackTab({ data, setData }) {
  const [form, setForm] = useState({
    employeeName: "",
    reviewerName: "",
    relationship: "peer",
    strengths: "",
    improvements: "",
    overallFeedback: "",
    ratingWhat: 0,
    ratingHow: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const batchInputRef = useRef(null);
  const [justSaved, setJustSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const reviewerRef = useRef(null);

  // Active employee for multi-feedback flow
  const [activeEmployee, setActiveEmployee] = useState("");
  const [newEmployeeName, setNewEmployeeName] = useState("");

  // Batch upload state
  const [batchFile, setBatchFile] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState("");
  const [batchProgress, setBatchProgress] = useState("");

  const ACCEPTED_TYPES = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/msword": "DOC",
    "text/plain": "TXT",
    "application/json": "JSON",
    "audio/mpeg": "MP3",
    "audio/mp3": "MP3",
    "audio/wav": "WAV",
    "audio/x-wav": "WAV",
    "audio/mp4": "M4A",
    "audio/x-m4a": "M4A",
    "audio/webm": "WEBM",
    "audio/ogg": "OGG",
  };
  const ACCEPTED_EXTENSIONS = ".pdf,.docx,.doc,.txt,.json,.mp3,.wav,.m4a,.webm,.ogg";
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const isAudioType = (file) => {
    return file.type?.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg)$/i.test(file.name);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" exceeds 10MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const ext = file.name.split(".").pop().toUpperCase();
        const typeLabel = ACCEPTED_TYPES[file.type] || ext;
        setAttachments((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            name: file.name,
            type: typeLabel,
            size: file.size,
            data: reader.result,
            isAudio: isAudioType(file),
          },
        ]);
      };
      if (file.type === "text/plain" || file.type === "application/json") {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = (keepOpen = false) => {
    const empName = activeEmployee || form.employeeName.trim();
    if (!empName || !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0) return;
    const entry = {
      ...form,
      employeeName: empName,
      id: Date.now(),
      date: new Date().toISOString(),
      attachments: attachments.map((a) => ({ name: a.name, type: a.type, size: a.size, isAudio: a.isAudio || false })),
    };
    const next = { ...data, feedback: [...data.feedback, entry] };
    if (!data.employees.find((e) => e.name.toLowerCase() === empName.toLowerCase())) {
      next.employees = [...next.employees, { name: empName, id: Date.now() }];
    }
    setData(next);
    saveData(next);
    setSavedCount((c) => c + 1);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);

    if (keepOpen) {
      // Keep employee, clear everything else for next reviewer
      setForm((prev) => ({
        ...prev,
        reviewerName: "",
        relationship: "peer",
        strengths: "",
        improvements: "",
        overallFeedback: "",
        ratingWhat: 0,
        ratingHow: 0,
      }));
      setAttachments([]);
      // Focus reviewer name field for fast entry
      setTimeout(() => reviewerRef.current?.focus(), 100);
    } else {
      setForm({ employeeName: "", reviewerName: "", relationship: "peer", strengths: "", improvements: "", overallFeedback: "", ratingWhat: 0, ratingHow: 0 });
      setAttachments([]);
      setShowForm(false);
    }
  };

  const deleteFeedback = (id) => {
    const next = { ...data, feedback: data.feedback.filter((f) => f.id !== id) };
    setData(next);
    saveData(next);
  };

  // ─── Batch Upload Logic ───
  const handleBatchFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`"${file.name}" exceeds 10MB limit.`);
      return;
    }
    setBatchFile(file);
    setBatchResults(null);
    setBatchError("");
    if (batchInputRef.current) batchInputRef.current.value = "";
  };

  const processBatchUpload = async () => {
    if (!batchFile) return;
    setBatchProcessing(true);
    setBatchError("");
    setBatchResults(null);
    setBatchProgress("Reading file…");

    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        if (batchFile.type === "text/plain" || batchFile.type === "application/json") {
          reader.readAsText(batchFile);
        } else {
          reader.readAsDataURL(batchFile);
        }
      });

      setBatchProgress("Analyzing content with AI…");

      const isText = typeof fileContent === "string" && !fileContent.startsWith("data:");
      const isAudio = isAudioType(batchFile);
      const isDocx = isDocxFile(batchFile);
      let messageContent = [];

      if (isDocx) {
        // Extract text from DOCX using mammoth
        setBatchProgress("Extracting text from Word document…");
        const docxText = await extractDocxText(fileContent);
        messageContent = [{
          type: "text",
          text: `Here is the text content extracted from Word document "${batchFile.name}":\n\n${docxText}`,
        }];
      } else if (isText) {
        messageContent = [{
          type: "text",
          text: `Here is the content of "${batchFile.name}":\n\n${fileContent}`,
        }];
      } else if (isAudio) {
        const base64 = fileContent.split(",")[1];
        const mediaMap = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", webm: "audio/webm", ogg: "audio/ogg" };
        const ext = batchFile.name.split(".").pop().toLowerCase();
        messageContent = [
          { type: "text", text: `The following audio file "${batchFile.name}" contains employee performance feedback. Transcribe it and extract feedback for each employee mentioned.` },
          { type: "document", source: { type: "base64", media_type: mediaMap[ext] || batchFile.type || "audio/mpeg", data: base64 } },
        ];
      } else {
        const base64 = fileContent.split(",")[1];
        messageContent = [
          { type: "text", text: `The following document "${batchFile.name}" contains employee performance feedback. Extract feedback for each employee mentioned.` },
          { type: "document", source: { type: "base64", media_type: batchFile.type || "application/pdf", data: base64 } },
        ];
      }

      messageContent.push({
        type: "text",
        text: `Extract ALL individual employee feedback entries from this content. For each employee mentioned, extract their feedback separately.

Return ONLY a JSON array (no markdown, no backticks, no preamble) where each element has:
{
  "employeeName": "Full Name",
  "reviewerName": "Reviewer name if mentioned, otherwise 'Document Import'",
  "relationship": "peer" | "manager" | "direct" | "self",
  "strengths": "Key strengths mentioned",
  "improvements": "Areas for improvement mentioned",
  "ratingWhat": 1-3 integer for what was accomplished (1=below, 2=meets, 3=exceeds). Infer from context if not explicit.,
  "ratingHow": 1-3 integer for how it was accomplished (1=below, 2=meets, 3=exceeds). Infer from context if not explicit.
}

If the document contains feedback about multiple employees, return one entry per employee. Always return a valid JSON array.`,
      });

      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: messageContent }],
        }),
      }, 3, (msg) => setBatchProgress(msg));

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const parsed = safeParseJSON(text);

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No feedback entries found in the document. Try a file with clearer employee feedback.");

      const validated = parsed.map((entry) => ({
        employeeName: entry.employeeName || "Unknown",
        reviewerName: entry.reviewerName || "Document Import",
        relationship: ["peer", "manager", "direct", "self"].includes(entry.relationship) ? entry.relationship : "peer",
        strengths: entry.strengths || "",
        improvements: entry.improvements || "",
        ratingWhat: Math.max(1, Math.min(3, Math.round(entry.ratingWhat || 2))),
        ratingHow: Math.max(1, Math.min(3, Math.round(entry.ratingHow || 2))),
      }));

      setBatchProgress("");
      setBatchResults(validated);
    } catch (err) {
      console.error("Batch processing error:", err);
      setBatchError(err.message || "Failed to process file.");
      setBatchProgress("");
    } finally {
      setBatchProcessing(false);
    }
  };

  const importBatchResults = () => {
    if (!batchResults) return;
    const now = Date.now();
    const newEntries = batchResults.map((entry, i) => ({
      ...entry,
      id: now + i,
      date: new Date().toISOString(),
      attachments: [{ name: batchFile?.name || "batch", type: "BATCH", size: 0, isAudio: isAudioType(batchFile || {}) }],
      source: "batch",
    }));
    const next = { ...data, feedback: [...data.feedback, ...newEntries] };
    newEntries.forEach((entry) => {
      if (!next.employees.find((e) => e.name.toLowerCase() === entry.employeeName.toLowerCase())) {
        next.employees = [...next.employees, { name: entry.employeeName, id: Date.now() + Math.random() }];
      }
    });
    setData(next);
    saveData(next);
    setBatchFile(null);
    setBatchResults(null);
    setBatchProgress("");
  };

  const relLabel = { peer: "Peer", manager: "Manager", self: "Self", direct: "Direct Report" };

  const uniqueEmployees = [...new Set(data.feedback.map((f) => f.employeeName))];
  const activeFeedbackCount = activeEmployee
    ? data.feedback.filter((f) => f.employeeName === activeEmployee).length
    : 0;

  const startFeedbackFor = (name) => {
    setActiveEmployee(name);
    setForm((prev) => ({ ...prev, employeeName: name }));
    setSavedCount(0);
    setShowForm(true);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={styles.sectionTitle}>Collect Feedback</h2>
          <p style={{ ...styles.sectionSub, marginBottom: 0 }}>Gather 360° feedback from peers, direct reports, and self-assessments.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnSecondary} onClick={() => batchInputRef.current?.click()}>
            ⬆ Batch Import
          </button>
          <button style={styles.btnPrimary} onClick={() => {
            if (showForm) {
              setShowForm(false);
              setActiveEmployee("");
              setSavedCount(0);
            } else {
              setShowForm(true);
            }
          }}>
            {showForm ? "Close" : "+ New Feedback"}
          </button>
        </div>
        <input
          ref={batchInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          style={{ display: "none" }}
          onChange={handleBatchFileSelect}
        />
      </div>

      {/* ─── Batch Upload Panel ─── */}
      {(batchFile || batchResults) && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${COLORS.warm}`, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Batch Import</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                Upload a document or audio file containing feedback for multiple employees
              </div>
            </div>
          </div>

          {batchFile && !batchResults && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 8, background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`, marginBottom: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={styles.tag(COLORS.warm, COLORS.warmLight)}>
                    {isAudioType(batchFile) ? "🎤 " : ""}{batchFile.name.split(".").pop().toUpperCase()}
                  </span>
                  <span style={{ fontSize: 14 }}>{batchFile.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>{formatFileSize(batchFile.size)}</span>
                </div>
                <button style={styles.btnDanger} onClick={() => { setBatchFile(null); setBatchError(""); }}>✕</button>
              </div>
              {batchError && (
                <div style={{ padding: 12, borderRadius: 8, background: COLORS.dangerLight, color: COLORS.danger, fontSize: 13, marginBottom: 14 }}>
                  {batchError}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{ ...styles.btnPrimary, background: COLORS.warm, display: "flex", alignItems: "center", gap: 8 }}
                  onClick={processBatchUpload}
                  disabled={batchProcessing}
                >
                  {batchProcessing ? (
                    <>
                      <span style={{
                        display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite",
                      }} />
                      {batchProgress}
                    </>
                  ) : "Analyze & Extract Feedback"}
                </button>
              </div>
            </div>
          )}

          {batchResults && (
            <div>
              <div style={{
                padding: 12, borderRadius: 8, background: COLORS.accentLight,
                color: COLORS.accent, fontSize: 14, fontWeight: 600, marginBottom: 16,
              }}>
                Found {batchResults.length} employee feedback {batchResults.length === 1 ? "entry" : "entries"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {batchResults.map((entry, i) => (
                  <div key={i} style={{
                    padding: 16, borderRadius: 10, background: COLORS.surfaceAlt,
                    border: `1px solid ${COLORS.border}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{entry.employeeName}</span>
                        <span style={{ color: COLORS.textMuted, margin: "0 8px", fontSize: 13 }}>← {entry.reviewerName}</span>
                        <span style={styles.tag(COLORS.accent, COLORS.accentLight)}>{relLabel[entry.relationship]}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                        What: <span style={{ color: COLORS.gold }}>{"★".repeat(entry.ratingWhat)}{"☆".repeat(3 - entry.ratingWhat)}</span>
                        {" · "}
                        How: <span style={{ color: COLORS.gold }}>{"★".repeat(entry.ratingHow)}{"☆".repeat(3 - entry.ratingHow)}</span>
                      </div>
                    </div>
                    {entry.strengths && (
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: COLORS.accent, fontSize: 11 }}>STRENGTHS: </span>
                        {entry.strengths}
                      </div>
                    )}
                    {entry.improvements && (
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: COLORS.warm, fontSize: 11 }}>GROWTH: </span>
                        {entry.improvements}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button style={styles.btnSecondary} onClick={() => { setBatchResults(null); setBatchFile(null); }}>
                  Discard
                </button>
                <button style={{ ...styles.btnPrimary }} onClick={importBatchResults}>
                  Import {batchResults.length} {batchResults.length === 1 ? "Entry" : "Entries"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{ ...styles.card, borderLeft: `4px solid ${COLORS.accent}`, marginBottom: 20 }}>

          {/* ─── Employee Selector (pinned) ─── */}
          <div style={{
            padding: 16, borderRadius: 10, background: COLORS.surfaceAlt, marginBottom: 20,
            border: `1px solid ${COLORS.border}`,
          }}>
            <label style={{ ...styles.label, marginBottom: 10 }}>Employee Being Reviewed</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {uniqueEmployees.map((name) => (
                <button
                  key={name}
                  onClick={() => startFeedbackFor(name)}
                  style={{
                    ...styles.btnSecondary,
                    padding: "8px 16px",
                    background: activeEmployee === name ? COLORS.accentLight : COLORS.surface,
                    borderColor: activeEmployee === name ? COLORS.accent : COLORS.border,
                    color: activeEmployee === name ? COLORS.accent : COLORS.text,
                    fontWeight: activeEmployee === name ? 700 : 400,
                  }}
                >
                  {name}
                  <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.textMuted }}>
                    ({data.feedback.filter((f) => f.employeeName === name).length})
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Or type a new employee name…"
                value={activeEmployee ? "" : newEmployeeName}
                onChange={(e) => { setNewEmployeeName(e.target.value); setActiveEmployee(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newEmployeeName.trim()) {
                    startFeedbackFor(newEmployeeName.trim());
                    setNewEmployeeName("");
                  }
                }}
                disabled={!!activeEmployee}
              />
              {!activeEmployee && newEmployeeName.trim() && (
                <button style={styles.btnPrimary} onClick={() => { startFeedbackFor(newEmployeeName.trim()); setNewEmployeeName(""); }}>
                  Select
                </button>
              )}
              {activeEmployee && (
                <button style={styles.btnSecondary} onClick={() => { setActiveEmployee(""); setSavedCount(0); }}>
                  Change
                </button>
              )}
            </div>
          </div>

          {/* ─── Active Employee Header ─── */}
          {activeEmployee && (
            <>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{activeEmployee}</span>
                  <span style={styles.tag(COLORS.accent, COLORS.accentLight)}>
                    {activeFeedbackCount + savedCount > activeFeedbackCount ? activeFeedbackCount : activeFeedbackCount} feedback{activeFeedbackCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {justSaved && (
                  <span style={{
                    color: COLORS.accent, fontSize: 13, fontWeight: 600,
                    animation: "fadeIn 0.3s ease",
                  }}>
                    ✓ Feedback saved! Ready for next reviewer.
                  </span>
                )}
              </div>

              {/* ─── Feedback Fields ─── */}
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Reviewer Name</label>
                  <input
                    ref={reviewerRef}
                    style={styles.input}
                    placeholder="Who is giving this feedback?"
                    value={form.reviewerName}
                    onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={styles.label}>Relationship</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["peer", "manager", "direct", "self"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm({ ...form, relationship: r })}
                        style={{
                          ...styles.btnSecondary,
                          padding: "10px 12px",
                          flex: 1,
                          background: form.relationship === r ? COLORS.accentLight : COLORS.surface,
                          borderColor: form.relationship === r ? COLORS.accent : COLORS.border,
                          color: form.relationship === r ? COLORS.accent : COLORS.text,
                          fontWeight: form.relationship === r ? 600 : 400,
                          fontSize: 12,
                        }}
                      >
                        {relLabel[r]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>Ratings</label>
                <div style={styles.grid2}>
                  <div style={{ padding: 14, borderRadius: 8, background: COLORS.surfaceAlt }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>What Was Accomplished</div>
                    <StarRating value={form.ratingWhat} onChange={(v) => setForm({ ...form, ratingWhat: v })} max={3} size={26} />
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
                      {form.ratingWhat === 0 ? "Select 1–3" : form.ratingWhat === 1 ? "Below expectations" : form.ratingWhat === 2 ? "Meets expectations" : "Exceeds expectations"}
                    </div>
                  </div>
                  <div style={{ padding: 14, borderRadius: 8, background: COLORS.surfaceAlt }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>How It Was Accomplished</div>
                    <StarRating value={form.ratingHow} onChange={(v) => setForm({ ...form, ratingHow: v })} max={3} size={26} />
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
                      {form.ratingHow === 0 ? "Select 1–3" : form.ratingHow === 1 ? "Below expectations" : form.ratingHow === 2 ? "Meets expectations" : "Exceeds expectations"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>Overall Feedback</label>
                <textarea
                  style={{ ...styles.textarea, minHeight: 100 }}
                  placeholder="General observations, context, or additional comments…"
                  value={form.overallFeedback}
                  onChange={(e) => setForm({ ...form, overallFeedback: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>Key Strengths</label>
                <textarea
                  style={styles.textarea}
                  placeholder="What does this person do well?"
                  value={form.strengths}
                  onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>Areas for Improvement</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Where could they grow?"
                  value={form.improvements}
                  onChange={(e) => setForm({ ...form, improvements: e.target.value })}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={styles.label}>Attachments</label>
                <div
                  style={{
                    border: `2px dashed ${COLORS.border}`,
                    borderRadius: 10,
                    padding: 16,
                    textAlign: "center",
                    cursor: "pointer",
                    background: COLORS.surfaceAlt,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.accent; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = COLORS.border;
                    if (e.dataTransfer.files.length) handleFileSelect({ target: { files: e.dataTransfer.files } });
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>Click or drag files here</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>PDF, Word, TXT, JSON, or Audio — up to 10MB</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>
                {attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {attachments.map((att) => (
                      <div key={att.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <span style={{
                            ...styles.tag(att.isAudio ? COLORS.warm : COLORS.accent, att.isAudio ? COLORS.warmLight : COLORS.accentLight),
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {att.isAudio ? "🎤 " : ""}{att.type}
                          </span>
                          <span style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                          <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>{formatFileSize(att.size)}</span>
                        </div>
                        <button style={styles.btnDanger} onClick={() => removeAttachment(att.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Submit Buttons ─── */}
              <div style={{
                marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10,
                paddingTop: 16, borderTop: `1px solid ${COLORS.border}`,
              }}>
                <button
                  style={{
                    ...styles.btnSecondary,
                    opacity: !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0 ? 0.5 : 1,
                  }}
                  onClick={() => handleSubmit(false)}
                  disabled={!form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0}
                >
                  Submit & Close
                </button>
                <button
                  style={{
                    ...styles.btnPrimary,
                    opacity: !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0 ? 0.5 : 1,
                  }}
                  onClick={() => handleSubmit(true)}
                  disabled={!form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0}
                >
                  Submit & Add Another ↩
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {data.feedback.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 500 }}>No feedback collected yet</p>
          <p style={{ fontSize: 13 }}>Click "+ New Feedback" or "Batch Import" to get started.</p>
        </div>
      ) : (
        data.feedback
          .slice()
          .reverse()
          .map((fb) => (
            <div key={fb.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{fb.employeeName}</span>
                  <span style={{ color: COLORS.textMuted, margin: "0 8px" }}>←</span>
                  <span style={{ color: COLORS.textMuted }}>{fb.reviewerName}</span>
                  <span style={{ marginLeft: 10 }}>
                    {fb.relationship === "peer" && <span style={styles.tag(COLORS.accent, COLORS.accentLight)}>Peer</span>}
                    {fb.relationship === "manager" && <span style={styles.tag(COLORS.warm, COLORS.warmLight)}>Manager</span>}
                    {fb.relationship === "self" && <span style={styles.tag(COLORS.gold, COLORS.goldLight)}>Self</span>}
                    {fb.relationship === "direct" && <span style={styles.tag("#6B5B95", "#F0EDF5")}>Direct Report</span>}
                  </span>
                  {fb.source === "batch" && (
                    <span style={{ ...styles.tag(COLORS.warm, COLORS.warmLight), marginLeft: 6, fontSize: 10 }}>BATCH</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div style={{ color: COLORS.textMuted, marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>What: </span>
                      <span style={{ color: COLORS.gold }}>{"★".repeat(fb.ratingWhat || 0)}{"☆".repeat(3 - (fb.ratingWhat || 0))}</span>
                    </div>
                    <div style={{ color: COLORS.textMuted }}>
                      <span style={{ fontWeight: 500 }}>How: </span>
                      <span style={{ color: COLORS.gold }}>{"★".repeat(fb.ratingHow || 0)}{"☆".repeat(3 - (fb.ratingHow || 0))}</span>
                    </div>
                  </div>
                  <button style={styles.btnDanger} onClick={() => deleteFeedback(fb.id)}>Remove</button>
                </div>
              </div>
              {(() => {
                // Build a short summary line from available feedback
                const parts = [];
                if (fb.overallFeedback) parts.push(fb.overallFeedback);
                if (fb.strengths) parts.push(fb.strengths);
                if (fb.improvements) parts.push(fb.improvements);
                const summary = parts.join(" · ");
                const maxLen = 180;
                const truncated = summary.length > maxLen ? summary.substring(0, maxLen) + "…" : summary;
                return truncated ? (
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5, marginBottom: 6 }}>
                    {truncated}
                  </div>
                ) : null;
              })()}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date(fb.date).toLocaleDateString()}</span>
                {fb.strengths && <span style={styles.tag(COLORS.accent, COLORS.accentLight)}>Strengths noted</span>}
                {fb.improvements && <span style={styles.tag(COLORS.warm, COLORS.warmLight)}>Growth areas noted</span>}
                {fb.attachments && fb.attachments.length > 0 && (
                  <span style={styles.tag(COLORS.textMuted, COLORS.surfaceAlt)}>
                    📎 {fb.attachments.length} file{fb.attachments.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ─── Tab: Assess Performance ───
function AssessTab({ data, setData }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [priorities, setPriorities] = useState([]);
  const [saved, setSaved] = useState(false);

  // Priority input mode
  const [inputMode, setInputMode] = useState("text"); // "text" or "document"
  const [priorityText, setPriorityText] = useState("");
  const [assessAttachments, setAssessAttachments] = useState([]);
  const assessFileRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [extractError, setExtractError] = useState("");

  const ASSESS_EXTENSIONS = ".pdf,.docx,.doc,.txt,.json,.mp3,.wav,.m4a,.webm,.ogg";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const isAudioFile = (file) => file.type?.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg)$/i.test(file.name);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const ratingLabel = (v) => v === 1 ? "Below expectations" : v === 2 ? "Meets expectations" : v === 3 ? "Exceeds expectations" : "Not rated";
  const ratingColor = (v) => v === 3 ? COLORS.accent : v === 2 ? COLORS.gold : v === 1 ? COLORS.warm : COLORS.textMuted;

  // File handling
  const handleAssessFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) { alert(`"${file.name}" exceeds 10MB.`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const ext = file.name.split(".").pop().toUpperCase();
        setAssessAttachments((prev) => [...prev, {
          id: Date.now() + Math.random(), name: file.name, type: ext,
          size: file.size, data: reader.result, isAudio: isAudioFile(file), mimeType: file.type,
        }]);
      };
      if (file.type === "text/plain" || file.type === "application/json") reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
    if (assessFileRef.current) assessFileRef.current.value = "";
  };

  const removeAssessAttachment = (id) => setAssessAttachments((prev) => prev.filter((a) => a.id !== id));

  // Extract priorities — from text or document
  const extractPriorities = async () => {
    if (!selectedEmployee) return;
    setExtracting(true);
    setExtractError("");
    setExtractProgress("Preparing…");

    try {
      let messageContent = [];
      const titleContext = jobTitle.trim() ? `Their job title is "${jobTitle.trim()}".` : "";

      if (inputMode === "text" && priorityText.trim()) {
        messageContent.push({
          type: "text",
          text: `The following text describes performance priorities, goals, or expectations for employee "${selectedEmployee}". ${titleContext}\n\n${priorityText.trim()}`,
        });
      } else if (inputMode === "document" && assessAttachments.length > 0) {
        setExtractProgress("Reading documents…");
        for (const att of assessAttachments) {
          const isText = typeof att.data === "string" && !att.data.startsWith("data:");
          const isDocx = isDocxName(att.name);
          if (isDocx && !isText) {
            const docxText = await extractDocxText(att.data);
            messageContent.push({ type: "text", text: `Word document "${att.name}":\n${docxText}` });
          } else if (isText) {
            messageContent.push({ type: "text", text: `File "${att.name}":\n${att.data}` });
          } else if (att.isAudio) {
            const base64 = att.data.split(",")[1];
            const mediaMap = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", webm: "audio/webm", ogg: "audio/ogg" };
            const ext = att.name.split(".").pop().toLowerCase();
            messageContent.push(
              { type: "text", text: `Audio file "${att.name}" — transcribe and extract priorities:` },
              { type: "document", source: { type: "base64", media_type: mediaMap[ext] || att.mimeType || "audio/mpeg", data: base64 } },
            );
          } else {
            const base64 = att.data.split(",")[1];
            messageContent.push(
              { type: "text", text: `Document "${att.name}" — extract priorities for ${selectedEmployee}:` },
              { type: "document", source: { type: "base64", media_type: att.mimeType || "application/pdf", data: base64 } },
            );
          }
        }
        messageContent.push({
          type: "text",
          text: `The above documents relate to employee "${selectedEmployee}". ${titleContext}`,
        });
      } else {
        throw new Error(inputMode === "text" ? "Please enter priority text." : "Please attach a document.");
      }

      messageContent.push({
        type: "text",
        text: `Extract ONLY the specific priorities, goals, or objectives that are explicitly stated in the content above for employee "${selectedEmployee}". ${titleContext ? `Their role is ${jobTitle.trim()}.` : ""}

CRITICAL RULES:
- Extract ONLY priorities that are clearly and explicitly mentioned in the provided content.
- Do NOT invent, infer, or generate new priorities that are not in the source material.
- If a priority is vaguely defined in the source, extract it as-is — do not rewrite or clarify it. The quality check will flag vague priorities separately.
- If no clear priorities are found, return an empty array [].
- Preserve the original wording as closely as possible.

Return ONLY a JSON array (no markdown, no backticks, no preamble) where each element has:
{
  "text": "Priority exactly as stated or closely paraphrased from source",
  "ratingWhat": 0,
  "ratingHow": 0
}

Set ratingWhat and ratingHow to 0 (unrated). The manager will rate these manually.
Return a valid JSON array.`,
      });

      setExtractProgress("Extracting priorities with AI…");

      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: messageContent }],
        }),
      }, 3, (msg) => setExtractProgress(msg));

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const parsed = safeParseJSON(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];

      if (arr.length > 0 && arr[0].text) {
        setPriorities(arr.map((p) => ({
          text: p.text || "",
          ratingWhat: 0,
          ratingHow: 0,
        })));
      } else {
        throw new Error("Could not extract priorities. Try adding more detail or rephrasing.");
      }
    } catch (err) {
      console.error("Priority extraction error:", err);
      setExtractError(err.message || "Failed to extract priorities.");
    } finally {
      setExtracting(false);
      setExtractProgress("");
    }
  };

  // Manual add
  const addPriority = () => setPriorities([...priorities, { text: "", ratingWhat: 0, ratingHow: 0 }]);
  const removePriority = (i) => setPriorities(priorities.filter((_, idx) => idx !== i));
  const updatePriority = (i, field, val) => {
    const next = [...priorities];
    next[i] = { ...next[i], [field]: val };
    setPriorities(next);
  };

  // Scoring summary
  const ratedPriorities = priorities.filter((p) => p.text && p.ratingWhat > 0 && p.ratingHow > 0);
  const avgWhat = ratedPriorities.length > 0
    ? (ratedPriorities.reduce((s, p) => s + p.ratingWhat, 0) / ratedPriorities.length)
    : 0;
  const avgHow = ratedPriorities.length > 0
    ? (ratedPriorities.reduce((s, p) => s + p.ratingHow, 0) / ratedPriorities.length)
    : 0;

  const handleSave = () => {
    if (!selectedEmployee || priorities.length === 0) return;
    const assessment = {
      id: Date.now(),
      employee: selectedEmployee,
      jobTitle: jobTitle.trim(),
      priorities: [...priorities],
      avgWhat,
      avgHow,
      overallScore: ratedPriorities.length > 0 ? ((avgWhat + avgHow) / 2) : 0,
      date: new Date().toISOString(),
    };
    const next = { ...data, assessments: [...data.assessments, assessment] };
    setData(next);
    saveData(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteAssessment = (id) => {
    const next = { ...data, assessments: data.assessments.filter((a) => a.id !== id) };
    setData(next);
    saveData(next);
  };

  const uniqueEmployees = [...new Set(data.feedback.map((f) => f.employeeName))];

  return (
    <div>
      <h2 style={styles.sectionTitle}>Assess Performance</h2>
      <p style={styles.sectionSub}>
        Define priorities from text or documents, then rate each on the same 1–3 scales used in feedback collection.
      </p>

      {/* Employee & Job Title */}
      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Employee</label>
            {uniqueEmployees.length > 0 ? (
              <select
                style={{ ...styles.input, cursor: "pointer" }}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Choose an employee…</option>
                {uniqueEmployees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input
                style={styles.input}
                placeholder="Enter employee name"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              />
            )}
          </div>
          <div>
            <label style={styles.label}>Job Title</label>
            <input
              style={styles.input}
              placeholder="e.g., Senior Product Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Priority Input Mode Toggle */}
        <div style={{ marginTop: 24 }}>
          <label style={styles.label}>Define Priorities</label>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            <button
              onClick={() => setInputMode("text")}
              style={{
                ...styles.btnSecondary,
                flex: 1,
                background: inputMode === "text" ? COLORS.accentLight : COLORS.surface,
                borderColor: inputMode === "text" ? COLORS.accent : COLORS.border,
                color: inputMode === "text" ? COLORS.accent : COLORS.textMuted,
                fontWeight: inputMode === "text" ? 600 : 400,
              }}
            >
              ✏️ Paste / Type
            </button>
            <button
              onClick={() => setInputMode("document")}
              style={{
                ...styles.btnSecondary,
                flex: 1,
                background: inputMode === "document" ? COLORS.accentLight : COLORS.surface,
                borderColor: inputMode === "document" ? COLORS.accent : COLORS.border,
                color: inputMode === "document" ? COLORS.accent : COLORS.textMuted,
                fontWeight: inputMode === "document" ? 600 : 400,
              }}
            >
              📄 Upload Document
            </button>
          </div>

          {inputMode === "text" && (
            <div>
              <textarea
                style={{ ...styles.textarea, minHeight: 120 }}
                placeholder={"Paste priorities, goals, OKRs, or a job description here…\n\nExample:\n- Drive 15% revenue growth in Q3\n- Launch new onboarding flow by August\n- Improve team NPS score to 80+\n- Mentor two junior engineers"}
                value={priorityText}
                onChange={(e) => setPriorityText(e.target.value)}
              />
            </div>
          )}

          {inputMode === "document" && (
            <div>
              <div
                style={{
                  border: `2px dashed ${COLORS.border}`,
                  borderRadius: 10,
                  padding: 16,
                  textAlign: "center",
                  cursor: "pointer",
                  background: COLORS.surfaceAlt,
                }}
                onClick={() => assessFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.accent; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = COLORS.border;
                  if (e.dataTransfer.files.length) handleAssessFileSelect({ target: { files: e.dataTransfer.files } });
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>Upload goals doc, OKRs, job description, or audio</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>PDF, Word, TXT, JSON, or Audio — up to 10MB</div>
                <input
                  ref={assessFileRef}
                  type="file"
                  accept={ASSESS_EXTENSIONS}
                  multiple
                  style={{ display: "none" }}
                  onChange={handleAssessFileSelect}
                />
              </div>
              {assessAttachments.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {assessAttachments.map((att) => (
                    <div key={att.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{
                          ...styles.tag(att.isAudio ? COLORS.warm : COLORS.accent, att.isAudio ? COLORS.warmLight : COLORS.accentLight),
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>
                          {att.isAudio ? "🎤 " : ""}{att.type}
                        </span>
                        <span style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>{formatSize(att.size)}</span>
                      </div>
                      <button style={styles.btnDanger} onClick={() => removeAssessAttachment(att.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {extractError && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: COLORS.dangerLight, color: COLORS.danger, fontSize: 13 }}>
              {extractError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              style={{
                ...styles.btnPrimary,
                display: "flex", alignItems: "center", gap: 8,
                opacity: !selectedEmployee || extracting || (inputMode === "text" && !priorityText.trim()) || (inputMode === "document" && assessAttachments.length === 0) ? 0.5 : 1,
              }}
              onClick={extractPriorities}
              disabled={!selectedEmployee || extracting || (inputMode === "text" && !priorityText.trim()) || (inputMode === "document" && assessAttachments.length === 0)}
            >
              {extracting ? (
                <>
                  <span style={{
                    display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite",
                  }} />
                  {extractProgress}
                </>
              ) : "Extract Priorities"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Priorities Rating Cards ─── */}
      {priorities.length > 0 && (() => {
        // Gather feedback insights for the selected employee
        const empFeedback = data.feedback.filter((f) => f.employeeName === selectedEmployee);
        const fbAvgWhat = empFeedback.length > 0
          ? (empFeedback.reduce((s, f) => s + (f.ratingWhat || 0), 0) / empFeedback.length)
          : 0;
        const fbAvgHow = empFeedback.length > 0
          ? (empFeedback.reduce((s, f) => s + (f.ratingHow || 0), 0) / empFeedback.length)
          : 0;

        return (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>
              Rate Each Priority ({priorities.length})
            </label>
            <button style={styles.btnSecondary} onClick={addPriority}>+ Add Priority</button>
          </div>

          {/* ─── Feedback Summary Banner ─── */}
          {empFeedback.length > 0 && (
            <div style={{
              padding: 14, borderRadius: 10, background: COLORS.bg,
              border: `1px solid ${COLORS.border}`, marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Collected Feedback Summary — {empFeedback.length} input{empFeedback.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                  Avg What: <span style={{ fontWeight: 700, color: ratingColor(Math.round(fbAvgWhat)) }}>{fbAvgWhat.toFixed(1)}/3</span>
                  <span style={{ margin: "0 6px" }}>·</span>
                  Avg How: <span style={{ fontWeight: 700, color: ratingColor(Math.round(fbAvgHow)) }}>{fbAvgHow.toFixed(1)}/3</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {empFeedback.map((f, fi) => (
                  <span key={fi} style={{
                    ...styles.tag(COLORS.textMuted, COLORS.surfaceAlt),
                    fontSize: 11,
                  }}>
                    {f.reviewerName} ({f.relationship}) — W:{f.ratingWhat} H:{f.ratingHow}
                  </span>
                ))}
              </div>
            </div>
          )}

          {priorities.map((p, i) => {
            // Find feedback snippets relevant to this priority keyword
            const keywords = p.text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
            const relevantFeedback = empFeedback.filter((f) =>
              keywords.some((kw) =>
                (f.strengths && f.strengths.toLowerCase().includes(kw)) ||
                (f.improvements && f.improvements.toLowerCase().includes(kw)) ||
                (f.overallFeedback && f.overallFeedback.toLowerCase().includes(kw))
              )
            );
            const relevantStrengths = empFeedback
              .filter((f) => f.strengths && keywords.some((kw) => f.strengths.toLowerCase().includes(kw)))
              .map((f) => ({ text: f.strengths, reviewer: f.reviewerName, rel: f.relationship, rw: f.ratingWhat, rh: f.ratingHow }));
            const relevantImprovements = empFeedback
              .filter((f) => f.improvements && keywords.some((kw) => f.improvements.toLowerCase().includes(kw)))
              .map((f) => ({ text: f.improvements, reviewer: f.reviewerName, rel: f.relationship, rw: f.ratingWhat, rh: f.ratingHow }));
            const relevantOverall = empFeedback
              .filter((f) => f.overallFeedback && keywords.some((kw) => f.overallFeedback.toLowerCase().includes(kw)))
              .map((f) => ({ text: f.overallFeedback, reviewer: f.reviewerName, rel: f.relationship, rw: f.ratingWhat, rh: f.ratingHow }));

            // If no keyword matches, show all feedback as general context
            const hasRelevant = relevantStrengths.length > 0 || relevantImprovements.length > 0 || relevantOverall.length > 0;
            const allStrengths = empFeedback.filter((f) => f.strengths).map((f) => ({ text: f.strengths, reviewer: f.reviewerName, rel: f.relationship, rw: f.ratingWhat, rh: f.ratingHow }));
            const allImprovements = empFeedback.filter((f) => f.improvements).map((f) => ({ text: f.improvements, reviewer: f.reviewerName, rel: f.relationship, rw: f.ratingWhat, rh: f.ratingHow }));

            // Compute average scores from relevant or all feedback
            const scoreSources = hasRelevant ? relevantFeedback : empFeedback;
            const srcWithWhat = scoreSources.filter((f) => f.ratingWhat > 0);
            const srcWithHow = scoreSources.filter((f) => f.ratingHow > 0);
            const srcAvgWhat = srcWithWhat.length > 0 ? (srcWithWhat.reduce((s, f) => s + f.ratingWhat, 0) / srcWithWhat.length) : 0;
            const srcAvgHow = srcWithHow.length > 0 ? (srcWithHow.reduce((s, f) => s + f.ratingHow, 0) / srcWithHow.length) : 0;

            return (
            <div
              key={i}
              style={{
                padding: 16,
                borderRadius: 10,
                background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <input
                  style={{ ...styles.input, flex: 1, fontWeight: 600, background: "transparent", border: "none", padding: "0", fontSize: 15, color: COLORS.text }}
                  placeholder={`Priority ${i + 1}`}
                  value={p.text}
                  onChange={(e) => updatePriority(i, "text", e.target.value)}
                />
                <button
                  style={{ ...styles.btnDanger, marginLeft: 10, visibility: priorities.length > 1 ? "visible" : "hidden" }}
                  onClick={() => removePriority(i)}
                >
                  ✕
                </button>
              </div>

              {/* ─── Feedback Insights for this Priority ─── */}
              {empFeedback.length > 0 && p.text.trim() && (
                <div style={{
                  padding: 12, borderRadius: 8, background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`, marginBottom: 14, fontSize: 13,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {hasRelevant ? "📊 Related Feedback" : "📊 General Feedback"}
                    </div>
                    {(srcAvgWhat > 0 || srcAvgHow > 0) && (
                      <div style={{
                        display: "flex", gap: 10, alignItems: "center",
                        padding: "4px 10px", borderRadius: 6, background: COLORS.surfaceAlt,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {srcAvgWhat > 0 && (
                          <span>
                            <span style={{ color: COLORS.textMuted }}>Avg What: </span>
                            <span style={{ color: ratingColor(Math.round(srcAvgWhat)), fontWeight: 700 }}>{srcAvgWhat.toFixed(1)}/3</span>
                          </span>
                        )}
                        {srcAvgHow > 0 && (
                          <span>
                            <span style={{ color: COLORS.textMuted }}>Avg How: </span>
                            <span style={{ color: ratingColor(Math.round(srcAvgHow)), fontWeight: 700 }}>{srcAvgHow.toFixed(1)}/3</span>
                          </span>
                        )}
                        <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
                          ({srcWithWhat.length} reviewer{srcWithWhat.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                    )}
                  </div>

                  {hasRelevant ? (
                    <>
                      {relevantStrengths.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          {relevantStrengths.map((item, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                              <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
                              <span style={{ color: COLORS.text, lineHeight: 1.4 }}>
                                {item.text}
                                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 6 }}>
                                  — {item.reviewer} ({item.rel})
                                  {(item.rw > 0 || item.rh > 0) && (
                                    <span style={{ marginLeft: 4 }}>
                                      [W:{item.rw || "–"} H:{item.rh || "–"}]
                                    </span>
                                  )}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {relevantImprovements.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          {relevantImprovements.map((item, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                              <span style={{ color: COLORS.warm, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>△</span>
                              <span style={{ color: COLORS.text, lineHeight: 1.4 }}>
                                {item.text}
                                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 6 }}>
                                  — {item.reviewer} ({item.rel})
                                  {(item.rw > 0 || item.rh > 0) && (
                                    <span style={{ marginLeft: 4 }}>
                                      [W:{item.rw || "–"} H:{item.rh || "–"}]
                                    </span>
                                  )}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {relevantOverall.length > 0 && (
                        <div>
                          {relevantOverall.map((item, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                              <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>●</span>
                              <span style={{ color: COLORS.text, lineHeight: 1.4 }}>
                                {item.text}
                                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 6 }}>
                                  — {item.reviewer} ({item.rel})
                                  {(item.rw > 0 || item.rh > 0) && (
                                    <span style={{ marginLeft: 4 }}>
                                      [W:{item.rw || "–"} H:{item.rh || "–"}]
                                    </span>
                                  )}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {allStrengths.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.accent }}>Strengths: </span>
                          {allStrengths.map((item, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 3, marginLeft: 2 }}>
                              <span style={{ color: COLORS.accent, fontSize: 11, flexShrink: 0 }}>✓</span>
                              <span style={{ color: COLORS.text, lineHeight: 1.4 }}>
                                {item.text}
                                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 6 }}>
                                  — {item.reviewer}
                                  {(item.rw > 0 || item.rh > 0) && (
                                    <span style={{ marginLeft: 4 }}>[W:{item.rw || "–"} H:{item.rh || "–"}]</span>
                                  )}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {allImprovements.length > 0 && (
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.warm }}>Growth areas: </span>
                          {allImprovements.map((item, si) => (
                            <div key={si} style={{ display: "flex", gap: 6, marginBottom: 3, marginLeft: 2 }}>
                              <span style={{ color: COLORS.warm, fontSize: 11, flexShrink: 0 }}>△</span>
                              <span style={{ color: COLORS.text, lineHeight: 1.4 }}>
                                {item.text}
                                <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 6 }}>
                                  — {item.reviewer}
                                  {(item.rw > 0 || item.rh > 0) && (
                                    <span style={{ marginLeft: 4 }}>[W:{item.rw || "–"} H:{item.rh || "–"}]</span>
                                  )}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div style={styles.grid2}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8 }}>What Was Accomplished</div>
                  <StarRating value={p.ratingWhat} onChange={(v) => updatePriority(i, "ratingWhat", v)} max={3} size={24} />
                  <div style={{ fontSize: 11, color: ratingColor(p.ratingWhat), marginTop: 4, fontWeight: 500 }}>
                    {p.ratingWhat === 0 ? "Select 1–3" : ratingLabel(p.ratingWhat)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8 }}>How It Was Accomplished</div>
                  <StarRating value={p.ratingHow} onChange={(v) => updatePriority(i, "ratingHow", v)} max={3} size={24} />
                  <div style={{ fontSize: 11, color: ratingColor(p.ratingHow), marginTop: 4, fontWeight: 500 }}>
                    {p.ratingHow === 0 ? "Select 1–3" : ratingLabel(p.ratingHow)}
                  </div>
                </div>
              </div>
            </div>
            );
          })}

          {/* Overall Summary */}
          <div
            style={{
              marginTop: 16,
              padding: 20,
              borderRadius: 10,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Assessment Summary — {ratedPriorities.length} of {priorities.filter((p) => p.text).length} priorities rated
            </div>
            <div style={styles.grid2}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Avg. What</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'DM Serif Display', serif", color: ratingColor(Math.round(avgWhat)) }}>
                      {avgWhat > 0 ? avgWhat.toFixed(1) : "—"}
                    </span>
                    <span style={{ fontSize: 14, color: COLORS.textMuted }}>/3</span>
                  </div>
                  <div style={{ fontSize: 11, color: ratingColor(Math.round(avgWhat)), fontWeight: 500 }}>
                    {avgWhat > 0 ? ratingLabel(Math.round(avgWhat)) : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Avg. How</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'DM Serif Display', serif", color: ratingColor(Math.round(avgHow)) }}>
                      {avgHow > 0 ? avgHow.toFixed(1) : "—"}
                    </span>
                    <span style={{ fontSize: 14, color: COLORS.textMuted }}>/3</span>
                  </div>
                  <div style={{ fontSize: 11, color: ratingColor(Math.round(avgHow)), fontWeight: 500 }}>
                    {avgHow > 0 ? ratingLabel(Math.round(avgHow)) : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            {saved && <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 500 }}>✓ Assessment saved</span>}
            <button
              style={{ ...styles.btnPrimary, opacity: !selectedEmployee || ratedPriorities.length === 0 ? 0.5 : 1 }}
              onClick={handleSave}
              disabled={!selectedEmployee || ratedPriorities.length === 0}
            >
              Save Assessment
            </button>
          </div>
        </div>
        );
      })()}

      {/* ─── Previous Assessments ─── */}
      {data.assessments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ ...styles.sectionTitle, fontSize: 18 }}>Previous Assessments</h3>
          {data.assessments
            .slice()
            .reverse()
            .map((a) => (
              <div key={a.id} style={{ ...styles.card, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{a.employee}</span>
                    {a.jobTitle && <span style={{ color: COLORS.textMuted, marginLeft: 8, fontSize: 13 }}>({a.jobTitle})</span>}
                    <span style={{ color: COLORS.textMuted, marginLeft: 10, fontSize: 13 }}>
                      {new Date(a.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right", fontSize: 12 }}>
                      <span style={{ color: COLORS.textMuted }}>What: </span>
                      <span style={{ fontWeight: 700, color: ratingColor(Math.round(a.avgWhat || 0)) }}>
                        {(a.avgWhat || 0).toFixed(1)}
                      </span>
                      <span style={{ color: COLORS.textMuted, margin: "0 6px" }}>·</span>
                      <span style={{ color: COLORS.textMuted }}>How: </span>
                      <span style={{ fontWeight: 700, color: ratingColor(Math.round(a.avgHow || 0)) }}>
                        {(a.avgHow || 0).toFixed(1)}
                      </span>
                    </div>
                    <button style={styles.btnDanger} onClick={() => deleteAssessment(a.id)}>Remove</button>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {a.priorities
                    .filter((p) => p.text)
                    .map((p, i) => (
                      <span key={i} style={{
                        ...styles.tag(COLORS.text, COLORS.surfaceAlt),
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}>
                        {p.text}
                        <span style={{ fontSize: 10, color: COLORS.textMuted }}>
                          W:{p.ratingWhat || "–"} H:{p.ratingHow || "–"}
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Generate Feedback ───
function GenerateTab({ data, generatedReviews, setGeneratedReviews, sharedCompanyValues, setSharedCompanyValues, sharedExtractedValues, setSharedExtractedValues }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [tone, setTone] = useState("constructive");
  const companyValues = sharedCompanyValues;
  const setCompanyValues = setSharedCompanyValues;
  const [employeeReview, setEmployeeReview] = useState("");
  const [managerGuide, setManagerGuide] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeOutput, setActiveOutput] = useState("review");

  // RAG: Values document upload
  const [valuesInputMode, setValuesInputMode] = useState("text"); // "text" or "document"
  const [valuesAttachments, setValuesAttachments] = useState([]);
  const extractedValues = sharedExtractedValues;
  const setExtractedValues = setSharedExtractedValues;
  const [extractingValues, setExtractingValues] = useState(false);
  const [extractValuesProgress, setExtractValuesProgress] = useState("");
  const [extractValuesError, setExtractValuesError] = useState("");
  const valuesFileRef = useRef(null);

  const VALUES_EXTENSIONS = ".pdf,.docx,.doc,.txt,.json,.mp3,.wav,.m4a,.webm,.ogg";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const isAudioVal = (file) => file.type?.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg)$/i.test(file.name);

  const formatValSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleValuesFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) { alert(`"${file.name}" exceeds 10MB.`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const ext = file.name.split(".").pop().toUpperCase();
        setValuesAttachments((prev) => [...prev, {
          id: Date.now() + Math.random(), name: file.name, type: ext,
          size: file.size, data: reader.result, isAudio: isAudioVal(file), mimeType: file.type,
        }]);
      };
      if (file.type === "text/plain" || file.type === "application/json") reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
    if (valuesFileRef.current) valuesFileRef.current.value = "";
  };

  const removeValuesAttachment = (id) => setValuesAttachments((prev) => prev.filter((a) => a.id !== id));

  const extractValuesFromDocs = async () => {
    if (valuesAttachments.length === 0) return;
    setExtractingValues(true);
    setExtractValuesError("");
    setExtractValuesProgress("Reading documents…");

    try {
      let messageContent = [];
      for (const att of valuesAttachments) {
        const isText = typeof att.data === "string" && !att.data.startsWith("data:");
        const isDocx = isDocxName(att.name);
        if (isDocx && !isText) {
          const docxText = await extractDocxText(att.data);
          messageContent.push({ type: "text", text: `Document "${att.name}":\n${docxText}` });
        } else if (isText) {
          messageContent.push({ type: "text", text: `File "${att.name}":\n${att.data}` });
        } else if (att.isAudio) {
          const base64 = att.data.split(",")[1];
          const mediaMap = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", webm: "audio/webm", ogg: "audio/ogg" };
          const ext = att.name.split(".").pop().toLowerCase();
          messageContent.push(
            { type: "text", text: `Audio "${att.name}" — transcribe and extract values:` },
            { type: "document", source: { type: "base64", media_type: mediaMap[ext] || att.mimeType || "audio/mpeg", data: base64 } },
          );
        } else {
          const base64 = att.data.split(",")[1];
          messageContent.push(
            { type: "text", text: `Document "${att.name}":` },
            { type: "document", source: { type: "base64", media_type: att.mimeType || "application/pdf", data: base64 } },
          );
        }
      }

      messageContent.push({
        type: "text",
        text: `From the above documents, extract ALL company values, ethical standards, behavioral expectations, cultural principles, and leadership competencies.

Format your response as a structured summary with:
1. CORE VALUES — the named values with brief descriptions
2. BEHAVIORAL STANDARDS — expected behaviors and ethical guidelines
3. LEADERSHIP COMPETENCIES — if mentioned, the leadership expectations
4. KEY PHRASES — important language or terminology the company uses

Be thorough. This will be used to align performance reviews with the company's culture. Return plain text, not JSON.`,
      });

      setExtractValuesProgress("Extracting values with AI…");

      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{ role: "user", content: messageContent }],
        }),
      }, 3, (msg) => setExtractValuesProgress(msg));

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      setExtractedValues(text.trim());
      setExtractValuesProgress("");
    } catch (err) {
      console.error("Values extraction error:", err);
      setExtractValuesError(err.message || "Failed to extract values.");
      setExtractValuesProgress("");
    } finally {
      setExtractingValues(false);
    }
  };

  const uniqueEmployees = [...new Set(data.feedback.map((f) => f.employeeName))];

  const generateFeedback = async () => {
    if (!selectedEmployee) return;
    setLoading(true);
    setEmployeeReview("");
    setManagerGuide("");

    const empFeedback = data.feedback.filter((f) => f.employeeName === selectedEmployee);
    const empAssessments = data.assessments.filter((a) => a.employee === selectedEmployee);

    const avgWhat = empFeedback.length > 0
      ? (empFeedback.reduce((s, f) => s + (f.ratingWhat || 0), 0) / empFeedback.length).toFixed(1)
      : "N/A";
    const avgHow = empFeedback.length > 0
      ? (empFeedback.reduce((s, f) => s + (f.ratingHow || 0), 0) / empFeedback.length).toFixed(1)
      : "N/A";

    const strengths = empFeedback.map((f) => f.strengths).filter(Boolean);
    const improvements = empFeedback.map((f) => f.improvements).filter(Boolean);
    const overallComments = empFeedback.map((f) => f.overallFeedback).filter(Boolean);
    const latestAssessment = empAssessments.length > 0 ? empAssessments[empAssessments.length - 1] : null;

    const feedbackSummary = `
Employee: ${selectedEmployee}
Feedback count: ${empFeedback.length}
Average "What Was Accomplished" rating: ${avgWhat}/3
Average "How It Was Accomplished" rating: ${avgHow}/3
${latestAssessment ? `Latest assessment — Avg What: ${(latestAssessment.avgWhat || 0).toFixed(1)}/3, Avg How: ${(latestAssessment.avgHow || 0).toFixed(1)}/3${latestAssessment.jobTitle ? `, Role: ${latestAssessment.jobTitle}` : ""}` : ""}

Feedback sources:
${empFeedback.map((f) => `- From ${f.reviewerName} (${f.relationship}): What=${f.ratingWhat}/3, How=${f.ratingHow}/3`).join("\n")}

Strengths noted:
${strengths.length > 0 ? strengths.map((s) => `- ${s}`).join("\n") : "- None provided"}

Areas for improvement:
${improvements.length > 0 ? improvements.map((s) => `- ${s}`).join("\n") : "- None provided"}

Overall feedback comments:
${overallComments.length > 0 ? overallComments.map((s) => `- ${s}`).join("\n") : "- None provided"}

${latestAssessment ? `Priority performance (each rated on 1-3 scale: 1=Below, 2=Meets, 3=Exceeds):\n${latestAssessment.priorities.filter((p) => p.text).map((p) => `- ${p.text}: What=${p.ratingWhat || "–"}/3, How=${p.ratingHow || "–"}/3`).join("\n")}` : ""}
`.trim();

    const allValues = [companyValues.trim(), extractedValues.trim()].filter(Boolean).join("\n\n");
    const valuesContext = allValues
      ? `\n\nCompany values and ethical standards to align the review with:\n${allValues}`
      : "\n\nNo specific company values provided — use general professional ethical standards: fairness, respect, transparency, growth-oriented language, and constructive framing.";

    const toneGuides = {
      constructive: "balanced, encouraging but honest — acknowledge achievements before addressing growth areas",
      direct: "straightforward and action-oriented — clear expectations, no ambiguity",
      supportive: "warm, empathetic, and growth-focused — emphasize potential and development",
      formal: "professional, structured, and diplomatic — suitable for official records",
    };

    try {
      const apiBody = JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `You are an HR performance management expert. Based on the following data, generate TWO separate documents. Return ONLY a JSON object (no markdown, no backticks) with two keys: "employeeReview" and "managerGuide".

TONE: ${tone} — ${toneGuides[tone]}
${valuesContext}

EMPLOYEE DATA:
${feedbackSummary}

Document 1 — "employeeReview":
A polished performance review written TO the employee. This is a formal document the employee will read. It must:
- Be written in second person ("you")
- SYNTHESIZE the feedback into original, cohesive narrative — do NOT copy/paste or repeat verbatim quotes from the feedback inputs
- Draw insights and themes from the data rather than listing individual reviewer comments
- Open with recognition of contributions before addressing any gaps
- Align feedback with company values and ethical standards
- Frame improvement areas as growth opportunities, not criticisms
- Include a "What Was Accomplished" section and a "How It Was Accomplished" section reflecting the two rating dimensions
- End with clear, actionable next steps and development goals
- Be professional, fair, respectful, and motivating
- Use the selected tone throughout

Document 2 — "managerGuide":
A CONFIDENTIAL discussion guide for the manager only (NOT for the employee). It must:
- SYNTHESIZE patterns and themes rather than listing raw feedback verbatim
- Provide talking points organized by topic for the performance conversation
- Flag sensitive areas that need careful framing and suggest specific language
- Include potential employee reactions and how to handle them
- Suggest probing questions the manager can ask to deepen the conversation
- Highlight any inconsistencies or patterns across feedback sources
- Provide coaching tips for delivering difficult feedback effectively
- Include a suggested conversation flow / agenda with time estimates
- Note follow-up actions the manager should take after the meeting
- Be candid and direct — this is the manager's private prep document

Return as: {"employeeReview": "...", "managerGuide": "..."}`,
          }],
        });

      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: apiBody,
      }, 3, (msg) => {});

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const parsed = safeParseJSON(text);

      setEmployeeReview(parsed.employeeReview || "No review generated.");
      setManagerGuide(parsed.managerGuide || "No guide generated.");
      setGeneratedReviews((prev) => ({ ...prev, [selectedEmployee]: { review: parsed.employeeReview || "", guide: parsed.managerGuide || "" } }));
      setActiveOutput("review");
    } catch (err) {
      console.error("Generate error:", err);
      // Fallback to local generation
      const fallbackReview = buildLocalReview(selectedEmployee, empFeedback, strengths, improvements, overallComments, latestAssessment, avgWhat, avgHow, tone);
      const fallbackGuide = buildLocalGuide(selectedEmployee, empFeedback, strengths, improvements, overallComments, latestAssessment, avgWhat, avgHow);
      setEmployeeReview(fallbackReview);
      setManagerGuide(fallbackGuide);
      setGeneratedReviews((prev) => ({ ...prev, [selectedEmployee]: { review: fallbackReview, guide: fallbackGuide } }));
      setActiveOutput("review");
    } finally {
      setLoading(false);
    }
  };

  // Local fallbacks
  const buildLocalReview = (name, fb, str, imp, overall, assess, avgW, avgH, tn) => {
    let t = "";
    t += `PERFORMANCE REVIEW — ${name.toUpperCase()}\n`;
    t += `Date: ${new Date().toLocaleDateString()}\n`;
    t += `${"─".repeat(50)}\n\n`;
    t += `Dear ${name},\n\n`;
    t += `This review is based on ${fb.length} feedback submission(s) from peers, managers, and self-assessments.\n\n`;
    t += `WHAT WAS ACCOMPLISHED (${avgW}/3)\n`;
    t += `Your results and deliverables have been evaluated across multiple perspectives.\n`;
    if (str.length > 0) { t += `\nKey achievements and strengths:\n`; str.forEach((s) => { t += `• ${s}\n`; }); }
    t += `\nHOW IT WAS ACCOMPLISHED (${avgH}/3)\n`;
    t += `Your approach, collaboration, and alignment with our values have been noted.\n`;
    if (imp.length > 0) { t += `\nGrowth opportunities:\n`; imp.forEach((s) => { t += `• ${s}\n`; }); }
    if (overall.length > 0) { t += `\nAdditional feedback:\n`; overall.forEach((s) => { t += `• ${s}\n`; }); }
    if (assess) { t += `\nAssessment — Avg What: ${(assess.avgWhat || 0).toFixed(1)}/3, Avg How: ${(assess.avgHow || 0).toFixed(1)}/3\n`; }
    t += `\nNEXT STEPS\n`;
    t += `1. Continue building on identified strengths\n`;
    t += `2. Focus on development in growth areas with specific goals\n`;
    t += `3. Check in with your manager within 30 days\n`;
    return t;
  };

  const buildLocalGuide = (name, fb, str, imp, overall, assess, avgW, avgH) => {
    let t = "";
    t += `MANAGER DISCUSSION GUIDE — ${name.toUpperCase()}\n`;
    t += `CONFIDENTIAL — Not for employee distribution\n`;
    t += `${"─".repeat(50)}\n\n`;
    t += `PREPARATION NOTES\n`;
    t += `• ${fb.length} feedback sources reviewed\n`;
    t += `• Feedback avg — What: ${avgW}/3 | How: ${avgH}/3\n`;
    if (assess) { t += `• Assessment avg — What: ${(assess.avgWhat || 0).toFixed(1)}/3 | How: ${(assess.avgHow || 0).toFixed(1)}/3\n`; }
    t += `\nSUGGESTED CONVERSATION FLOW\n`;
    t += `1. Opening (5 min) — Set a positive tone, state purpose\n`;
    t += `2. Strengths discussion (10 min) — Lead with wins\n`;
    t += `3. Growth areas (10 min) — Frame constructively\n`;
    t += `4. Goal setting (10 min) — Collaborate on next steps\n`;
    t += `5. Close (5 min) — Confirm alignment, schedule follow-up\n`;
    if (str.length > 0) { t += `\nSTRENGTHS TO HIGHLIGHT\n`; str.forEach((s) => { t += `• ${s}\n`; }); }
    if (imp.length > 0) { t += `\nSENSITIVE AREAS — Handle carefully\n`; imp.forEach((s) => { t += `• ${s}\n  → Suggest framing: "One area where I'd love to see you grow is…"\n`; }); }
    t += `\nPROBING QUESTIONS\n`;
    t += `• "What accomplishment are you most proud of this period?"\n`;
    t += `• "Where do you feel you need more support?"\n`;
    t += `• "What would you like to focus on in the next quarter?"\n`;
    t += `\nFOLLOW-UP ACTIONS\n`;
    t += `• Document agreed-upon goals within 48 hours\n`;
    t += `• Schedule 30-day check-in\n`;
    t += `• Share finalized review document with employee\n`;
    return t;
  };

  const copyText = (text) => { navigator.clipboard.writeText(text).catch(() => {}); };

  const preStyle = {
    fontFamily: "'DM Sans', monospace",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    background: COLORS.surfaceAlt,
    padding: 20,
    borderRadius: 10,
    color: COLORS.text,
    margin: 0,
    border: `1px solid ${COLORS.border}`,
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>Generate Feedback</h2>
      <p style={styles.sectionSub}>
        Produce an employee-facing performance review and a confidential manager discussion guide.
      </p>

      <div style={styles.card}>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Employee</label>
            {uniqueEmployees.length > 0 ? (
              <select
                style={{ ...styles.input, cursor: "pointer" }}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">Select employee…</option>
                {uniqueEmployees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <div style={{ padding: 12, borderRadius: 8, background: COLORS.warmLight, fontSize: 14, color: COLORS.warm }}>
                Collect feedback first to see employees here.
              </div>
            )}
          </div>
          <div>
            <label style={styles.label}>Tone</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["constructive", "direct", "supportive", "formal"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    ...styles.btnSecondary,
                    padding: "8px 14px",
                    fontSize: 13,
                    textTransform: "capitalize",
                    background: tone === t ? COLORS.accentLight : COLORS.surface,
                    borderColor: tone === t ? COLORS.accent : COLORS.border,
                    color: tone === t ? COLORS.accent : COLORS.text,
                    fontWeight: tone === t ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={styles.label}>Company Values & Ethical Standards</label>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            <button
              onClick={() => setValuesInputMode("text")}
              style={{
                ...styles.btnSecondary, flex: 1,
                background: valuesInputMode === "text" ? COLORS.accentLight : COLORS.surface,
                borderColor: valuesInputMode === "text" ? COLORS.accent : COLORS.border,
                color: valuesInputMode === "text" ? COLORS.accent : COLORS.textMuted,
                fontWeight: valuesInputMode === "text" ? 600 : 400,
              }}
            >
              ✏️ Type Values
            </button>
            <button
              onClick={() => setValuesInputMode("document")}
              style={{
                ...styles.btnSecondary, flex: 1,
                background: valuesInputMode === "document" ? COLORS.accentLight : COLORS.surface,
                borderColor: valuesInputMode === "document" ? COLORS.accent : COLORS.border,
                color: valuesInputMode === "document" ? COLORS.accent : COLORS.textMuted,
                fontWeight: valuesInputMode === "document" ? 600 : 400,
              }}
            >
              📄 Upload Values Doc
            </button>
          </div>

          {valuesInputMode === "text" && (
            <textarea
              style={{ ...styles.textarea, minHeight: 70 }}
              placeholder="e.g., Integrity, Innovation, Customer First, Collaboration, Accountability… The review will be aligned to these values."
              value={companyValues}
              onChange={(e) => setCompanyValues(e.target.value)}
            />
          )}

          {valuesInputMode === "document" && (
            <div>
              <div
                style={{
                  border: `2px dashed ${COLORS.border}`, borderRadius: 10, padding: 16,
                  textAlign: "center", cursor: "pointer", background: COLORS.surfaceAlt,
                }}
                onClick={() => valuesFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.accent; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = COLORS.border;
                  if (e.dataTransfer.files.length) handleValuesFileSelect({ target: { files: e.dataTransfer.files } });
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>📜</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>Upload employee handbook, values doc, code of conduct, or culture guide</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>PDF, Word, TXT, JSON, or Audio — up to 10MB</div>
                <input ref={valuesFileRef} type="file" accept={VALUES_EXTENSIONS} multiple style={{ display: "none" }} onChange={handleValuesFileSelect} />
              </div>

              {valuesAttachments.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {valuesAttachments.map((att) => (
                    <div key={att.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{
                          ...styles.tag(att.isAudio ? COLORS.warm : COLORS.accent, att.isAudio ? COLORS.warmLight : COLORS.accentLight),
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>
                          {att.isAudio ? "🎤 " : ""}{att.type}
                        </span>
                        <span style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>{formatValSize(att.size)}</span>
                      </div>
                      <button style={styles.btnDanger} onClick={() => removeValuesAttachment(att.id)}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      style={{
                        ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                        opacity: extractingValues ? 0.6 : 1,
                      }}
                      onClick={extractValuesFromDocs}
                      disabled={extractingValues}
                    >
                      {extractingValues ? (
                        <>
                          <span style={{
                            display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                            borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite",
                          }} />
                          {extractValuesProgress}
                        </>
                      ) : "Extract Values & Standards"}
                    </button>
                  </div>
                </div>
              )}

              {extractValuesError && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: COLORS.dangerLight, color: COLORS.danger, fontSize: 13 }}>
                  {extractValuesError}
                </div>
              )}
            </div>
          )}

          {/* ─── Extracted Values Preview ─── */}
          {extractedValues && (
            <div style={{
              marginTop: 12, padding: 16, borderRadius: 10,
              background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  ✓ Extracted Company Values
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{ ...styles.btnSecondary, fontSize: 11, padding: "4px 10px" }}
                    onClick={() => { navigator.clipboard.writeText(extractedValues).catch(() => {}); }}
                  >
                    Copy
                  </button>
                  <button
                    style={{ ...styles.btnDanger, fontSize: 11 }}
                    onClick={() => setExtractedValues("")}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <pre style={{
                fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap",
                color: COLORS.text, margin: 0, maxHeight: 200, overflow: "auto",
              }}>
                {extractedValues}
              </pre>
            </div>
          )}

          {/* Optional: also type additional values when using document mode */}
          {valuesInputMode === "document" && (
            <div style={{ marginTop: 10 }}>
              <textarea
                style={{ ...styles.textarea, minHeight: 50 }}
                placeholder="Optionally add or override values here (combined with extracted values)…"
                value={companyValues}
                onChange={(e) => setCompanyValues(e.target.value)}
              />
            </div>
          )}
        </div>

        {selectedEmployee && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: COLORS.surfaceAlt, fontSize: 13 }}>
            <strong>Data available:</strong>{" "}
            {data.feedback.filter((f) => f.employeeName === selectedEmployee).length} feedback entries,{" "}
            {data.assessments.filter((a) => a.employee === selectedEmployee).length} assessments
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{
              ...styles.btnPrimary,
              opacity: !selectedEmployee || loading ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 8,
            }}
            onClick={generateFeedback}
            disabled={!selectedEmployee || loading}
          >
            {loading ? (
              <>
                <span style={{
                  display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                Generating with AI…
              </>
            ) : "Generate Performance Review and Manager Guide"}
          </button>
        </div>
      </div>

      {/* ─── Output Tabs ─── */}
      {(employeeReview || managerGuide) && (
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 0 }}>
            <button
              onClick={() => setActiveOutput("review")}
              style={{
                padding: "12px 20px",
                borderRadius: "10px 10px 0 0",
                border: `1px solid ${COLORS.border}`,
                borderBottom: activeOutput === "review" ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                background: activeOutput === "review" ? COLORS.surface : COLORS.surfaceAlt,
                color: activeOutput === "review" ? COLORS.accent : COLORS.textMuted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: activeOutput === "review" ? 700 : 500,
                cursor: "pointer",
              }}
            >
              📄 Employee Review
            </button>
            <button
              onClick={() => setActiveOutput("guide")}
              style={{
                padding: "12px 20px",
                borderRadius: "10px 10px 0 0",
                border: `1px solid ${COLORS.border}`,
                borderBottom: activeOutput === "guide" ? `2px solid ${COLORS.warm}` : `1px solid ${COLORS.border}`,
                background: activeOutput === "guide" ? COLORS.surface : COLORS.surfaceAlt,
                color: activeOutput === "guide" ? COLORS.warm : COLORS.textMuted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: activeOutput === "guide" ? 700 : 500,
                cursor: "pointer",
              }}
            >
              🔒 Manager Guide
            </button>
          </div>

          {activeOutput === "review" && employeeReview && (
            <div style={{ ...styles.card, borderRadius: "0 10px 14px 14px", borderTop: `2px solid ${COLORS.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Performance Review</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 10 }}>For employee</span>
                </div>
                <button style={styles.btnSecondary} onClick={() => copyText(employeeReview)}>📋 Copy</button>
              </div>
              <pre style={preStyle}>{employeeReview}</pre>
            </div>
          )}

          {activeOutput === "guide" && managerGuide && (
            <div style={{ ...styles.card, borderRadius: "0 10px 14px 14px", borderTop: `2px solid ${COLORS.warm}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Manager Discussion Guide</span>
                  <span style={{ fontSize: 12, color: COLORS.danger, marginLeft: 10, fontWeight: 600 }}>🔒 CONFIDENTIAL</span>
                </div>
                <button style={styles.btnSecondary} onClick={() => copyText(managerGuide)}>📋 Copy</button>
              </div>
              <pre style={preStyle}>{managerGuide}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: HR Quality Check (LLM-as-a-Judge) ───
function QualityCheckTab({ data, generatedReviews, sharedCompanyValues, sharedExtractedValues }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [judging, setJudging] = useState(false);
  const [judgeProgress, setJudgeProgress] = useState("");
  const [results, setResults] = useState(null);

  const uniqueEmployees = [...new Set(data.feedback.map((f) => f.employeeName))];

  // Auto-populate from shared Generate tab state
  const genData = selectedEmployee && generatedReviews[selectedEmployee] ? generatedReviews[selectedEmployee] : null;
  const employeeReview = genData?.review || "";
  const managerGuide = genData?.guide || "";
  const allValues = [sharedCompanyValues || "", sharedExtractedValues || ""].filter(Boolean).join("\n\n");

  // ─── Run Quality Check ───
  const runQualityCheck = async () => {
    if (!employeeReview.trim() && !managerGuide.trim()) return;
    setJudging(true);
    setJudgeProgress("Preparing evaluation…");
    setResults(null);

    const empFeedback = selectedEmployee ? data.feedback.filter((f) => f.employeeName === selectedEmployee) : [];
    const empAssessments = selectedEmployee ? data.assessments.filter((a) => a.employee === selectedEmployee) : [];
    const latestAssessment = empAssessments.length > 0 ? empAssessments[empAssessments.length - 1] : null;

    const prioritiesList = latestAssessment
      ? latestAssessment.priorities.filter((p) => p.text).map((p) => `- ${p.text} (What: ${p.ratingWhat || "–"}/3, How: ${p.ratingHow || "–"}/3)`).join("\n")
      : "(No priorities defined)";

    const valuesSection = allValues || "(No company values provided — evaluate against general professional ethical standards)";

    try {
      setJudgeProgress("Running HR Quality Check…");

      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `You are an HR Quality Assurance judge. Your job is to evaluate performance review documents for quality, completeness, and compliance.

You must perform TWO evaluations and return a JSON object (no markdown, no backticks).

═══════════════════════════════════════
EVALUATION 1: PRIORITY ALIGNMENT CHECK
═══════════════════════════════════════
Assess whether the review documents adequately evaluate the employee against their specific priorities/goals.
Also check if any priorities are vaguely defined or unmeasurable — flag these as quality issues.

Employee priorities:
${prioritiesList}

Employee feedback data:
- ${empFeedback.length} feedback entries collected
${empFeedback.map((f) => `- ${f.reviewerName} (${f.relationship}): What=${f.ratingWhat}/3, How=${f.ratingHow}/3`).join("\n")}

═══════════════════════════════════════
EVALUATION 2: VALUES & TONE COMPLIANCE
═══════════════════════════════════════
Check the tone and language to ensure alignment with company values and ethical standards.

Company values and standards:
${valuesSection}

═══════════════════════════════════════
DOCUMENTS TO EVALUATE:
═══════════════════════════════════════

${employeeReview.trim() ? `--- EMPLOYEE REVIEW ---\n${employeeReview.trim()}\n` : ""}
${managerGuide.trim() ? `--- MANAGER GUIDE ---\n${managerGuide.trim()}\n` : ""}

═══════════════════════════════════════
RETURN FORMAT:
═══════════════════════════════════════

Return ONLY a JSON object with this structure:
{
  "priorityAlignment": {
    "score": 1-5 integer (1=poor, 5=excellent),
    "verdict": "Pass" | "Needs Revision" | "Fail",
    "summary": "2-3 sentence overall assessment",
    "prioritiesCovered": ["list of priorities that were adequately addressed"],
    "prioritiesMissing": ["list of priorities that were NOT addressed or insufficiently covered"],
    "specificFindings": [
      {"finding": "description", "severity": "high" | "medium" | "low", "recommendation": "what to fix"}
    ]
  },
  "valuesCompliance": {
    "score": 1-5 integer (1=poor, 5=excellent),
    "verdict": "Pass" | "Needs Revision" | "Fail",
    "summary": "2-3 sentence overall assessment",
    "toneAssessment": "description of the overall tone",
    "valuesAligned": ["list of values that are well-reflected"],
    "valuesGaps": ["list of values missing or poorly represented"],
    "ethicalConcerns": [
      {"concern": "description", "severity": "high" | "medium" | "low", "recommendation": "how to address"}
    ],
    "languageFlags": [
      {"phrase": "problematic text", "issue": "why it's problematic", "suggestion": "better alternative"}
    ]
  },
  "overallVerdict": "Pass" | "Needs Revision" | "Fail",
  "overallScore": 1-5 integer,
  "topRecommendations": ["top 3 most important actions to improve the review"]
}`,
          }],
        }),
      }, 3, (msg) => setJudgeProgress(msg));

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const parsed = safeParseJSON(text);
      setResults(parsed);
    } catch (err) {
      console.error("Quality check error:", err);
      alert("Quality check failed: " + (err.message || "Unknown error"));
    } finally {
      setJudging(false);
      setJudgeProgress("");
    }
  };

  const verdictColor = (v) => v === "Pass" ? COLORS.accent : v === "Fail" ? COLORS.danger : COLORS.warm;
  const severityColor = (s) => s === "high" ? COLORS.danger : s === "medium" ? COLORS.warm : COLORS.textMuted;
  const scoreBar = (score) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} style={{
            width: 24, height: 8, borderRadius: 4,
            background: s <= score ? (score >= 4 ? COLORS.accent : score >= 3 ? COLORS.gold : COLORS.warm) : COLORS.border,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: score >= 4 ? COLORS.accent : score >= 3 ? COLORS.gold : COLORS.warm }}>
        {score}/5
      </span>
    </div>
  );

  const hasReview = employeeReview.trim() || managerGuide.trim();

  return (
    <div>
      <h2 style={styles.sectionTitle}>HR Quality Check</h2>
      <p style={styles.sectionSub}>
        LLM-as-a-judge — validates priority alignment and values/tone compliance of generated reviews.
      </p>

      <div style={styles.card}>
        <label style={styles.label}>Select Employee</label>
        <select
          style={{ ...styles.input, cursor: "pointer" }}
          value={selectedEmployee}
          onChange={(e) => { setSelectedEmployee(e.target.value); setResults(null); }}
        >
          <option value="">Choose an employee…</option>
          {uniqueEmployees.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {selectedEmployee && !hasReview && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: COLORS.warmLight, fontSize: 13, color: COLORS.warm }}>
            No generated review found for {selectedEmployee}. Go to the Generate tab first to create a performance review and manager guide.
          </div>
        )}

        {selectedEmployee && hasReview && (
          <>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: COLORS.accentLight, border: `1px solid ${COLORS.accent}30` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>✓ DOCUMENTS LOADED FROM GENERATE TAB</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {employeeReview && (
                  <span style={styles.tag(COLORS.accent, COLORS.surfaceAlt)}>
                    📄 Employee Review ({employeeReview.length.toLocaleString()} chars)
                  </span>
                )}
                {managerGuide && (
                  <span style={styles.tag(COLORS.warm, COLORS.surfaceAlt)}>
                    🔒 Manager Guide ({managerGuide.length.toLocaleString()} chars)
                  </span>
                )}
              </div>
            </div>

            {allValues && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent }}>✓ COMPANY VALUES LOADED FROM GENERATE TAB</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, maxHeight: 60, overflow: "auto" }}>
                  {allValues.substring(0, 200)}{allValues.length > 200 ? "…" : ""}
                </div>
              </div>
            )}

            {!allValues && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: COLORS.warmLight, fontSize: 12, color: COLORS.warm }}>
                No company values defined. The check will use general ethical standards. Add values on the Generate tab for better compliance checking.
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{
                  ...styles.btnPrimary, display: "flex", alignItems: "center", gap: 8,
                  background: "#7C3AED", opacity: judging ? 0.5 : 1,
                }}
                onClick={runQualityCheck}
                disabled={judging}
              >
                {judging ? (
                  <>
                    <span style={{
                      display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite",
                    }} />
                    {judgeProgress}
                  </>
                ) : "⚖️ Run Quality Check"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── Results ─── */}
      {results && (
        <div>
          {/* Overall Verdict */}
          <div style={{
            ...styles.card,
            borderLeft: `4px solid ${verdictColor(results.overallVerdict)}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Overall Verdict</div>
              <div style={{
                fontSize: 24, fontWeight: 700, fontFamily: "'DM Serif Display', serif",
                color: verdictColor(results.overallVerdict), marginTop: 4,
              }}>
                {results.overallVerdict}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>Quality Score</div>
              {scoreBar(results.overallScore || 0)}
            </div>
          </div>

          {/* Top Recommendations */}
          {results.topRecommendations && results.topRecommendations.length > 0 && (
            <div style={{ ...styles.card, background: COLORS.surfaceAlt }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Top Recommendations
              </div>
              {results.topRecommendations.map((rec, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 14 }}>
                  <span style={{ color: COLORS.accent, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ color: COLORS.text, lineHeight: 1.5 }}>{rec}</span>
                </div>
              ))}
            </div>
          )}

          {/* Priority Alignment */}
          {results.priorityAlignment && (
            <div style={{ ...styles.card, borderLeft: `4px solid ${verdictColor(results.priorityAlignment.verdict)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Evaluation 1: Priority Alignment
                  </div>
                  <span style={{
                    ...styles.tag(verdictColor(results.priorityAlignment.verdict), COLORS.surfaceAlt),
                    marginTop: 6, display: "inline-block",
                  }}>
                    {results.priorityAlignment.verdict}
                  </span>
                </div>
                {scoreBar(results.priorityAlignment.score || 0)}
              </div>
              <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6, marginBottom: 14 }}>
                {results.priorityAlignment.summary}
              </p>

              {results.priorityAlignment.prioritiesCovered?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>✓ PRIORITIES COVERED</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {results.priorityAlignment.prioritiesCovered.map((p, i) => (
                      <span key={i} style={styles.tag(COLORS.accent, COLORS.accentLight)}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.priorityAlignment.prioritiesMissing?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.danger, marginBottom: 6 }}>✗ PRIORITIES MISSING</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {results.priorityAlignment.prioritiesMissing.map((p, i) => (
                      <span key={i} style={styles.tag(COLORS.danger, COLORS.dangerLight)}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.priorityAlignment.specificFindings?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginBottom: 6 }}>FINDINGS</div>
                  {results.priorityAlignment.specificFindings.map((f, i) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 8, background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, marginBottom: 6,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          ...styles.tag(severityColor(f.severity), COLORS.surfaceAlt),
                          fontSize: 10, textTransform: "uppercase",
                        }}>
                          {f.severity}
                        </span>
                        <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{f.finding}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 2 }}>💡 {f.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Values Compliance */}
          {results.valuesCompliance && (
            <div style={{ ...styles.card, borderLeft: `4px solid ${verdictColor(results.valuesCompliance.verdict)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Evaluation 2: Values & Tone Compliance
                  </div>
                  <span style={{
                    ...styles.tag(verdictColor(results.valuesCompliance.verdict), COLORS.surfaceAlt),
                    marginTop: 6, display: "inline-block",
                  }}>
                    {results.valuesCompliance.verdict}
                  </span>
                </div>
                {scoreBar(results.valuesCompliance.score || 0)}
              </div>
              <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6, marginBottom: 14 }}>
                {results.valuesCompliance.summary}
              </p>

              {results.valuesCompliance.toneAssessment && (
                <div style={{
                  padding: 10, borderRadius: 8, background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`, marginBottom: 12, fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: COLORS.textMuted, fontSize: 11 }}>TONE: </span>
                  <span style={{ color: COLORS.text }}>{results.valuesCompliance.toneAssessment}</span>
                </div>
              )}

              {results.valuesCompliance.valuesAligned?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>✓ VALUES WELL-REFLECTED</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {results.valuesCompliance.valuesAligned.map((v, i) => (
                      <span key={i} style={styles.tag(COLORS.accent, COLORS.accentLight)}>{v}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.valuesCompliance.valuesGaps?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.warm, marginBottom: 6 }}>△ VALUES GAPS</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {results.valuesCompliance.valuesGaps.map((v, i) => (
                      <span key={i} style={styles.tag(COLORS.warm, COLORS.warmLight)}>{v}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.valuesCompliance.ethicalConcerns?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.danger, marginBottom: 6 }}>⚠ ETHICAL CONCERNS</div>
                  {results.valuesCompliance.ethicalConcerns.map((c, i) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 8, background: COLORS.dangerLight,
                      border: `1px solid ${COLORS.danger}30`, marginBottom: 6,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ ...styles.tag(severityColor(c.severity), COLORS.surfaceAlt), fontSize: 10, textTransform: "uppercase" }}>{c.severity}</span>
                        <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{c.concern}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>💡 {c.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {results.valuesCompliance.languageFlags?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.warm, marginBottom: 6 }}>🔤 LANGUAGE FLAGS</div>
                  {results.valuesCompliance.languageFlags.map((lf, i) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 8, background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: COLORS.danger, fontWeight: 600 }}>"{lf.phrase}"</span>
                        <span style={{ color: COLORS.textMuted, marginLeft: 6 }}>— {lf.issue}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.accent }}>→ Suggestion: "{lf.suggestion}"</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ───
export default function PerformanceManager() {
  const [tab, setTab] = useState("feedback");
  const [data, setData] = useState({ employees: [], feedback: [], priorities: [], assessments: [] });

  // Shared state between Generate and Quality Check tabs
  const [generatedReviews, setGeneratedReviews] = useState({}); // { employeeName: { review, guide } }
  const [sharedCompanyValues, setSharedCompanyValues] = useState(""); // typed values
  const [sharedExtractedValues, setSharedExtractedValues] = useState(""); // RAG-extracted values

  useEffect(() => {
    setData(loadData());
  }, []);

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, textarea:focus, select:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 3px ${COLORS.accentLight}; }
        button:hover { filter: brightness(0.96); }
        ::selection { background: ${COLORS.accentLight}; }
      `}</style>
      <div style={styles.app}>
        <header style={styles.header}>
          <div style={styles.logo}>
            <span style={{ fontSize: 28 }}>◈</span>
            PerformanceHub
          </div>
          <nav style={styles.nav}>
            <button style={styles.navBtn(tab === "feedback")} onClick={() => setTab("feedback")}>
              Collect Feedback
            </button>
            <button style={styles.navBtn(tab === "assess")} onClick={() => setTab("assess")}>
              Assess
            </button>
            <button style={styles.navBtn(tab === "generate")} onClick={() => setTab("generate")}>
              Generate
            </button>
            <button style={styles.navBtn(tab === "quality")} onClick={() => setTab("quality")}>
              Quality Check
            </button>
          </nav>
        </header>
        <main style={styles.main}>
          <div style={styles.fadeIn} key={tab}>
            {tab === "feedback" && <FeedbackTab data={data} setData={setData} />}
            {tab === "assess" && <AssessTab data={data} setData={setData} />}
            {tab === "generate" && <GenerateTab data={data} generatedReviews={generatedReviews} setGeneratedReviews={setGeneratedReviews} sharedCompanyValues={sharedCompanyValues} setSharedCompanyValues={setSharedCompanyValues} sharedExtractedValues={sharedExtractedValues} setSharedExtractedValues={setSharedExtractedValues} />}
            {tab === "quality" && <QualityCheckTab data={data} generatedReviews={generatedReviews} sharedCompanyValues={sharedCompanyValues} sharedExtractedValues={sharedExtractedValues} />}
          </div>
        </main>
      </div>
    </>
  );
}
