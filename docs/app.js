// Big, varied bank for words mode. Kept all-lowercase, ASCII-only so the
// typing comparison is straightforward. Mixes calm/zen vocabulary, nature,
// colors, common verbs, everyday objects, and short connector words so
// repeated rolls feel diverse rather than samey.
const DEFAULT_WORDS = [
  // calm / zen
  "calm", "quiet", "still", "soft", "slow", "gentle", "kind", "warm",
  "mellow", "mindful", "serene", "tender", "humble", "graceful", "patient",
  "ease", "peace", "hush", "idle", "rest", "pause", "settle", "soothe",
  "balance", "clarity", "focus", "flow", "rhythm", "steady", "simple",
  // breath / motion
  "breath", "breathe", "drift", "glide", "ripple", "sway", "hover", "linger",
  "lean", "hum", "sigh", "sip", "wander", "tread", "pace", "amble",
  // light / weather
  "light", "glow", "gleam", "shine", "spark", "shimmer", "glimmer", "halo",
  "dawn", "dusk", "twilight", "morning", "evening", "midnight",
  "mist", "fog", "haze", "rain", "snow", "frost", "thaw", "drizzle",
  // earth / water / nature
  "stone", "pebble", "river", "stream", "brook", "creek", "lake", "pond",
  "sea", "ocean", "tide", "wave", "shore", "beach", "sand", "dune",
  "field", "meadow", "garden", "grove", "forest", "thicket", "hill", "valley",
  "ridge", "cliff", "canyon", "cave", "moss", "grain", "leaf", "branch",
  "root", "petal", "bloom", "vine", "fern", "ivy", "willow", "oak", "pine",
  "cedar", "maple", "birch", "lotus", "tulip", "lily", "poppy",
  // sky / cosmos
  "sky", "cloud", "sun", "moon", "lunar", "solar", "star", "comet", "orbit",
  "nova", "zenith", "zephyr",
  // colors / textures
  "amber", "ash", "blue", "copper", "coral", "cream", "denim", "gold",
  "gray", "green", "indigo", "ivory", "jade", "navy", "ochre", "olive",
  "pearl", "plum", "rose", "ruby", "rust", "sage", "silver", "slate",
  "teal", "violet",
  "linen", "silk", "satin", "velvet", "wool", "cotton", "glass", "marble",
  "clay", "chalk", "wood", "paper",
  // small everyday
  "book", "page", "pen", "pencil", "desk", "lamp", "chair", "shelf", "door",
  "window", "candle", "clock", "cup", "kettle", "teapot", "mug", "bowl",
  "frame", "mirror", "rug", "cushion", "blanket", "thread", "needle",
  "key", "knot", "envelope", "letter",
  // music / lofi
  "tune", "song", "note", "chord", "beat", "tempo", "loop", "fade",
  "echo", "ambient", "vinyl", "tape", "drum", "piano", "lullaby",
  // actions
  "type", "write", "read", "draw", "paint", "build", "make", "craft",
  "fold", "weave", "carve", "polish", "study", "learn", "listen",
  "watch", "look", "find", "hold", "share", "offer", "give", "thank",
  "smile", "laugh", "dream", "wonder", "ponder", "notice", "mind",
  "walk", "stroll", "swim", "float", "climb", "sleep",
  "wake", "rise",
  // adjectives
  "bright", "dim", "deep", "fresh", "clean", "clear", "plain",
  "swift", "tiny", "wide", "fair", "real", "true", "open", "honest",
  "modest", "subtle", "neat", "tidy",
  // small connectors / common words
  "the", "and", "but", "yet", "with", "from", "into", "near", "over",
  "under", "after", "before", "again", "soon", "now", "then",
  "here", "there", "where", "when", "while", "until",
  "more", "less", "many", "few", "all", "some", "any", "each", "every",
  "both", "only", "just", "very", "too", "also", "even",
  // moods / textures
  "cozy", "snug", "lush", "vivid", "muted", "faded", "worn",
  "antique", "vintage", "rustic", "minimal", "natural", "organic",
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWords({ words, count, seed }) {
  const rand = mulberry32(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(words[Math.floor(rand() * words.length)]);
  }
  return out;
}

function nowMs() {
  return performance.now();
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round(n, digits = 0) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

const els = {
  modeWords: document.getElementById("modeWords"),
  modePassage: document.getElementById("modePassage"),
  themeToggle: document.getElementById("themeToggle"),
  time: document.getElementById("time"),
  wpm: document.getElementById("wpm"),
  acc: document.getElementById("acc"),
  words: document.getElementById("words"),
  bgmKnob: document.getElementById("bgmKnob"),
  visualizer: document.getElementById("visualizer"),
  pauseModal: document.getElementById("pauseModal"),
  pmResume: document.getElementById("pmResume"),
  pmRefresh: document.getElementById("pmRefresh"),
};

const THEME_STORAGE_KEY = "typing.lofi.theme"; // "light" | "dark"

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeChoice(choice) {
  const c = choice === "dark" || choice === "light" ? choice : getSystemTheme();
  document.documentElement.dataset.theme = c;
  els.themeToggle.setAttribute("aria-checked", c === "dark" ? "true" : "false");
}

function getSavedThemeChoice() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveThemeChoice(choice) {
  try {
    if (choice) localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // ignore
  }
}

let themeChoice = getSavedThemeChoice() || getSystemTheme();

const state = {
  mode: "passage", // "words" | "passage"
  durationS: 60,
  startedAtMs: null,
  ended: false,
  paused: false,
  pausedElapsedMs: 0,
  tickTimer: null,
  wordIndex: 0,
  words: [],
  passage: null, // { id,title,text,mood,difficulty,wordCount,punctuation }
  passageText: "",
  typedBuffer: "",
  typedTotal: 0,
  correctTotal: 0,
  incorrectTotal: 0,
  seedBase: Math.floor(Date.now() / 1000),
};

function formatElapsed(s) {
  const totalCs = Math.max(0, Math.floor(s * 100));
  const m = Math.floor(totalCs / 6000);
  const sec = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${m}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function setTimeElapsed(s) {
  els.time.textContent = formatElapsed(s);
}

function setWpm(v) {
  els.wpm.textContent = v == null ? "—" : String(v);
}

function setAcc(v) {
  els.acc.textContent = v == null ? "—" : String(v);
}

function computeStats(elapsedS) {
  const minutes = elapsedS / 60;
  const words = state.correctTotal / 5;
  const wpm = minutes > 0 ? words / minutes : 0;
  const total = state.correctTotal + state.incorrectTotal;
  const acc = total > 0 ? (state.correctTotal / total) * 100 : 0;
  return { wpm, acc };
}

function getElapsedS() {
  if (state.startedAtMs == null) return 0;
  return (nowMs() - state.startedAtMs) / 1000;
}

function clearTick() {
  if (state.tickTimer) {
    clearInterval(state.tickTimer);
    state.tickTimer = null;
  }
}

function startIfNeeded() {
  if (state.ended) return;
  if (state.startedAtMs != null) return;
  state.startedAtMs = nowMs();
  state.tickTimer = setInterval(tick, 16);
}

function endTest() {
  if (state.ended) return;
  state.ended = true;
  state.paused = false;
  const elapsed = getElapsedS();
  clearTick();
  setTimeElapsed(elapsed);
  const { wpm, acc } = computeStats(elapsed);
  setWpm(Math.max(0, Math.floor(wpm)));
  setAcc(Math.max(0, Math.floor(acc)));
  // Keep focus on the words area so the user can hit any key to restart.
  // (Previously we blurred here, which orphaned keystrokes and made it
  // impossible to refresh the test from the keyboard.)
  try { els.words.focus({ preventScroll: true }); } catch { els.words.focus(); }
}

function pauseTest() {
  if (state.ended || state.paused) return;
  if (state.startedAtMs == null) return; // never started, nothing to pause
  state.pausedElapsedMs = nowMs() - state.startedAtMs;
  state.paused = true;
  clearTick();
}

function resumeTest() {
  if (state.ended || !state.paused) return;
  state.paused = false;
  state.startedAtMs = nowMs() - state.pausedElapsedMs;
  state.tickTimer = setInterval(tick, 16);
}

function tick() {
  const elapsed = getElapsedS();
  setTimeElapsed(elapsed);
  const { wpm, acc } = computeStats(elapsed);
  setWpm(Math.max(0, Math.floor(wpm)));
  setAcc(Math.max(0, Math.floor(acc)));
}

function buildWordsUi() {
  if (state.mode !== "words") return;
  els.words.textContent = "";
  const frag = document.createDocumentFragment();

  state.words.forEach((w, wi) => {
    const word = document.createElement("span");
    word.className = "word" + (wi === state.wordIndex ? " active" : "");
    word.dataset.wordIndex = String(wi);

    for (let ci = 0; ci < w.length; ci++) {
      const ch = document.createElement("span");
      ch.className = "char pending";
      ch.textContent = w[ci];
      ch.dataset.charIndex = String(ci);
      word.appendChild(ch);
    }

    const space = document.createTextNode(" ");
    frag.appendChild(word);
    frag.appendChild(space);
  });

  els.words.appendChild(frag);
  placeCaret();
}

function placeCaret() {
  const existing = els.words.querySelector(".caret");
  if (existing) existing.remove();

  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");

  if (state.mode === "words") {
    const active = els.words.querySelector(`.word[data-word-index="${state.wordIndex}"]`);
    if (!active) return;
    const chars = active.querySelectorAll(".char");
    const idx = Math.min(state.typedBuffer.length, chars.length);
    if (idx < chars.length) {
      chars[idx].insertAdjacentElement("beforebegin", caret);
    } else {
      active.appendChild(caret);
    }
    return;
  }

  const chars = els.words.querySelectorAll(".char");
  const idx = Math.min(state.typedBuffer.length, chars.length);
  if (idx < chars.length) {
    chars[idx].insertAdjacentElement("beforebegin", caret);
  } else {
    els.words.appendChild(caret);
  }
}

function markActiveWord() {
  if (state.mode !== "words") return;
  els.words.querySelectorAll(".word").forEach((el) => el.classList.remove("active"));
  const active = els.words.querySelector(`.word[data-word-index="${state.wordIndex}"]`);
  if (active) active.classList.add("active");
  placeCaret();
}

function scoreWord(typed) {
  const expected = state.words[state.wordIndex] || "";
  const maxLen = Math.max(expected.length, typed.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expected[i];
    const got = typed[i];
    if (exp == null) {
      state.incorrectTotal += 1;
      state.typedTotal += 1;
      continue;
    }
    if (got == null) break;
    state.typedTotal += 1;
    if (got === exp) state.correctTotal += 1;
    else state.incorrectTotal += 1;
  }
}

function updateWordUi(typed) {
  if (state.mode !== "words") return;
  const active = els.words.querySelector(`.word[data-word-index="${state.wordIndex}"]`);
  if (!active) return;
  const expected = state.words[state.wordIndex] || "";

  const chars = Array.from(active.querySelectorAll(".char"));
  for (let i = 0; i < chars.length; i++) {
    const got = typed[i];
    const exp = expected[i];
    const el = chars[i];
    if (got == null) {
      el.className = "char pending";
      if (el.textContent !== exp) el.textContent = exp;
    } else if (got === exp) {
      el.className = "char correct";
      if (el.textContent !== exp) el.textContent = exp;
    } else {
      // Reveal what the user actually typed in the accent color, not the expected letter.
      el.className = "char incorrect";
      const display = /\s/.test(got) ? "\u00b7" : got;
      if (el.textContent !== display) el.textContent = display;
    }
  }

  placeCaret();
}

function buildPassageUi() {
  if (state.mode !== "passage") return;
  els.words.textContent = "";
  const frag = document.createDocumentFragment();

  const text = state.passageText;
  for (let i = 0; i < text.length; i++) {
    const ch = document.createElement("span");
    ch.className = "char pending";
    ch.textContent = text[i];
    ch.dataset.charIndex = String(i);
    frag.appendChild(ch);
  }

  els.words.appendChild(frag);
  placeCaret();
}

function scorePassageAndUi(typed) {
  const expected = state.passageText;

  state.correctTotal = 0;
  state.incorrectTotal = 0;

  const chars = Array.from(els.words.querySelectorAll(".char"));
  for (let i = 0; i < chars.length; i++) {
    const exp = expected[i];
    const got = typed[i];
    const el = chars[i];

    if (got == null) {
      el.className = "char pending";
      if (el.textContent !== exp) el.textContent = exp;
      continue;
    }
    if (got === exp) {
      el.className = "char correct";
      if (el.textContent !== exp) el.textContent = exp;
      state.correctTotal += 1;
    } else {
      // Reveal what the user actually typed in the accent color. Whitespace gets a visible glyph.
      el.className = "char incorrect";
      const display = /\s/.test(got) ? "\u00b7" : got;
      if (el.textContent !== display) el.textContent = display;
      state.incorrectTotal += 1;
    }
  }

  // If user typed beyond expected, count extras as incorrect.
  if (typed.length > expected.length) {
    state.incorrectTotal += typed.length - expected.length;
  }

  state.typedTotal = state.correctTotal + state.incorrectTotal;
  placeCaret();
}

async function loadPassageBank() {
  try {
    const res = await fetch("./text-bank.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((x) => x && typeof x.text === "string");
  } catch {
    return [];
  }
}

let passageBankPromise = null;
function getPassageBank() {
  if (!passageBankPromise) passageBankPromise = loadPassageBank();
  return passageBankPromise;
}

async function pickRandomPassage() {
  const bank = await getPassageBank();
  if (!bank.length) {
    return {
      id: "fallback",
      title: "Quiet Loop",
      text: "A soft beat repeats in the background, and you follow it without hurry. Type the line, breathe, and let the next word arrive on its own.",
      mood: ["lofi", "zen"],
      difficulty: 1,
      wordCount: 0,
      punctuation: "light",
    };
  }
  return bank[Math.floor(Math.random() * bank.length)];
}

// Collapse "smart" typographic punctuation that sneaks in from copy-pasted
// content into ASCII so that the user, who types ' or " or -, actually matches
// the expected character.
function normalizePassageText(text) {
  if (!text) return "";
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // ' ' ‚ ‛ ′ -> '
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"') // " " „ ‟ ″ -> "
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-") // ‐ ‑ ‒ – — − -> -
    .replace(/\u2026/g, "...") // … -> ...
    .replace(/\u00A0/g, " ") // NBSP -> space
    .replace(/[\u200B-\u200D\uFEFF]/g, ""); // zero-width chars
}

function setMode(next) {
  if (next !== "words" && next !== "passage") return;
  state.mode = next;

  els.modeWords.classList.toggle("isActive", next === "words");
  els.modeWords.setAttribute("aria-selected", next === "words" ? "true" : "false");
  els.modePassage.classList.toggle("isActive", next === "passage");
  els.modePassage.setAttribute("aria-selected", next === "passage" ? "true" : "false");

  resetTest();
}

function advanceWord() {
  if (state.mode !== "words") return;
  state.wordIndex += 1;
  if (state.wordIndex >= state.words.length) {
    const extra = pickWords({
      words: DEFAULT_WORDS,
      count: 15,
      seed: state.seedBase + state.wordIndex,
    });
    state.words.push(...extra);
    buildWordsUi();
  } else {
    markActiveWord();
  }
}

async function resetTest() {
  clearTick();

  state.durationS = 60;
  state.startedAtMs = null;
  state.ended = false;
  state.paused = false;
  state.pausedElapsedMs = 0;
  state.wordIndex = 0;
  state.typedBuffer = "";
  state.typedTotal = 0;
  state.correctTotal = 0;
  state.incorrectTotal = 0;
  state.seedBase = Math.floor(Date.now() / 1000);

  if (state.mode === "words") {
    state.words = pickWords({
      words: DEFAULT_WORDS,
      count: 25,
      seed: state.seedBase,
    });
  } else {
    const p = await pickRandomPassage();
    state.passage = p;
    state.passageText = normalizePassageText(String(p.text || "").trim());
  }

  setTimeElapsed(0);
  setWpm(null);
  setAcc(null);

  if (state.mode === "words") buildWordsUi();
  else buildPassageUi();

  els.words.focus();
}

function isPrintableKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key.length === 1;
}

function isPassageComplete() {
  return (
    state.mode === "passage" &&
    state.passageText.length > 0 &&
    state.typedBuffer.length >= state.passageText.length
  );
}

// Maps current typing progress to a 0..1 horizontal position so the
// visualizer wave drifts left -> right as you fill out the passage.
function visualizerCenter() {
  if (state.mode === "passage" && state.passageText.length > 0) {
    const base = state.typedBuffer.length / state.passageText.length;
    const wobble = (Math.random() - 0.5) * 0.12;
    return Math.max(0, Math.min(1, base + wobble));
  }
  return Math.random();
}

function handleTypingKeydown(e) {
  // The pause modal owns the keyboard while it's open. ESC itself is handled
  // exclusively by the modal's document-level listener (see pauseModal below)
  // so that opening and closing don't race against each other inside a single
  // bubbling event.
  if (pauseModal.isOpen()) {
    e.preventDefault();
    return;
  }
  if (e.key === "Escape") {
    // Let the document-level handler open the modal. We just don't want this
    // path to consume the keystroke as typing.
    return;
  }

  // After a finished run, any meaningful key should restart the test.
  // (We check this BEFORE the Tab/Enter handlers so that those keys also
  // refresh once the passage is complete.)
  if (state.ended) {
    if (
      isPrintableKey(e) ||
      e.key === "Backspace" ||
      e.key === "Enter" ||
      e.key === "Tab" ||
      e.key === " "
    ) {
      e.preventDefault();
      resetTest();
    }
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    resetTest();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    endTest();
    return;
  }

  // Space at (or past) the end of the passage finishes the run.
  if (state.mode === "passage" && e.key === " " && isPassageComplete()) {
    e.preventDefault();
    if (visualizer) visualizer.pulse(0.7, visualizerCenter());
    endTest();
    return;
  }

  if (isPrintableKey(e) || e.key === "Backspace" || e.key === " ") startIfNeeded();

  if (state.mode === "words" && e.key === " ") {
    e.preventDefault();
    scoreWord(state.typedBuffer);
    advanceWord();
    state.typedBuffer = "";
    updateWordUi(state.typedBuffer);
    if (visualizer) visualizer.pulse(0.55, visualizerCenter());
    return;
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    state.typedBuffer = state.typedBuffer.slice(0, -1);
    if (state.mode === "words") updateWordUi(state.typedBuffer);
    else scorePassageAndUi(state.typedBuffer);
    if (visualizer) visualizer.pulse(0.22, visualizerCenter());
    return;
  }

  if (isPrintableKey(e)) {
    e.preventDefault();
    // In word mode, don't allow newlines; space is handled above.
    if (state.mode === "words" && e.key === " ") return;
    state.typedBuffer += e.key;
    if (state.mode === "words") updateWordUi(state.typedBuffer);
    else scorePassageAndUi(state.typedBuffer);

    if (visualizer) visualizer.pulse(0.45 + Math.random() * 0.15, visualizerCenter());

    // Auto-end once the passage is fully and correctly typed.
    if (
      state.mode === "passage" &&
      state.typedBuffer.length === state.passageText.length &&
      state.incorrectTotal === 0
    ) {
      endTest();
    }
  }
}

els.words.addEventListener("keydown", handleTypingKeydown);
els.words.addEventListener("click", () => els.words.focus());

els.modeWords.addEventListener("click", () => setMode("words"));
els.modePassage.addEventListener("click", () => setMode("passage"));

els.themeToggle.addEventListener("click", () => {
  themeChoice = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  saveThemeChoice(themeChoice);
  applyThemeChoice(themeChoice);
});

// ---- BGM knob (volume + play/pause) ----
// Knob hand position: volume 0 -> 8 o'clock (-120deg), volume 1 -> 4 o'clock (+120deg).
//
// Audio path:
//   <audio crossorigin> --> MediaElementSource --> gain --> destination
//                                                  |
//                                                  +--> analyser (visualizer)
//
// Tracks are random CC0 lofi MP3s served via jsDelivr's CDN, which sends
// CORS headers so the analyser can actually read FFT bytes from playback.
// If track loading fails we transparently fall back to the original pink
// noise generator so BGM still has a "voice".
const LOFI_BASE = "https://cdn.jsdelivr.net/gh/ItzAshOffcl/lofi-resources/tracks";
const LOFI_FOLDERS = ["chill", "jazzy", "sleepy"];
const LOFI_PER_FOLDER = 30;

function buildLofiTrackList() {
  const tracks = [];
  for (const folder of LOFI_FOLDERS) {
    for (let i = 1; i <= LOFI_PER_FOLDER; i++) {
      tracks.push(`${LOFI_BASE}/${folder}/${folder}_${i}.mp3`);
    }
  }
  return tracks;
}
const LOFI_TRACKS = buildLofiTrackList();

function pickLofiTrack(exclude) {
  if (LOFI_TRACKS.length === 0) return null;
  if (LOFI_TRACKS.length === 1) return LOFI_TRACKS[0];
  for (let i = 0; i < 12; i++) {
    const t = LOFI_TRACKS[Math.floor(Math.random() * LOFI_TRACKS.length)];
    if (t !== exclude) return t;
  }
  return LOFI_TRACKS[Math.floor(Math.random() * LOFI_TRACKS.length)];
}

const bgm = {
  volume: 0, // 0..1 user-facing; default off (hand at 8 o'clock)
  playing: false,
  ctx: null,
  gain: null,
  analyser: null,
  fftBuffer: null,
  audioEl: null, // HTMLAudioElement for streamed lofi tracks
  source: null, // MediaElementAudioSourceNode
  trackUrl: null, // current lofi track URL
  noiseSource: null, // BufferSource for fallback pink noise
  usingFallback: false,
  // Pending fade-in: when we toggle on, the <audio> takes time to actually
  // start producing samples (load + decode + play). We hold gain at 0 and
  // only ramp up when the `playing` event fires, so the user hears a real
  // fade-in instead of the ramp finishing in silence.
  pendingFadeIn: false,
};

function setBgmIndicator() {
  // Hand reflects effective output: parked at 8 o'clock when off, otherwise rotates with volume.
  const effective = bgm.playing ? bgm.volume : 0;
  const deg = -120 + effective * 240;
  els.bgmKnob.style.setProperty("--rot", `${deg}deg`);
  els.bgmKnob.setAttribute("aria-valuenow", String(Math.round(bgm.volume * 100)));
}

// Fade durations: long for play/pause (so it really feels like a "fade in /
// fade out"), short for live volume tweaks so the knob still feels responsive
// while you're dragging it.
const BGM_FADE_TOGGLE_MS = 900;
const BGM_FADE_VOLUME_MS = 160;

// When we fade out we want to actually pause the underlying <audio> element
// once the gain reaches zero (otherwise we'd keep streaming silently). This
// timer is cancelled if the user toggles BGM back on mid-fade.
let bgmPauseTimerId = null;

function clearBgmPauseTimer() {
  if (bgmPauseTimerId != null) {
    clearTimeout(bgmPauseTimerId);
    bgmPauseTimerId = null;
  }
}

function rampBgmGain(target, durationMs = BGM_FADE_VOLUME_MS) {
  if (!bgm.gain || !bgm.ctx) return;
  const t = bgm.ctx.currentTime;
  const seconds = Math.max(0.01, durationMs / 1000);
  bgm.gain.gain.cancelScheduledValues(t);
  bgm.gain.gain.setValueAtTime(bgm.gain.gain.value, t);
  bgm.gain.gain.linearRampToValueAtTime(target, t + seconds);
}

function applyBgmGain(durationMs) {
  // Music is mastered louder than synthesized noise, so we use a tighter cap
  // when in fallback mode and a more generous one for real tracks.
  const cap = bgm.usingFallback ? 0.5 : 0.85;
  const target = bgm.playing ? bgm.volume * cap : 0;
  rampBgmGain(target, durationMs);
}

// Created up-front (at page load, before any user gesture) so the browser
// can start fetching/decoding the very first track in the background. By
// the time the user actually clicks the knob, the audio is usually already
// buffered enough that play() begins immediately.
function createLofiAudioElement() {
  if (bgm.audioEl) return;

  const audio = new Audio();
  audio.crossOrigin = "anonymous"; // required for the analyser to read samples
  audio.preload = "auto";
  audio.loop = false; // we pick a fresh random track on `ended`
  audio.volume = 1; // gain stage handles user volume

  audio.addEventListener("ended", () => {
    if (bgm.playing && !bgm.usingFallback) playRandomLofi();
  });
  // Reset the failure streak as soon as a track actually starts playing,
  // and consume any pending fade-in that's been waiting on this moment.
  audio.addEventListener("playing", () => {
    audio.dataset.failures = "0";
    if (bgm.playing && bgm.pendingFadeIn) {
      bgm.pendingFadeIn = false;
      applyBgmGain(BGM_FADE_TOGGLE_MS);
    }
  });
  audio.addEventListener("error", () => {
    if (!bgm.playing || bgm.usingFallback) return;
    const n = parseInt(audio.dataset.failures || "0", 10) + 1;
    audio.dataset.failures = String(n);
    if (n >= 3) {
      enablePinkNoiseFallback();
      return;
    }
    playRandomLofi();
  });

  // Pre-pick a track and kick off buffering. .load() is what actually nudges
  // browsers (especially Safari) to start downloading without a play() call.
  const initial = pickLofiTrack(null);
  if (initial) {
    bgm.trackUrl = initial;
    audio.src = initial;
    try { audio.load(); } catch {}
  }

  bgm.audioEl = audio;
}

function connectLofiAudioToContext() {
  if (!bgm.ctx || !bgm.audioEl || bgm.source) return;
  try {
    bgm.source = bgm.ctx.createMediaElementSource(bgm.audioEl);
    bgm.source.connect(bgm.gain);
  } catch {
    enablePinkNoiseFallback();
  }
}

function initBgmAudio() {
  if (bgm.ctx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  bgm.ctx = new Ctx();

  bgm.gain = bgm.ctx.createGain();
  bgm.gain.gain.value = 0;
  bgm.gain.connect(bgm.ctx.destination);

  // Analyser is tapped off the gain so the visualizer reflects what the
  // listener actually hears. Heavy temporal smoothing keeps motion fluid.
  bgm.analyser = bgm.ctx.createAnalyser();
  bgm.analyser.fftSize = 512;
  bgm.analyser.smoothingTimeConstant = 0.88;
  bgm.analyser.minDecibels = -90;
  bgm.analyser.maxDecibels = -10;
  bgm.gain.connect(bgm.analyser);
  bgm.fftBuffer = new Uint8Array(bgm.analyser.frequencyBinCount);

  // Audio element was created on page load to give it a head start on
  // buffering. Now that we have an AudioContext, wire it into the graph.
  if (!bgm.audioEl) createLofiAudioElement();
  connectLofiAudioToContext();
}

function playRandomLofi() {
  if (!bgm.audioEl || bgm.usingFallback) return;
  const next = pickLofiTrack(bgm.trackUrl);
  if (!next) {
    enablePinkNoiseFallback();
    return;
  }
  bgm.trackUrl = next;
  bgm.audioEl.src = next;
  const promise = bgm.audioEl.play();
  if (promise && typeof promise.catch === "function") {
    promise.catch(() => {
      // Autoplay/network refused — try fallback so the user still hears something.
      enablePinkNoiseFallback();
    });
  }
}

function enablePinkNoiseFallback() {
  if (bgm.usingFallback || !bgm.ctx) return;
  bgm.usingFallback = true;

  // Detach the audio element from the graph if present so it doesn't double up.
  if (bgm.source) {
    try { bgm.source.disconnect(); } catch {}
  }
  if (bgm.audioEl) {
    try { bgm.audioEl.pause(); } catch {}
  }

  const sampleRate = bgm.ctx.sampleRate;
  const buffer = bgm.ctx.createBuffer(1, 2 * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Paul Kellet's filtered pink noise.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }

  const src = bgm.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const filter = bgm.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 720;
  filter.Q.value = 0.6;

  src.connect(filter);
  filter.connect(bgm.gain);
  src.start();

  bgm.noiseSource = src;

  // Fallback is now generating samples, so any pending fade-in can resolve.
  // Re-apply gain (the cap depends on usingFallback) using the longer toggle
  // ramp so the user still gets a real audible fade-in.
  bgm.pendingFadeIn = false;
  applyBgmGain(bgm.playing ? BGM_FADE_TOGGLE_MS : BGM_FADE_VOLUME_MS);
}

function toggleBgm() {
  initBgmAudio();
  if (!bgm.ctx) return;
  if (bgm.ctx.state === "suspended") bgm.ctx.resume();
  bgm.playing = !bgm.playing;
  els.bgmKnob.classList.toggle("isPlaying", bgm.playing);

  // Turning on with no volume? Snap to max so the indicator hand lands at the
  // "on" position (4 o'clock = +120deg = volume 1). The audible loudness is
  // still tamed by the gain cap inside applyBgmGain. We pass skipRamp so we
  // don't double-ramp; the toggle ramp below handles the audible fade-in.
  if (bgm.playing && bgm.volume === 0) {
    setBgmVolume(1, /* skipRamp */ true);
  }

  if (bgm.playing) {
    // Cancel any pending "pause after fade-out" so we don't yank audio out
    // from under the user if they flip the knob back on mid-fade.
    clearBgmPauseTimer();

    if (bgm.usingFallback) {
      // Pink-noise loop is always running; ramp gain immediately.
      bgm.pendingFadeIn = false;
      setBgmIndicator();
      applyBgmGain(BGM_FADE_TOGGLE_MS);
    } else if (bgm.audioEl) {
      const audio = bgm.audioEl;
      if (audio.src && !audio.paused) {
        // Mid-fade-out flip-back: audio is still streaming, just ramp gain.
        bgm.pendingFadeIn = false;
        setBgmIndicator();
        applyBgmGain(BGM_FADE_TOGGLE_MS);
      } else {
        // Need to start (or restart) the track. Hold gain at 0 — the
        // fade-in will be triggered from the audio's "playing" event so the
        // ramp actually coincides with audible sound.
        bgm.pendingFadeIn = true;
        if (bgm.gain && bgm.ctx) {
          const t = bgm.ctx.currentTime;
          bgm.gain.gain.cancelScheduledValues(t);
          bgm.gain.gain.setValueAtTime(0, t);
        }
        setBgmIndicator();
        if (audio.src) {
          const p = audio.play();
          if (p && typeof p.catch === "function") {
            p.catch(() => enablePinkNoiseFallback());
          }
        } else {
          playRandomLofi();
        }
      }
    } else {
      // No audio element at all; just apply gain.
      bgm.pendingFadeIn = false;
      setBgmIndicator();
      applyBgmGain(BGM_FADE_TOGGLE_MS);
    }
  } else {
    // Toggling off: cancel any pending fade-in, ramp gain to 0, then pause
    // the underlying <audio> once the fade-out completes.
    bgm.pendingFadeIn = false;
    setBgmIndicator();
    applyBgmGain(BGM_FADE_TOGGLE_MS);
    if (bgm.audioEl && !bgm.usingFallback) {
      clearBgmPauseTimer();
      bgmPauseTimerId = setTimeout(() => {
        bgmPauseTimerId = null;
        if (!bgm.playing && bgm.audioEl) {
          try { bgm.audioEl.pause(); } catch {}
        }
      }, BGM_FADE_TOGGLE_MS + 80);
    }
  }
}

function setBgmVolume(v, skipRamp = false) {
  bgm.volume = Math.min(1, Math.max(0, v));
  setBgmIndicator();
  if (!skipRamp) applyBgmGain(BGM_FADE_VOLUME_MS);
}

// Pointer drag (vertical) for volume; small clicks toggle play.
let bgmDrag = { active: false, startY: 0, startVol: 0, moved: false, pointerId: null };

els.bgmKnob.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  els.bgmKnob.setPointerCapture(e.pointerId);
  bgmDrag = {
    active: true,
    startY: e.clientY,
    startVol: bgm.volume,
    moved: false,
    pointerId: e.pointerId,
  };
});

els.bgmKnob.addEventListener("pointermove", (e) => {
  if (!bgmDrag.active || e.pointerId !== bgmDrag.pointerId) return;
  const dy = bgmDrag.startY - e.clientY;
  if (Math.abs(dy) > 2) bgmDrag.moved = true;
  setBgmVolume(bgmDrag.startVol + dy / 200);
});

function endBgmDrag(e) {
  if (!bgmDrag.active || e.pointerId !== bgmDrag.pointerId) return;
  try {
    els.bgmKnob.releasePointerCapture(e.pointerId);
  } catch {}
  const wasMoved = bgmDrag.moved;
  bgmDrag.active = false;
  bgmDrag.pointerId = null;
  if (!wasMoved) toggleBgm();
}

els.bgmKnob.addEventListener("pointerup", endBgmDrag);
els.bgmKnob.addEventListener("pointercancel", endBgmDrag);

els.bgmKnob.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    setBgmVolume(bgm.volume - e.deltaY / 1000);
  },
  { passive: false }
);

els.bgmKnob.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggleBgm();
  } else if (e.key === "ArrowUp" || e.key === "ArrowRight") {
    e.preventDefault();
    setBgmVolume(bgm.volume + 0.05);
  } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
    e.preventDefault();
    setBgmVolume(bgm.volume - 0.05);
  }
});

