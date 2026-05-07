const DEFAULT_WORDS = [
  "breeze",
  "calm",
  "focus",
  "quiet",
  "gentle",
  "still",
  "zen",
  "steady",
  "rhythm",
  "soft",
  "glow",
  "drift",
  "simple",
  "practice",
  "clarity",
  "balance",
  "patience",
  "flow",
  "slow",
  "clean",
  "space",
  "breath",
  "light",
  "signal",
  "smooth",
  "fresh",
  "paper",
  "stone",
  "river",
  "forest",
  "sky",
  "lunar",
  "ember",
  "mist",
  "wave",
  "grain",
  "thread",
  "glass",
  "linen",
  "night",
  "dawn",
  "sound",
  "frame",
  "pulse",
  "hollow",
  "bright",
  "level",
  "kind",
  "warm",
  "north",
  "south",
  "east",
  "west",
  "blue",
  "green",
  "violet",
  "amber",
  "silver",
  "gold",
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
  duration: document.getElementById("duration"),
  timeLeft: document.getElementById("timeLeft"),
  wpm: document.getElementById("wpm"),
  acc: document.getElementById("acc"),
  words: document.getElementById("words"),
  typing: document.getElementById("typing"),
  restart: document.getElementById("restart"),
  hint: document.getElementById("hint"),
};

const state = {
  durationS: 60,
  startedAtMs: null,
  ended: false,
  tickTimer: null,
  wordIndex: 0,
  words: [],
  typedTotal: 0,
  correctTotal: 0,
  incorrectTotal: 0,
  seedBase: Math.floor(Date.now() / 1000),
};

function setTimeLeft(s) {
  els.timeLeft.textContent = String(Math.ceil(s));
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

function getTimeLeftS() {
  return clamp(state.durationS - getElapsedS(), 0, state.durationS);
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
  state.tickTimer = setInterval(tick, 50);
  els.hint.textContent = "Keep going. Tab restarts.";
}

function endTest() {
  if (state.ended) return;
  state.ended = true;
  clearTick();
  setTimeLeft(0);
  const { wpm, acc } = computeStats(state.durationS);
  setWpm(Math.max(0, Math.floor(wpm)));
  setAcc(Math.max(0, Math.floor(acc)));
  els.typing.blur();
  els.hint.textContent = "Done. Press Tab to restart.";
}

function tick() {
  const left = getTimeLeftS();
  setTimeLeft(left);
  const elapsed = getElapsedS();
  const { wpm, acc } = computeStats(elapsed);
  setWpm(Math.max(0, Math.floor(wpm)));
  setAcc(Math.max(0, Math.floor(acc)));

  if (left <= 0.001) endTest();
}

function buildWordsUi() {
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

  const active = els.words.querySelector(`.word[data-word-index="${state.wordIndex}"]`);
  if (!active) return;

  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");

  const firstPending =
    active.querySelector(".char.pending") || active.querySelector(".char.incorrect");

  if (firstPending) {
    firstPending.insertAdjacentElement("beforebegin", caret);
  } else {
    active.appendChild(caret);
  }
}

function markActiveWord() {
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
    } else if (got === exp) {
      el.className = "char correct";
    } else {
      el.className = "char incorrect";
    }
  }

  placeCaret();
}

function advanceWord() {
  state.wordIndex += 1;
  if (state.wordIndex >= state.words.length) {
    const extra = pickWords({
      words: DEFAULT_WORDS,
      count: 40,
      seed: state.seedBase + state.wordIndex,
    });
    state.words.push(...extra);
    buildWordsUi();
  } else {
    markActiveWord();
  }
}

function resetTest() {
  clearTick();

  state.durationS = Number(els.duration.value);
  state.startedAtMs = null;
  state.ended = false;
  state.wordIndex = 0;
  state.typedTotal = 0;
  state.correctTotal = 0;
  state.incorrectTotal = 0;
  state.seedBase = Math.floor(Date.now() / 1000);

  state.words = pickWords({
    words: DEFAULT_WORDS,
    count: 60,
    seed: state.seedBase,
  });

  setTimeLeft(state.durationS);
  setWpm(null);
  setAcc(null);

  els.typing.value = "";
  els.typing.disabled = false;
  els.hint.textContent = "Press Tab to restart. Your first keystroke starts the timer.";

  buildWordsUi();
  els.typing.focus();
}

els.typing.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    resetTest();
    return;
  }
  if (state.ended) {
    if (e.key.length === 1 || e.key === "Backspace") {
      e.preventDefault();
      resetTest();
    }
    return;
  }

  if (e.key.length === 1 || e.key === "Backspace" || e.key === " ") startIfNeeded();

  if (e.key === " ") {
    e.preventDefault();
    const typed = els.typing.value;
    scoreWord(typed);
    advanceWord();
    els.typing.value = "";
    return;
  }
});

els.typing.addEventListener("input", () => {
  if (state.ended) return;
  updateWordUi(els.typing.value);
});

els.restart.addEventListener("click", () => resetTest());
els.duration.addEventListener("change", () => resetTest());

resetTest();

