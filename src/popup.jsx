import { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";

// ── DATA MAPS ────────────────────────────────────────────────────────────────

const NATO = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo",
  F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliet",
  K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar",
  P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango",
  U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee",
  Z: "Zulu",
};
const NUMBER_WORDS = {
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine",
};
const SYMBOL_NAMES = {
  "-": "Dash", "_": "Underscore", ".": "Period", "/": "Slash",
  "\\": "Backslash", "@": "At", "#": "Pound", "$": "Dollar",
  "%": "Percent", "&": "Ampersand", "*": "Asterisk", "+": "Plus",
  "=": "Equals", "?": "Question", "!": "Exclamation", ":": "Colon",
  ";": "Semicolon", "(": "Open-Paren", ")": "Close-Paren",
  "[": "Open-Bracket", "]": "Close-Bracket", "<": "Less-Than",
  ">": "Greater-Than", ",": "Comma", "'": "Apostrophe", '"': "Quote",
  " ": "Space",
};

const FONTS = [
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Courier New",    value: "'Courier New', monospace"    },
  { label: "Fira Code",      value: "'Fira Code', monospace"      },
  { label: "IBM Plex Mono",  value: "'IBM Plex Mono', monospace"  },
];

const COLORBLIND_THEME = {
  nato: "#0077BB", number: "#EE7733", symbol: "#AA3377", custom: "#009988",
};
const DEFAULT_THEME = {
  nato: "#60a5fa", number: "#fb923c", symbol: "#a78bfa", custom: "#fbbf24",
};

const DARK = {
  bg: "#0a0a0f", bgSecondary: "#0f0f1a", bgTertiary: "#13131f",
  border: "#1e1e2e", borderMid: "#2a2a3e",
  text: "#e2e8f0", textMuted: "#6b7280", textFaint: "#4a4a6a",
  textGhost: "#3a3a5a", textDeep: "#2a2a3e",
};
const LIGHT = {
  bg: "#f5f5f8", bgSecondary: "#ffffff", bgTertiary: "#f0f0f5",
  border: "#dcdce8", borderMid: "#c8c8dc",
  text: "#1a1a2e", textMuted: "#6b7280", textFaint: "#8888a0",
  textGhost: "#9999b0", textDeep: "#d0d0e0",
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function parseString(input, customWords, suppressCustom) {
  return input.split("").map((char) => {
    const upper = char.toUpperCase();
    if (!suppressCustom && customWords[upper]) {
      const words = customWords[upper];
      const word  = words.length > 1 ? pickRandom(words) : words[0];
      return { char, word, type: "custom", natoFallback: NATO[upper] || null };
    }
    if (NATO[upper])        return { char, word: NATO[upper],        type: "nato"   };
    if (NUMBER_WORDS[char]) return { char, word: NUMBER_WORDS[char], type: "number" };
    if (SYMBOL_NAMES[char]) return { char, word: SYMBOL_NAMES[char], type: "symbol" };
    return { char, word: char, type: "unknown" };
  });
}

// ── EXTENSION STORAGE (mirrors usePersisted but uses chrome.storage.local) ──

const STORAGE_DEFAULTS = {
  as_theme:           "system",
  as_font:            FONTS[0].value,
  as_colorblind:      false,
  as_colors:          DEFAULT_THEME,
  as_customWords:     {},
  as_suppress:        false,
  as_verbose_numbers: false,
  as_verbose_symbols: false,
};

function useExtStorage(key) {
  const [value, setValue] = useState(STORAGE_DEFAULTS[key]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key] !== undefined) setValue(result[key]);
      setReady(true);
    });
    const listener = (changes) => {
      if (changes[key]) setValue(changes[key].newValue);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  const set = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      chrome.storage.local.set({ [key]: resolved });
      return resolved;
    });
  }, [key]);

  return [value, set, ready];
}

// ── TOGGLE PILL ──────────────────────────────────────────────────────────────

function TogglePill({ on, onToggle, activeColor }) {
  return (
    <div onClick={onToggle} style={{
      width: "36px", height: "20px",
      background: on ? activeColor : "#4b5563",
      borderRadius: "10px", position: "relative", cursor: "pointer",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: "2px", left: on ? "17px" : "2px",
        width: "14px", height: "14px", background: "#fff", borderRadius: "50%",
        transition: "left 0.2s", boxShadow: "0 1px 3px #0005",
      }} />
    </div>
  );
}

// ── MAIN POPUP ───────────────────────────────────────────────────────────────