setBgmIndicator();

// Eagerly create the <audio> element + start buffering the first track now,
// so the browser is already downloading by the time the user clicks the
// knob. Audio context wiring + actual play() are still gated on the user
// gesture inside toggleBgm, satisfying autoplay policies.
createLofiAudioElement();

// ---- Square-cell LED matrix visualizer ----
// Nothing-style ambient equalizer: tight grid of small squares, dim baseline,
// with a soft white bloom on lit cells. Heights are driven by (a) Web Audio
// FFT bytes from the BGM analyser when playing, (b) a per-column ambient sine
// so the matrix breathes during silence, and (c) keystroke impulses.
const visualizer = (() => {
  const canvas = els.visualizer;
  if (!canvas || !canvas.getContext) return { pulse() {} };
  const ctx = canvas.getContext("2d");

  const cfg = {
    cellSize: 4, // tiny square cells
    gap: 2, // tight spacing
    paddingX: 8,
    paddingY: 6,
    decay: 0.93, // peak target bleeds back toward ambient
    ease: 0.14, // smoother current-toward-target lerp
    ambientAmp: 0.22, // breathing baseline (0..1) — slightly higher to keep the small panel alive
    spread: 5, // keystroke impulse spreads to N neighbors
    fftMaxBins: 48, // bins we read; remainder of the spectrum is too quiet to be useful
    fftBias: 0.55, // <1 spreads low bins across more columns (visual EQ balance)
    fftScale: 0.78, // top of the fft contribution to a column's height target
  };

  let cssW = 0;
  let cssH = 0;
  let cols = 0;
  let rows = 0;
  let offsetX = 0;
  let offsetY = 0;
  let columns = [];

  function makeCol() {
    return {
      target: 0,
      current: 0,
      phase: Math.random() * Math.PI * 2,
      rate: 0.8 + Math.random() * 0.5, // per-column sine speed (organic feel)
    };
  }

  function rebuildLayout() {
    const pitch = cfg.cellSize + cfg.gap;
    const innerW = Math.max(0, cssW - cfg.paddingX * 2);
    const innerH = Math.max(0, cssH - cfg.paddingY * 2);
    const newCols = Math.max(1, Math.floor((innerW + cfg.gap) / pitch));
    const newRows = Math.max(1, Math.floor((innerH + cfg.gap) / pitch));

    if (newCols !== cols) {
      // Preserve column state across resizes when we can.
      const next = new Array(newCols);
      for (let i = 0; i < newCols; i++) {
        next[i] = i < columns.length ? columns[i] : makeCol();
      }
      columns = next;
      cols = newCols;
    }
    rows = newRows;

    const usedW = cols * pitch - cfg.gap;
    const usedH = rows * pitch - cfg.gap;
    offsetX = (cssW - usedW) / 2;
    offsetY = (cssH - usedH) / 2;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildLayout();
  }
  resize();
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  function pulse(strength = 0.5, centerNorm = null) {
    if (cols === 0) return;
    const c = centerNorm == null ? Math.random() : Math.max(0, Math.min(1, centerNorm));
    const idx = Math.round(c * (cols - 1));
    for (let i = 0; i < cols; i++) {
      const d = Math.abs(i - idx);
      if (d > cfg.spread) continue;
      const fall = 1 - d / cfg.spread;
      const add = strength * fall * (0.7 + Math.random() * 0.4);
      columns[i].target = Math.min(1, columns[i].target + add);
    }
  }

  function sampleFft() {
    if (!bgm.analyser || !bgm.fftBuffer || !bgm.playing || bgm.volume <= 0) {
      return null;
    }
    bgm.analyser.getByteFrequencyData(bgm.fftBuffer);
    return bgm.fftBuffer;
  }

  let t0 = performance.now();
  function frame(t) {
    if (cssW < 2 || cssH < 2 || cols === 0 || rows === 0) {
      requestAnimationFrame(frame);
      return;
    }

    ctx.clearRect(0, 0, cssW, cssH);

    const fft = sampleFft();
    const usableBins = fft ? Math.min(cfg.fftMaxBins, fft.length) : 0;
    const slow = (t - t0) / 1400;
    const pitch = cfg.cellSize + cfg.gap;
    const cell = cfg.cellSize;

    for (let i = 0; i < cols; i++) {
      const c = columns[i];

      // Ambient breathing — never exceeds ambientAmp on its own.
      const ambientWave =
        ((Math.sin(slow * c.rate + c.phase) + 1) / 2) * cfg.ambientAmp;

      // FFT-driven height for this column. Volume scales the contribution so
      // the matrix gets more energetic only when the user actually wants BGM.
      // Non-linear (pow < 1) bin mapping spreads low-band energy across more
      // columns, and a tiny per-column wobble keeps adjacent cols sharing the
      // same bin from moving in lockstep.
      let fftValue = 0;
      if (fft) {
        const tNorm = i / Math.max(1, cols - 1);
        const idx = Math.min(
          usableBins - 1,
          Math.floor(Math.pow(tNorm, cfg.fftBias) * (usableBins - 1))
        );
        const wobble = 0.85 + 0.15 * Math.sin(slow * 0.7 + c.phase);
        fftValue =
          (fft[idx] / 255) * cfg.fftScale * (0.35 + 0.65 * bgm.volume) * wobble;
      }

      // Pulse target decays so peaks settle gracefully.
      c.target = c.target * cfg.decay;
      const effectiveTarget = Math.max(c.target, ambientWave, fftValue);

      // Easing handles the slight interpolation between frames.
      c.current += (effectiveTarget - c.current) * cfg.ease;

      // Micro-jitter so idle cells never look frozen. Kept very small.
      const jitter = (Math.random() - 0.5) * 0.018;
      const value = Math.max(0, Math.min(1, c.current + jitter));

      const litRowsFloat = value * rows;
      const litRows = Math.floor(litRowsFloat);
      const partial = litRowsFloat - litRows;

      const xLeft = offsetX + i * pitch;

      for (let r = 0; r < rows; r++) {
        const yTop = offsetY + (rows - 1 - r) * pitch; // r = 0 is the bottom row
        if (r < litRows) {
          // Slight gradient up the column gives each lit stack a "head" feel.
          const brightness = 0.6 + 0.4 * (r / Math.max(1, litRows - 1 || 1));
          drawLit(xLeft, yTop, cell, brightness);
        } else if (r === litRows && partial > 0.12) {
          drawLit(xLeft, yTop, cell, partial * 0.7);
        } else {
          drawDim(xLeft, yTop, cell);
        }
      }
    }

    requestAnimationFrame(frame);
  }

  function drawDim(x, y, size) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(x, y, size, size);
  }

  function drawLit(x, y, size, brightness) {
    // Two-layer bloom (fast: just two extra fillRects) gives a calm soft glow
    // without shadowBlur, which would tank perf at this cell count.
    const outer = size + 4;
    const inner = size + 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.04 * brightness})`;
    ctx.fillRect(x - 2, y - 2, outer, outer);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.10 * brightness})`;
    ctx.fillRect(x - 1, y - 1, inner, inner);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + 0.4 * brightness})`;
    ctx.fillRect(x, y, size, size);
  }

  requestAnimationFrame(frame);

  return { pulse };
})();

// ---- Pause modal (Teenage Engineering style) ----
// Opens on ESC during a typing session. ESC again resumes from where the
// timer was paused; ENTER refreshes the passage and starts a fresh run.
// While the modal is open it owns the keyboard — typing into the words area
// is suspended, but the visualizer and BGM keep doing their thing.
const pauseModal = (() => {
  const root = els.pauseModal;
  if (!root) return { isOpen: () => false, open() {}, close() {}, refresh() {} };

  let opening = false;

  function isOpen() {
    return root.dataset.open === "true";
  }

  function open() {
    if (isOpen() || opening) return;
    opening = true;
    pauseTest();
    root.dataset.open = "true";
    root.setAttribute("aria-hidden", "false");
    // Defer focus until after the transition starts so the entrance animation
    // can play. Focus the resume key by default — it's the safer outcome.
    requestAnimationFrame(() => {
      try { els.pmResume.focus({ preventScroll: true }); } catch { els.pmResume.focus(); }
      opening = false;
    });
  }

  function close() {
    if (!isOpen()) return;
    root.dataset.open = "false";
    root.setAttribute("aria-hidden", "true");
    resumeTest();
    // Return focus to the typing surface so the next keystroke flows naturally.
    requestAnimationFrame(() => {
      try { els.words.focus({ preventScroll: true }); } catch { els.words.focus(); }
    });
  }

  function refresh() {
    if (!isOpen()) return;
    root.dataset.open = "false";
    root.setAttribute("aria-hidden", "true");
    // resetTest already clears paused/started/ended state and re-focuses words.
    resetTest();
  }

  // Buttons
  els.pmResume.addEventListener("click", (e) => { e.preventDefault(); close(); });
  els.pmRefresh.addEventListener("click", (e) => { e.preventDefault(); refresh(); });

  // Global keyboard. We use the document so it works regardless of where focus
  // currently is (the modal, the typing area, the BGM knob, etc.). Handling
  // BOTH "open on ESC" and "close on ESC" here (instead of splitting between
  // here and handleTypingKeydown) avoids the bug where opening + bubbling
  // would immediately re-trigger close in the same event.
  document.addEventListener("keydown", (e) => {
    // Don't interfere with browser-level shortcuts (Cmd/Ctrl/Alt combos).
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (!isOpen()) {
      if (e.key === "Escape") {
        e.preventDefault();
        open();
      }
      return;
    }

    // Modal is open from here on.
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter") {
      e.preventDefault();
      refresh();
    } else if (e.key === "Tab") {
      // Trap focus between the two keycaps so Tab stays inside the modal.
      e.preventDefault();
      const next = document.activeElement === els.pmResume ? els.pmRefresh : els.pmResume;
      next.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = document.activeElement === els.pmResume ? els.pmRefresh : els.pmResume;
      next.focus();
    } else {
      // Swallow everything else so stray keys don't reach the typing area.
      e.preventDefault();
    }
  });

  // Click on the dim backdrop closes (resume).
  root.addEventListener("click", (e) => {
    if (e.target === root || (e.target instanceof Element && e.target.classList.contains("pmBackdrop"))) {
      close();
    }
  });

  return { isOpen, open, close, refresh };
})();

applyThemeChoice(themeChoice);
resetTest();

