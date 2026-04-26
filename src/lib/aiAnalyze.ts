export type ResumeParseMode = "pdfText" | "plainText" | "image";

export interface ParsedResume {
  isResumeOrTranscript: boolean;
  suggestionTh: string;
  name: string;
  email: string;
  phone: string;
  faculty: string;
  major: string;
  skills: string[];
  education: Array<{ degree: string; field: string; institution: string }>;
  experience: Array<{ title: string; company: string; description: string }>;
  projects: Array<{ name: string; description: string; tech: string }>;
}

const EMPTY_PARSED_RESUME: ParsedResume = {
  isResumeOrTranscript: false,
  suggestionTh: "",
  name: "",
  email: "",
  phone: "",
  faculty: "",
  major: "",
  skills: [],
  education: [],
  experience: [],
  projects: [],
};

const SYSTEM_PROMPT = `You are a professional resume parser.
Your FIRST task is to determine whether the provided text or image is a Resume, CV, or Academic Transcript.
If the content is clearly NOT a Resume, CV, or Transcript (e.g. random image, unrelated text):
Return ONLY this strict JSON:
{
  "isResumeOrTranscript": false,
  "suggestionTh": "<Explain in politely Thai why it is not valid, and suggest them to upload a real resume or transcript>",
  "name": "", "email": "", "phone": "", "faculty": "", "major": "", "skills": [], "education": [], "experience": [], "projects": []
}

If the content IS a Resume, CV, or Transcript:
Extract the data and return ONLY strict JSON with this shape:
{
  "isResumeOrTranscript": true,
  "suggestionTh": "",
  "name": "",
  "email": "",
  "phone": "",
  "faculty": "<Extract faculty/department if found, else empty>",
  "major": "<Extract major/field of study if found, else empty>",
  "skills": [""],
  "education": [{"degree": "", "field": "", "institution": ""}],
  "experience": [{"title": "", "company": "", "description": ""}],
  "projects": [{"name": "", "description": "", "tech": ""}]
}

Rules:
- If a value is missing, use empty string or empty array.
- Tech in projects should be a comma-separated string (e.g. "React, Node.js").
- No markdown, no explanation, no extra keys.`;

export const cleanResumeText = (text: string) =>
  text
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\t ]{2,}/g, " ")
    .trim();

const getModelByMode = (mode: ResumeParseMode) => {
  if (mode === "pdfText") return "google/gemma-3n-E4B-it";
  return "Qwen/Qwen3-VL-8B-Instruct";
};

const toStringOrEmpty = (v: unknown) => (typeof v === "string" ? v : "");

const toStringArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((item): item is string => typeof item === "string") : [];

const normalizeParsedResume = (raw: unknown): ParsedResume => {
  if (!raw || typeof raw !== "object") return EMPTY_PARSED_RESUME;
  const source = raw as Record<string, unknown>;

  const education = Array.isArray(source.education)
    ? source.education.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          degree: toStringOrEmpty(row.degree),
          field: toStringOrEmpty(row.field),
          institution: toStringOrEmpty(row.institution),
        };
      })
    : [];

  const experience = Array.isArray(source.experience)
    ? source.experience.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          title: toStringOrEmpty(row.title),
          company: toStringOrEmpty(row.company),
          description: toStringOrEmpty(row.description),
        };
      })
    : [];

  const projects = Array.isArray(source.projects)
    ? source.projects.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          name: toStringOrEmpty(row.name),
          description: toStringOrEmpty(row.description),
          tech: toStringOrEmpty(row.tech),
        };
      })
    : [];

  return {
    isResumeOrTranscript: typeof source.isResumeOrTranscript === "boolean" ? source.isResumeOrTranscript : true,
    suggestionTh: toStringOrEmpty(source.suggestionTh),
    name: toStringOrEmpty(source.name),
    email: toStringOrEmpty(source.email),
    phone: toStringOrEmpty(source.phone),
    faculty: toStringOrEmpty(source.faculty),
    major: toStringOrEmpty(source.major),
    skills: toStringArray(source.skills),
    education,
    experience,
    projects,
  };
};

const parseJsonFromLLM = (content: string): ParsedResume => {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return normalizeParsedResume(JSON.parse(cleaned));
  } catch {
    return EMPTY_PARSED_RESUME;
  }
};

export async function generateProjectTasks(projectName: string, projectDescription: string, existingTasks: string[] = []): Promise<any[]> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_TOGETHER_API_KEY");

  const existingTasksSection = existingTasks.length > 0 
    ? `\n\nExisting tasks in this project (DO NOT suggest these or anything similar): \n${existingTasks.map(t => `- ${t}`).join("\n")}`
    : "";

  const prompt = `You are an expert Project Manager. Based on the given project name and description, generate a list of 3 to 5 actionable tasks to kickstart or advance the project.
Output ONLY strict JSON in the following format, with no markdown formatting or extra text:
[
  {
    "title": "task title (short and concise, in Thai)",
    "description": "task detail (1-2 sentences, in Thai)",
    "tags": ["Tag1", "Tag2"]
  }
]

Project Name: ${projectName}
Project Description: ${projectDescription}${existingTasksSection}`;

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemma-3n-E4B-it",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    })
  });

  if (!res.ok) {
    console.error("AI API Error:", await res.text());
    return [];
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse AI generated tasks", e, rawText);
    return [];
  }
}