function Popup() {
  const [themePreference,  , themeReady]   = useExtStorage("as_theme");
  const [font]                             = useExtStorage("as_font");
  const [colorblind]                       = useExtStorage("as_colorblind");
  const [colors]                           = useExtStorage("as_colors");
  const [customWords]                      = useExtStorage("as_customWords");
  const [suppressCustom,  setSuppressCustom] = useExtStorage("as_suppress");
  const [verboseNumbers]                   = useExtStorage("as_verbose_numbers");
  const [verboseSymbols]                   = useExtStorage("as_verbose_symbols");

  const [input,   setInput]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const [systemDark, setSystemDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Detect system dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // On open via context menu right-click, load pending text from session storage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "readback") {
      chrome.storage.session.get("pendingText", (result) => {
        if (result.pendingText) {
          setInput(result.pendingText);
          chrome.storage.session.remove("pendingText");
        }
      });
    }
  }, []);

  const isDark       = themePreference === "system" ? systemDark : themePreference === "dark";
  const p            = isDark ? DARK : LIGHT;
  const activeColors = colorblind ? COLORBLIND_THEME : colors;
  const parsed       = input ? parseString(input, customWords, suppressCustom) : [];
  const getColor     = (type) => type === "unknown" ? p.textMuted : activeColors[type];

  const gradientText = `linear-gradient(135deg, ${activeColors.nato}, ${activeColors.number}, ${activeColors.symbol}, ${activeColors.custom})`;

  const copyOutput = useCallback(() => {
    if (!parsed.length) return;
    navigator.clipboard.writeText(
      parsed.map((t) => {
        if (t.type === "number" && !verboseNumbers) return t.char;
        if (t.type === "symbol" && !verboseSymbols) return t.char;
        return `${t.char.toUpperCase()} as in ${t.word}`;
      }).join(" | ")
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [parsed, verboseNumbers, verboseSymbols]);

  if (!themeReady) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${p.bg}; }
        .char-grid {
          display: flex; flex-wrap: wrap; gap: 6px; padding: 12px;
        }
        .char-card {
          display: flex; flex-direction: column; align-items: center;
          min-width: 58px; flex: 0 0 auto; padding: 7px 8px; gap: 3px;
          border-radius: 4px;
        }
        textarea:focus { outline: none; }
        input:focus { outline: none; }
      `}</style>

      <div style={{
        width: "500px", background: p.bg, color: p.text,
        fontFamily: "'IBM Plex Mono', monospace",
        transition: "background 0.2s, color 0.2s",
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${p.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "#0d0d18" : "#ebebf3",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              fontSize: "15px", fontWeight: "800", letterSpacing: "-0.3px",
              background: gradientText,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              AlphabetSoup
            </div>
            {/* Settings gear */}
            <div
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Settings"
              style={{
                fontSize: "14px", cursor: "pointer", opacity: 0.5,
                transition: "opacity 0.2s", lineHeight: 1,
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.5}
            >⚙️</div>
          </div>

          {/* Spice toggle */}
          <div
            onClick={() => setSuppressCustom(!suppressCustom)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
              background: suppressCustom ? p.bgSecondary : `${activeColors.custom}18`,
              border: `1px solid ${suppressCustom ? p.borderMid : activeColors.custom + "55"}`,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "12px" }}>{suppressCustom ? "🧂" : "🌶️"}</span>
            <span style={{
              fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase",
              color: suppressCustom ? p.textFaint : activeColors.custom,
            }}>
              {suppressCustom ? "NATO Only" : "Spice Active"}
            </span>
            <TogglePill
              on={!suppressCustom}
              onToggle={() => setSuppressCustom(!suppressCustom)}
              activeColor={activeColors.custom}
            />
          </div>
        </div>

        {/* ── INPUT ── */}
        <div style={{ padding: "12px 14px 8px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type a string to read back..."
            rows={2}
            autoFocus
            style={{
              width: "100%", resize: "vertical",
              padding: "10px 12px",
              background: p.bgSecondary,
              border: `1px solid ${p.borderMid}`,
              borderRadius: "6px",
              color: p.text,
              fontFamily: font,
              fontSize: "14px", lineHeight: "1.5",
              transition: "background 0.2s, border-color 0.2s",
            }}
          />
        </div>

        {/* ── OUTPUT ── */}
        {parsed.length > 0 ? (
          <div>
            {/* Card grid */}
            <div className="char-grid" style={{ fontFamily: font }}>
              {parsed.map((token, i) => (
                <div key={i} className="char-card" style={{
                  background: `${getColor(token.type)}12`,
                  border: `1px solid ${getColor(token.type)}33`,
                }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: getColor(token.type), lineHeight: 1 }}>
                    {token.char === " " ? "·" : token.char.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "10px", color: getColor(token.type), textAlign: "center", lineHeight: 1.3 }}>
                    {token.word}
                  </span>
                  {token.type === "custom" && token.natoFallback && (
                    <span style={{ fontSize: "8px", color: p.textGhost }}>
                      {token.natoFallback}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Linear readback */}
            <div style={{
              padding: "8px 14px 4px",
              borderTop: `1px solid ${p.border}`,
              fontSize: "11px", lineHeight: "2.2", fontFamily: font,
            }}>
              {parsed.map((token, i) => {
                const isShort = (token.type === "number" && !verboseNumbers)
                             || (token.type === "symbol" && !verboseSymbols);
                return (
                  <span key={i}>
                    <span style={{ color: getColor(token.type), fontWeight: "700" }}>
                      {token.char === " " ? "·" : token.char.toUpperCase()}
                    </span>
                    {!isShort && (
                      <>
                        <span style={{ color: p.textGhost }}> as in </span>
                        <span style={{ color: getColor(token.type) }}>{token.word}</span>
                      </>
                    )}
                    {i < parsed.length - 1 && (
                      <span style={{ color: p.textDeep }}> · </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* Copy + settings link */}
            <div style={{
              padding: "8px 14px 12px",
              borderTop: `1px solid ${p.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <a
                href="https://alphabetsoup.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "9px", color: p.textFaint, textDecoration: "none", letterSpacing: "1px" }}
              >
                alphabetsoup.app ↗
              </a>
              <button onClick={copyOutput} style={{
                padding: "6px 14px",
                background: copied ? `${activeColors.nato}22` : "none",
                border: `1px solid ${copied ? activeColors.nato : p.borderMid}`,
                borderRadius: "4px",
                color: copied ? activeColors.nato : p.textMuted,
                cursor: "pointer", fontSize: "10px", letterSpacing: "1px",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.2s",
              }}>
                {copied ? "✓ Copied" : "Copy Readback"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: "32px 14px",
            textAlign: "center",
            color: p.textDeep, fontSize: "10px", letterSpacing: "3px",
          }}>
            PASTE OR TYPE A STRING ABOVE
          </div>
        )}
      </div>
    </>
  );
}

// ── MOUNT ────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")).render(<Popup />);
