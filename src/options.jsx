import { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";

// ── DATA ─────────────────────────────────────────────────────────────────────

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

// ── STORAGE HOOK ─────────────────────────────────────────────────────────────

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

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function TogglePill({ on, onToggle, activeColor }) {
  return (
    <div onClick={onToggle} style={{
      width: "40px", height: "22px",
      background: on ? activeColor : "#4b5563",
      borderRadius: "11px", position: "relative", cursor: "pointer",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: "3px", left: on ? "19px" : "3px",
        width: "16px", height: "16px", background: "#fff", borderRadius: "50%",
        transition: "left 0.2s", boxShadow: "0 1px 3px #0005",
      }} />
    </div>
  );
}

function ThemeSelector({ value, onChange, accentColor, p }) {
  const opts = [
    { key: "system", icon: "⚙️", label: "System" },
    { key: "light",  icon: "☀️", label: "Light"  },
    { key: "dark",   icon: "🌙", label: "Dark"   },
  ];
  return (
    <div style={{
      display: "inline-flex", background: p.bgTertiary,
      border: `1px solid ${p.borderMid}`, borderRadius: "8px",
      padding: "3px", gap: "2px", flexShrink: 0,
    }}>
      {opts.map(({ key, icon, label }) => {
        const active = value === key;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            width: "90px", padding: "8px 0",
            background: active ? accentColor : "transparent",
            border: "none", borderRadius: "6px",
            color: active ? "#fff" : p.textMuted,
            cursor: "pointer", fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "5px", transition: "background 0.2s, color 0.2s",
          }}>
            <span style={{ fontSize: "13px", lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── MAIN OPTIONS PAGE ─────────────────────────────────────────────────────────

function Options() {
  const [themePreference, setThemePreference, themeReady] = useExtStorage("as_theme");
  const [font,            setFont]                        = useExtStorage("as_font");
  const [colorblind,      setColorblind]                  = useExtStorage("as_colorblind");
  const [colors,          setColors]                      = useExtStorage("as_colors");
  const [customWords,     setCustomWords]                  = useExtStorage("as_customWords");
  const [verboseNumbers,  setVerboseNumbers]               = useExtStorage("as_verbose_numbers");
  const [verboseSymbols,  setVerboseSymbols]               = useExtStorage("as_verbose_symbols");

  const [activeTab,  setActiveTab]  = useState("custom");
  const [newLetter,  setNewLetter]  = useState("");
  const [newWord,    setNewWord]    = useState("");
  const [saved,      setSaved]      = useState(false);
  const [systemDark, setSystemDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const isDark       = themePreference === "system" ? systemDark : themePreference === "dark";
  const p            = isDark ? DARK : LIGHT;
  const activeColors = colorblind ? COLORBLIND_THEME : colors;
  const gradientText = `linear-gradient(135deg, ${activeColors.nato}, ${activeColors.number}, ${activeColors.symbol}, ${activeColors.custom})`;

  const [importError, setImportError] = useState("");
  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  const exportSettings = () => {
    const payload = {
      version: 1,
      exported: new Date().toISOString(),
      settings: {
        theme:          themePreference,
        font,
        colorblind,
        colors,
        verboseNumbers,
        verboseSymbols,
        customWords,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "alphabetsoup-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── IMPORT ──────────────────────────────────────────────────────────────────
  const importSettings = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.settings) throw new Error("Invalid file — missing settings key.");
        const s = json.settings;
        if (s.theme          !== undefined) setThemePreference(s.theme);
        if (s.font           !== undefined) setFont(s.font);
        if (s.colorblind     !== undefined) setColorblind(s.colorblind);
        if (s.colors         !== undefined) setColors(s.colors);
        if (s.verboseNumbers !== undefined) setVerboseNumbers(s.verboseNumbers);
        if (s.verboseSymbols !== undefined) setVerboseSymbols(s.verboseSymbols);
        if (s.customWords    !== undefined) setCustomWords(s.customWords);
        flashSaved();
      } catch (err) {
        setImportError(err.message || "Failed to parse settings file.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const addWord = () => {
    const letter = newLetter.toUpperCase().trim();
    const word   = newWord.trim();
    if (!letter || !word || letter.length !== 1 || !/[A-Z]/.test(letter)) return;
    setCustomWords((prev) => ({
      ...prev,
      [letter]: [...(prev[letter] || []), word],
    }));
    setNewWord("");
    flashSaved();
  };

  const removeWord = (letter, idx) => {
    setCustomWords((prev) => {
      const updated = [...(prev[letter] || [])];
      updated.splice(idx, 1);
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[letter];
        return next;
      }
      return { ...prev, [letter]: updated };
    });
  };

  const labelStyle = {
    fontSize: "10px", letterSpacing: "2px", color: p.textMuted,
    textTransform: "uppercase", display: "block", marginBottom: "8px",
  };

  const cardStyle = {
    padding: "16px 20px", background: p.bgSecondary,
    border: `1px solid ${p.borderMid}`, borderRadius: "8px",
    transition: "background 0.25s, border-color 0.25s",
  };

  const toggleRowStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 18px", background: p.bgSecondary,
    borderRadius: "8px", gap: "16px", transition: "all 0.3s",
  };

  if (!themeReady) return null;

  const tabs = [
    { key: "custom", label: "Custom Words", icon: "🌶️" },
    { key: "style",  label: "Style",        icon: "🎨" },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100vh; background: ${p.bg}; }
        input:focus, textarea:focus, button:focus { outline: none; }
        .word-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 20px; font-size: 12px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .word-chip button {
          background: none; border: none; cursor: pointer;
          font-size: 14px; line-height: 1; padding: 0;
          opacity: 0.5; transition: opacity 0.2s;
        }
        .word-chip button:hover { opacity: 1; }
      `}</style>

      <div style={{
        minHeight: "100vh", background: p.bg, color: p.text,
        fontFamily: "'IBM Plex Mono', monospace",
        transition: "background 0.25s, color 0.25s",
      }}>

        {/* ── HEADER ── */}
        <div style={{
          borderBottom: `1px solid ${p.border}`,
          background: isDark ? "#0d0d18" : "#ebebf3",
          padding: "0 40px",
        }}>
          <div style={{
            maxWidth: "900px", margin: "0 auto",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            height: "64px",
          }}>
            <div>
              <div style={{
                fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px",
                background: gradientText,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>AlphabetSoup</div>
              <div style={{ fontSize: "9px", color: p.textFaint, letterSpacing: "3px", textTransform: "uppercase" }}>
                Settings
              </div>
            </div>
            {saved && (
              <div style={{
                fontSize: "11px", color: activeColors.nato,
                letterSpacing: "1px", textTransform: "uppercase",
              }}>
                ✓ Saved
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", gap: "4px" }}>
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: "12px 20px", background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab.key ? activeColors.nato : "transparent"}`,
                color: activeTab === tab.key ? activeColors.nato : p.textMuted,
                cursor: "pointer", fontSize: "11px", letterSpacing: "1.5px",
                textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace",
                display: "flex", alignItems: "center", gap: "6px",
                transition: "color 0.2s, border-color 0.2s",
              }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px" }}>

          {/* ══ CUSTOM WORDS TAB ══ */}
          {activeTab === "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

              {/* Verbose toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={labelStyle}>Readback Verbosity</div>

                <div style={{
                  ...toggleRowStyle,
                  border: `1px solid ${verboseNumbers ? activeColors.number + "55" : p.borderMid}`,
                }}>
                  <div>
                    <div style={{ fontSize: "13px", color: verboseNumbers ? activeColors.number : p.text, marginBottom: "3px", transition: "color 0.2s" }}>
                      Verbose Number Readback
                    </div>
                    <div style={{ fontSize: "11px", color: p.textMuted }}>
                      {verboseNumbers ? 'Numbers read as "5 as in Five"' : "Numbers read as digits only"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "12px", color: verboseNumbers ? activeColors.number : p.textMuted, width: "20px", textAlign: "right" }}>
                      {verboseNumbers ? "On" : "Off"}
                    </span>
                    <TogglePill on={verboseNumbers} onToggle={() => { setVerboseNumbers(!verboseNumbers); flashSaved(); }} activeColor={activeColors.number} />
                  </div>
                </div>

                <div style={{
                  ...toggleRowStyle,
                  border: `1px solid ${verboseSymbols ? activeColors.symbol + "55" : p.borderMid}`,
                }}>
                  <div>
                    <div style={{ fontSize: "13px", color: verboseSymbols ? activeColors.symbol : p.text, marginBottom: "3px", transition: "color 0.2s" }}>
                      Verbose Symbol Readback
                    </div>
                    <div style={{ fontSize: "11px", color: p.textMuted }}>
                      {verboseSymbols ? '- reads as "Dash"' : "Symbols read as character only"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "12px", color: verboseSymbols ? activeColors.symbol : p.textMuted, width: "20px", textAlign: "right" }}>
                      {verboseSymbols ? "On" : "Off"}
                    </span>
                    <TogglePill on={verboseSymbols} onToggle={() => { setVerboseSymbols(!verboseSymbols); flashSaved(); }} activeColor={activeColors.symbol} />
                  </div>
                </div>
              </div>

              {/* Add word form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={labelStyle}>Add Custom Word</div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <label style={labelStyle}>Letter</label>
                    <input
                      value={newLetter}
                      onChange={(e) => setNewLetter(e.target.value.slice(-1).toUpperCase())}
                      maxLength={1}
                      placeholder="A"
                      style={{
                        width: "60px", padding: "10px 12px",
                        background: p.bgSecondary, border: `1px solid ${p.borderMid}`,
                        borderRadius: "6px", color: activeColors.custom,
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: "16px",
                        fontWeight: "700", textAlign: "center", textTransform: "uppercase",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <label style={labelStyle}>Word</label>
                    <input
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addWord()}
                      placeholder="e.g. Apple"
                      style={{
                        width: "100%", padding: "10px 12px",
                        background: p.bgSecondary, border: `1px solid ${p.borderMid}`,
                        borderRadius: "6px", color: p.text,
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px",
                      }}
                    />
                  </div>
                  <button onClick={addWord} style={{
                    padding: "10px 20px",
                    background: activeColors.custom,
                    border: "none", borderRadius: "6px",
                    color: "#000", fontWeight: "700", cursor: "pointer",
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
                    letterSpacing: "1px", whiteSpace: "nowrap",
                    transition: "opacity 0.2s",
                  }}>
                    + Add
                  </button>
                </div>
              </div>

              {/* Word list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={labelStyle}>Your Words</div>
                {Object.keys(customWords).length === 0 ? (
                  <div style={{ ...cardStyle, color: p.textGhost, fontSize: "12px", textAlign: "center", padding: "32px" }}>
                    No custom words yet. Add one above.
                  </div>
                ) : (
                  Object.entries(customWords).sort(([a], [b]) => a.localeCompare(b)).map(([letter, words]) => (
                    <div key={letter} style={{ ...cardStyle, display: "flex", alignItems: "flex-start", gap: "16px" }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0,
                        background: `${activeColors.custom}22`,
                        border: `1px solid ${activeColors.custom}55`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "18px", fontWeight: "800", color: activeColors.custom,
                      }}>
                        {letter}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", flex: 1 }}>
                        {words.map((word, idx) => (
                          <span key={idx} className="word-chip" style={{
                            background: `${activeColors.custom}18`,
                            border: `1px solid ${activeColors.custom}44`,
                            color: activeColors.custom,
                          }}>
                            {word}
                            <button onClick={() => removeWord(letter, idx)} style={{ color: activeColors.custom }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* ══ STYLE TAB ══ */}
          {activeTab === "style" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

              {/* Appearance */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={labelStyle}>Appearance</div>

                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: p.text, marginBottom: "4px" }}>Theme</div>
                      <div style={{ fontSize: "11px", color: p.textMuted }}>
                        {themePreference === "system" ? `System · ${systemDark ? "dark" : "light"} active` :
                         themePreference === "dark" ? "Forced dark mode" : "Forced light mode"}
                      </div>
                    </div>
                    <ThemeSelector value={themePreference} onChange={(v) => { setThemePreference(v); flashSaved(); }} accentColor={activeColors.nato} p={p} />
                  </div>

                  <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: colorblind ? activeColors.nato : p.text, marginBottom: "4px", transition: "color 0.2s" }}>
                        Colorblind Mode
                      </div>
                      <div style={{ fontSize: "11px", color: p.textMuted }}>
                        Accessible palette for deuteranopia, protanopia &amp; tritanopia
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{ fontSize: "12px", color: colorblind ? activeColors.nato : p.textMuted, width: "20px", textAlign: "right" }}>
                        {colorblind ? "On" : "Off"}
                      </span>
                      <TogglePill on={colorblind} onToggle={() => { setColorblind(!colorblind); flashSaved(); }} activeColor={activeColors.nato} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Character Colors */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={labelStyle}>Character Colors</div>
                {[
                  { key: "nato",   label: "NATO Standard Letters" },
                  { key: "number", label: "Numbers"               },
                  { key: "symbol", label: "Symbols"               },
                  { key: "custom", label: "Custom Override Words"  },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                    <label htmlFor={`color-${key}`} style={{
                      width: "44px", height: "44px", borderRadius: "8px", flexShrink: 0,
                      background: activeColors[key], border: `2px solid ${p.borderMid}`,
                      cursor: colorblind ? "not-allowed" : "pointer",
                      display: "block", position: "relative", overflow: "hidden",
                    }}>
                      <input
                        id={`color-${key}`}
                        type="color"
                        value={colors[key]}
                        disabled={colorblind}
                        onChange={(e) => { setColors((prev) => ({ ...prev, [key]: e.target.value })); flashSaved(); }}
                        style={{ position: "absolute", top: 0, left: 0, width: "1px", height: "1px", opacity: 0 }}
                      />
                    </label>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "10px", letterSpacing: "2px", color: p.textMuted, textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
                      <div style={{ fontSize: "12px", color: colorblind ? p.textGhost : activeColors[key], opacity: colorblind ? 0.4 : 1 }}>
                        {colors[key]}
                      </div>
                    </div>
                    {!colorblind && (
                      <button onClick={() => { setColors((prev) => ({ ...prev, [key]: DEFAULT_THEME[key] })); flashSaved(); }} style={{
                        padding: "6px 14px", background: "none", flexShrink: 0,
                        border: `1px solid ${p.borderMid}`, borderRadius: "4px",
                        color: p.textMuted, cursor: "pointer", fontSize: "10px",
                        fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "1px",
                      }}>Reset</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Display Font */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={labelStyle}>Display Font</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {FONTS.map((f) => (
                    <div key={f.value} onClick={() => { setFont(f.value); flashSaved(); }} style={{
                      padding: "14px 18px", background: p.bgSecondary,
                      border: `1px solid ${font === f.value ? activeColors.nato + "99" : p.borderMid}`,
                      borderLeft: `3px solid ${font === f.value ? activeColors.nato : p.borderMid}`,
                      borderRadius: "6px", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      overflow: "hidden", transition: "border-color 0.2s",
                    }}>
                      <span style={{ fontFamily: f.value, color: font === f.value ? activeColors.nato : p.text, fontSize: "15px", transition: "color 0.2s" }}>
                        {f.label}
                      </span>
                      <span style={{ fontFamily: f.value, color: p.textFaint, fontSize: "13px", letterSpacing: "3px", flexShrink: 0 }}>
                        ABC-123
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ══ IMPORT / EXPORT ══ */}
          <div style={{
            marginTop: "16px", paddingTop: "28px",
            borderTop: `1px solid ${p.border}`,
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <div style={labelStyle}>Portable Settings</div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>

              {/* Export */}
              <button onClick={exportSettings} style={{
                padding: "10px 22px", borderRadius: "6px", cursor: "pointer",
                background: `${activeColors.nato}18`,
                border: `1px solid ${activeColors.nato}55`,
                color: activeColors.nato,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", letterSpacing: "1px",
                transition: "background 0.2s",
              }}>
                ↓ Export settings.json
              </button>

              {/* Import */}
              <label style={{
                padding: "10px 22px", borderRadius: "6px", cursor: "pointer",
                background: `${activeColors.custom}18`,
                border: `1px solid ${activeColors.custom}55`,
                color: activeColors.custom,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", letterSpacing: "1px",
                transition: "background 0.2s",
              }}>
                ↑ Import settings.json
                <input
                  type="file" accept=".json" onChange={importSettings}
                  style={{ display: "none" }}
                />
              </label>

              {importError && (
                <span style={{ fontSize: "11px", color: "#f87171" }}>{importError}</span>
              )}
            </div>
            <div style={{ fontSize: "10px", color: p.textGhost, lineHeight: 1.6 }}>
              Export your settings to a JSON file and import them on any device or in the web app at alphabetsoup.app
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── MOUNT ─────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")).render(<Options />);