export async function analyzeResumeWithAI(input: {
  content: string;
  mode: ResumeParseMode;
}): Promise<ParsedResume> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_TOGETHER_API_KEY in environment variables");
  }

  const model = getModelByMode(input.mode);
  const userContent =
    input.mode === "image"
      ? [
          { type: "text", text: "Parse this resume image to the required JSON shape." },
          { type: "image_url", image_url: { url: input.content } },
        ]
      : cleanResumeText(input.content);

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI API Error: ${await res.text()}`);
  }

  const data = await res.json();
  const rawText = data?.choices?.[0]?.message?.content ?? "";
  return parseJsonFromLLM(rawText);
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js library not loaded");

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  } catch (e) {
    console.error("Error extracting PDF text:", e);
    return "";
  }
}

export async function getPdfFirstPageAsImage(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js library not loaded");

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch (e) {
    console.error("Error converting PDF to image:", e);
    return "";
  }
}


export interface ProfileAnalysisResult {
  radarData: Array<{ skill: string; value: number; fullMark: number }>;
  techRadarData: Array<{ skill: string; value: number; fullMark: number }>;
  tags: string[];
  analysis: string;
}

const PROFILE_ANALYSIS_PROMPT = `You are an expert, realistic career counselor and profiler.
I will pass you a JSON containing a user's profile data (name, faculty, skills, interests, experiences, projects).
Your task is to critically analyze this data and return ONLY strict JSON in the following format, with NO code blocks, markdown mapping, or extra text.

{
  "radarData": [
    { "skill": "Communication", "value": <Number 0-100>, "fullMark": 100 },
    { "skill": "Teamwork", "value": <Number 0-100>, "fullMark": 100 },
    { "skill": "Problem Solving", "value": <Number 0-100>, "fullMark": 100 },
    { "skill": "Adaptability", "value": <Number 0-100>, "fullMark": 100 },
    { "skill": "Time Management", "value": <Number 0-100>, "fullMark": 100 }
  ],
  "techRadarData": [
    { "skill": "Skill 1 (e.g., Python, Marketing, etc.)", "value": <Number 0-100>, "fullMark": 100 },
    { "skill": "Skill 2", "value": <Number 0-100>, "fullMark": 100 },
    ... exactly 5 to 6 specific hard/technical skills derived from their data ...
  ],
  "tags": ["Tag1", "Tag2", ... 5 to 8 short career/skill tags],
  "analysis": "<String: A paragraph in Thai (about 4-5 sentences) summarizing their strengths with honest evaluation. Comment on both their general traits and specific technical skills. Avoid overly flattering comments; give realistic assessments based on verifiable experiences/projects. Keep it encouraging but grounded.>"
}

Rules:
- Be strictly objective. If they lack experiences or projects, their scores should be moderately low (20-40) and you should emphasize room for growth. Soft skills can be average (40-60). Only give high scores (70+) for verifiable deep experience or multiple projects listed in a specific skill.
- radarData MUST contain exactly the 5 static soft skill categories listed above.
- techRadarData MUST contain exactly 5-6 hard skills dynamically derived from their data. Use general domains if specific skills aren't listed (e.g., "Data Analysis" based on faculty).`;

export async function generateProfileAnalysis(profileData: any): Promise<ProfileAnalysisResult> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;

  const fallback: ProfileAnalysisResult = {
    radarData: [
      { skill: "Communication", value: 50, fullMark: 100 },
      { skill: "Teamwork", value: 50, fullMark: 100 },
      { skill: "Problem Solving", value: 50, fullMark: 100 },
      { skill: "Adaptability", value: 50, fullMark: 100 },
      { skill: "Time Management", value: 50, fullMark: 100 },
    ],
    techRadarData: [
      { skill: "Hard Skill 1", value: 40, fullMark: 100 },
      { skill: "Hard Skill 2", value: 40, fullMark: 100 },
    ],
    tags: ["Potential Talent"],
    analysis: "ระบบขัดข้องในขณะนี้ แต่จากข้อมูลของคุณ เราเชื่อมั่นว่าคุณมีศักยภาพที่พร้อมจะพัฒนาตัวเองเสมอ ลองหาโปรเจกต์เพิ่มเติมเพื่อสร้างประสบการณ์ที่น่าสนใจยิ่งขึ้น",
  };

  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemma-3n-E4B-it",
        messages: [
          { role: "system", content: PROFILE_ANALYSIS_PROMPT },
          { role: "user", content: JSON.stringify(profileData) },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error("API Error");

    const data = await res.json();
    let rawText = data?.choices?.[0]?.message?.content ?? "";
    rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(rawText);
    return {
      radarData: Array.isArray(parsed.radarData) ? parsed.radarData : fallback.radarData,
      techRadarData: Array.isArray(parsed.techRadarData) ? parsed.techRadarData : fallback.techRadarData,
      tags: Array.isArray(parsed.tags) ? parsed.tags : fallback.tags,
      analysis: typeof parsed.analysis === "string" ? parsed.analysis : fallback.analysis,
    };
  } catch (e) {
    console.error("Error generating profile analysis:", e);
    return fallback;
  }
}

const BIO_GENERATOR_PROMPT = `You are a professional resume writer preparing a short, engaging bio for a university student or fresh graduate in Thai.
Look at the following JSON containing extracted resume/transcript data.
Your goal is to write a single short paragraph (2-3 sentences) introducing themselves, highlighting their core skills, key experiences, and what they are passionate about.
Return ONLY the Thai bio text. Do NOT wrap it in quotes, JSON, or markdown blocks.`;

export async function generateShortBio(parsedData: any): Promise<string> {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemma-3n-E4B-it",
        messages: [
          { role: "system", content: BIO_GENERATOR_PROMPT },
          { role: "user", content: JSON.stringify(parsedData) },
        ],
        temperature: 0.6,
      }),
    });

    if (!res.ok) return "";

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    console.error("Error generating bio:", e);
    return "";
  }
}
