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
    color: COLORS.text,
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
    color: COLORS.text,
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

  const handleSubmit = () => {
    if (!form.employeeName.trim() || !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0) return;
    const entry = {
      ...form,
      id: Date.now(),
      date: new Date().toISOString(),
      attachments: attachments.map((a) => ({ name: a.name, type: a.type, size: a.size, isAudio: a.isAudio || false })),
    };
    const next = { ...data, feedback: [...data.feedback, entry] };
    if (!data.employees.find((e) => e.name.toLowerCase() === form.employeeName.trim().toLowerCase())) {
      next.employees = [...next.employees, { name: form.employeeName.trim(), id: Date.now() }];
    }
    setData(next);
    saveData(next);
    setForm({ employeeName: "", reviewerName: "", relationship: "peer", strengths: "", improvements: "", overallFeedback: "", ratingWhat: 0, ratingHow: 0 });
    setAttachments([]);
    setShowForm(false);
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

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: messageContent }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No feedback entries found in the document.");

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
          <button style={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Feedback"}
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
        <div style={{ ...styles.card, borderLeft: `4px solid ${COLORS.accent}` }}>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>Employee Name</label>
              <input
                style={styles.input}
                placeholder="Who is being reviewed?"
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Reviewer Name</label>
              <input
                style={styles.input}
                placeholder="Who is giving feedback?"
                value={form.reviewerName}
                onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Relationship</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["peer", "manager", "direct", "self"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, relationship: r })}
                  style={{
                    ...styles.btnSecondary,
                    background: form.relationship === r ? COLORS.accentLight : COLORS.surface,
                    borderColor: form.relationship === r ? COLORS.accent : COLORS.border,
                    color: form.relationship === r ? COLORS.accent : COLORS.text,
                    fontWeight: form.relationship === r ? 600 : 400,
                  }}
                >
                  {relLabel[r]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Ratings</label>
            <div style={styles.grid2}>
              <div style={{ padding: 14, borderRadius: 8, background: COLORS.surfaceAlt }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>What Was Accomplished</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>Results, deliverables, and goal attainment</div>
                <StarRating value={form.ratingWhat} onChange={(v) => setForm({ ...form, ratingWhat: v })} max={3} size={26} />
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
                  {form.ratingWhat === 0 ? "Select 1–3" : form.ratingWhat === 1 ? "Below expectations" : form.ratingWhat === 2 ? "Meets expectations" : "Exceeds expectations"}
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 8, background: COLORS.surfaceAlt }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>How It Was Accomplished</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>Behaviors, collaboration, and values</div>
                <StarRating value={form.ratingHow} onChange={(v) => setForm({ ...form, ratingHow: v })} max={3} size={26} />
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
                  {form.ratingHow === 0 ? "Select 1–3" : form.ratingHow === 1 ? "Below expectations" : form.ratingHow === 2 ? "Meets expectations" : "Exceeds expectations"}
                </div>
              </div>
            </div>
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
            <label style={styles.label}>Overall Feedback</label>
            <textarea
              style={{ ...styles.textarea, minHeight: 100 }}
              placeholder="General observations, context, or additional comments about this employee's performance…"
              value={form.overallFeedback}
              onChange={(e) => setForm({ ...form, overallFeedback: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Attachments</label>
            <div
              style={{
                border: `2px dashed ${COLORS.border}`,
                borderRadius: 10,
                padding: 20,
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
                background: COLORS.surfaceAlt,
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = COLORS.accent; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = COLORS.border;
                const dt = e.dataTransfer;
                if (dt.files.length) handleFileSelect({ target: { files: dt.files } });
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>
                Click or drag files here
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                PDF, Word, TXT, JSON, or Audio (MP3, WAV, M4A) — up to 10MB
              </div>
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
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{
                        ...styles.tag(
                          att.isAudio ? COLORS.warm : COLORS.accent,
                          att.isAudio ? COLORS.warmLight : COLORS.accentLight
                        ),
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        flexShrink: 0,
                      }}>
                        {att.isAudio ? "🎤 " : ""}{att.type}
                      </span>
                      <span style={{ fontSize: 13, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {att.name}
                      </span>
                      <span style={{ fontSize: 11, color: COLORS.textMuted, flexShrink: 0 }}>
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <button
                      style={{ ...styles.btnDanger, flexShrink: 0 }}
                      onClick={() => removeAttachment(att.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button
              style={{
                ...styles.btnPrimary,
                opacity: !form.employeeName.trim() || !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0 ? 0.5 : 1,
              }}
              onClick={handleSubmit}
              disabled={!form.employeeName.trim() || !form.reviewerName.trim() || form.ratingWhat === 0 || form.ratingHow === 0}
            >
              Submit Feedback
            </button>
          </div>
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
              {fb.strengths && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent }}>STRENGTHS: </span>
                  <span style={{ fontSize: 14, color: COLORS.text }}>{fb.strengths}</span>
                </div>
              )}
              {fb.improvements && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.warm }}>GROWTH AREAS: </span>
                  <span style={{ fontSize: 14, color: COLORS.text }}>{fb.improvements}</span>
                </div>
              )}
              {fb.overallFeedback && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>OVERALL: </span>
                  <span style={{ fontSize: 14, color: COLORS.text }}>{fb.overallFeedback}</span>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date(fb.date).toLocaleDateString()}</span>
                {fb.attachments && fb.attachments.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {fb.attachments.map((att, ai) => (
                      <span
                        key={ai}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 6,
                          background: COLORS.surfaceAlt,
                          border: `1px solid ${COLORS.border}`,
                          fontSize: 11,
                          color: COLORS.textMuted,
                        }}
                      >
                        {att.isAudio ? "🎤" : "📎"} {att.name}
                      </span>
                    ))}
                  </div>
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
        text: `Extract specific, measurable performance priorities/goals/objectives for this employee based on the content above. ${titleContext ? `Consider what's most relevant to someone in the role of ${jobTitle.trim()}.` : ""}

Return ONLY a JSON array (no markdown, no backticks, no preamble) where each element has:
{
  "text": "Concise priority description",
  "ratingWhat": 0,
  "ratingHow": 0
}

Set ratingWhat and ratingHow to 0 (unrated). The manager will rate these manually.
Extract 3-8 priorities. Return a valid JSON array.`,
      });

      setExtractProgress("Extracting priorities with AI…");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: messageContent }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        setPriorities(parsed.map((p) => ({
          text: p.text || "",
          ratingWhat: 0,
          ratingHow: 0,
        })));
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
      {priorities.length > 0 && (
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>
              Rate Each Priority ({priorities.length})
            </label>
            <button style={styles.btnSecondary} onClick={addPriority}>+ Add Priority</button>
          </div>

          {priorities.map((p, i) => (
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
                  style={{ ...styles.input, flex: 1, fontWeight: 600, background: "transparent", border: "none", padding: "0", fontSize: 15 }}
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
          ))}

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
      )}

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
function GenerateTab({ data }) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [tone, setTone] = useState("constructive");
  const [companyValues, setCompanyValues] = useState("");
  const [employeeReview, setEmployeeReview] = useState("");
  const [managerGuide, setManagerGuide] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeOutput, setActiveOutput] = useState("review");

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

    const valuesContext = companyValues.trim()
      ? `\n\nCompany values and ethical standards to align the review with:\n${companyValues.trim()}`
      : "\n\nNo specific company values provided — use general professional ethical standards: fairness, respect, transparency, growth-oriented language, and constructive framing.";

    const toneGuides = {
      constructive: "balanced, encouraging but honest — acknowledge achievements before addressing growth areas",
      direct: "straightforward and action-oriented — clear expectations, no ambiguity",
      supportive: "warm, empathetic, and growth-focused — emphasize potential and development",
      formal: "professional, structured, and diplomatic — suitable for official records",
    };

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
- Open with recognition of contributions before addressing any gaps
- Align feedback with company values and ethical standards
- Frame improvement areas as growth opportunities, not criticisms
- Include specific examples drawn from the feedback data
- Include a "What Was Accomplished" section and a "How It Was Accomplished" section reflecting the two rating dimensions
- End with clear, actionable next steps and development goals
- Be professional, fair, respectful, and motivating
- Use the selected tone throughout

Document 2 — "managerGuide":
A CONFIDENTIAL discussion guide for the manager only (NOT for the employee). It must:
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
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      const text = result.content?.map((c) => c.text || "").join("") || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      setEmployeeReview(parsed.employeeReview || "No review generated.");
      setManagerGuide(parsed.managerGuide || "No guide generated.");
      setActiveOutput("review");
    } catch (err) {
      console.error("Generate error:", err);
      // Fallback to local generation
      setEmployeeReview(buildLocalReview(selectedEmployee, empFeedback, strengths, improvements, overallComments, latestAssessment, avgWhat, avgHow, tone));
      setManagerGuide(buildLocalGuide(selectedEmployee, empFeedback, strengths, improvements, overallComments, latestAssessment, avgWhat, avgHow));
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
          <label style={styles.label}>Company Values & Ethical Standards (optional)</label>
          <textarea
            style={{ ...styles.textarea, minHeight: 70 }}
            placeholder="e.g., Integrity, Innovation, Customer First, Collaboration, Accountability… The review will be aligned to these values."
            value={companyValues}
            onChange={(e) => setCompanyValues(e.target.value)}
          />
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
            ) : "Generate Both Documents"}
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

// ─── Main App ───
export default function PerformanceManager() {
  const [tab, setTab] = useState("feedback");
  const [data, setData] = useState({ employees: [], feedback: [], priorities: [], assessments: [] });

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
          </nav>
        </header>
        <main style={styles.main}>
          <div style={styles.fadeIn} key={tab}>
            {tab === "feedback" && <FeedbackTab data={data} setData={setData} />}
            {tab === "assess" && <AssessTab data={data} setData={setData} />}
            {tab === "generate" && <GenerateTab data={data} />}
          </div>
        </main>
      </div>
    </>
  );
}
