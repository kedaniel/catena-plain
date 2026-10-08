"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";

type Lang = "en" | "ar" | "both";
type Level = "simple" | "study";
type Mode = "verse" | "text";
type FatherOption = { url: string; father: string; work: string; preview: string };

const CODE_KEY = "theobiblia-access-code";
const ERROR_MARK = "[[ERROR]]";

const EXAMPLE = `**St. Augustine, Confessions I.1** *(example)*

## Plain version
Lord, you are great and you deserve all our praise. Your power is great, and your wisdom has no limit. Human beings want to praise you, even though we are only a tiny part of everything you made. We carry our mortality around with us, and it reminds us of our sin and that you oppose the proud. Even so, we still want to praise you. You stir us up to find joy in praising you, because you made us for yourself, and our hearts cannot rest until they rest in you.

## Words explained
- **Particle** — a very small part.
- **Mortality** — the fact that we will die.
- **Resistest the proud** — "you stand against proud people".
- **Repose** — rest, be at peace.

## Bible verses mentioned
- Psalm 145:3 — "Great is the Lord, and greatly to be praised"
- Psalm 147:5 — his understanding is without number
- James 4:6 / 1 Peter 5:5 — God resists the proud

## Main point
We are small, mortal and sinful, yet God made us for himself. That is why we long to praise him, and why nothing else can give our hearts real rest.`;

function readCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveCode(c: string) {
  try {
    if (c) localStorage.setItem(CODE_KEY, c);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* private mode: the code just isn't remembered */
  }
}

export default function Home() {
  const [code, setCode] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const [mode, setMode] = useState<Mode>("verse");
  const [verseInput, setVerseInput] = useState("");
  const [text, setText] = useState("");
  const [verseLabel, setVerseLabel] = useState("");
  const [options, setOptions] = useState<FatherOption[]>([]);
  const [chosen, setChosen] = useState<FatherOption | null>(null);
  const [looking, setLooking] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  const [level, setLevel] = useState<Level>("simple");

  const [output, setOutput] = useState(EXAMPLE);
  const [isExample, setIsExample] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });
  const ctl = useRef<AbortController | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = readCode();
    if (!saved) {
      setChecking(false);
      return;
    }
    verify(saved).finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(c: string): Promise<boolean> {
    setCodeError("");
    try {
      const r = await fetch("/api/check", { method: "POST", headers: { "x-access-code": c } });
      if (r.ok) {
        setCode(c);
        setSignedIn(true);
        saveCode(c);
        return true;
      }
      const j = await r.json().catch(() => ({}));
      setCodeError(j.error ?? "That code didn't work.");
      saveCode("");
      return false;
    } catch {
      setCodeError("Couldn't reach the app. Check your connection.");
      return false;
    }
  }

  function handleAuthLoss(message?: string) {
    setSignedIn(false);
    saveCode("");
    setCodeError(message ?? "Please enter the access code again.");
  }

  async function lookUp() {
    const q = verseInput.trim();
    if (!q || looking) {
      if (!q) setStatus({ msg: "Type a verse, or paste its link from Catena.", err: true });
      return;
    }
    setLooking(true);
    setStatus({ msg: "" });
    setOptions([]);
    setChosen(null);
    setVerseLabel("");
    try {
      const r = await fetch("/api/fathers", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": code },
        body: JSON.stringify({ verse: q }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) handleAuthLoss(j.error);
        setStatus({ msg: j.error ?? "Couldn't look that up.", err: true });
        return;
      }
      setVerseLabel(j.verse ?? "");
      setOptions(j.options ?? []);
      if (!j.options?.length) setStatus({ msg: "No commentaries found for that verse.", err: true });
    } catch {
      setStatus({ msg: "Couldn't reach the app. Check your connection.", err: true });
    } finally {
      setLooking(false);
    }
  }

  async function run(pick?: FatherOption) {
    if (busy) return;
    const target = pick ?? chosen;
    const payload =
      mode === "verse"
        ? { link: target?.url, verse: verseLabel, father: target?.father }
        : { text: text.trim() };
    if (mode === "verse" && !target) {
      setStatus({ msg: "Choose a Father first.", err: true });
      return;
    }
    if (mode === "text" && !text.trim()) {
      setStatus({ msg: "Paste the commentary text first.", err: true });
      return;
    }
    if (pick) setChosen(pick);

    ctl.current = new AbortController();
    setBusy(true);
    setIsExample(false);
    setFromCache(false);
    setOutput("");
    setStatus({ msg: "" });

    try {
      const r = await fetch("/api/plain", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": code },
        body: JSON.stringify({ ...payload, lang, level }),
        signal: ctl.current.signal,
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) handleAuthLoss(j.error);
        setStatus({ msg: j.error ?? "Something went wrong. Try again.", err: true });
        return;
      }
      setFromCache(r.headers.get("x-cache") === "hit");
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const at = acc.indexOf(ERROR_MARK);
        setOutput(at >= 0 ? acc.slice(0, at) : acc);
      }
      const at = acc.indexOf(ERROR_MARK);
      if (at >= 0) setStatus({ msg: acc.slice(at + ERROR_MARK.length).trim(), err: true });
    } catch (e) {
      if ((e as Error).name === "AbortError") setStatus({ msg: "Stopped." });
      else setStatus({ msg: "Couldn't reach the app. Check your connection.", err: true });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const t = outRef.current?.innerText.trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setStatus({ msg: "Copied." });
    } catch {
      setStatus({ msg: "Couldn't copy. Select the text and copy it instead." });
    }
  }

  if (checking) return <main className="wrap" aria-busy="true" />;

  if (!signedIn) {
    return (
      <main className="wrap">
        <header>
          <div>
            <h1>
              Theobiblia <span>Translator</span>
            </h1>
            <p className="sub">Church Fathers&apos; commentaries from Catena, in plain English or Arabic.</p>
          </div>
        </header>
        <form
          className="pane narrow"
          onSubmit={async (e) => {
            e.preventDefault();
            if (codeInput.trim()) await verify(codeInput.trim());
          }}
        >
          <label className="label" htmlFor="code">
            Access code
          </label>
          <input
            id="code"
            type="password"
            autoComplete="current-password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Enter the code you were given"
          />
          <div className="actions">
            <button className="primary" type="submit">
              Continue
            </button>
          </div>
          {codeError && <p className="status err">{codeError}</p>}
          <p className="hint">This app is shared with a small study group. Ask whoever sent you the link for the code.</p>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header>
        <div>
          <h1>
            Theobiblia <span>Translator</span>
          </h1>
          <p className="sub">
            Enter a verse, pick a Church Father, and read his commentary in plain language — with the hard words
            explained, the verses he cites, and his main point.
          </p>
        </div>
        <button
          className="link"
          onClick={() => {
            saveCode("");
            setSignedIn(false);
            setCode("");
          }}
        >
          Sign out
        </button>
      </header>

      <div className="desk">
        <section className="pane" aria-label="Choose a commentary">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === "verse"} onClick={() => setMode("verse")}>
              By verse
            </button>
            <button role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}>
              Paste text
            </button>
          </div>

          {mode === "verse" ? (
            <>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  lookUp();
                }}
              >
                <input
                  id="verse"
                  type="text"
                  value={verseInput}
                  onChange={(e) => setVerseInput(e.target.value)}
                  placeholder="John 3:16 — or paste a Catena link"
                  aria-label="Verse or Catena link"
                />
                <button className="primary" type="submit" disabled={looking} style={{ flex: "0 0 auto" }}>
                  {looking ? "Looking…" : "Find Fathers"}
                </button>
              </form>

              {verseLabel && <p className="hint">{verseLabel}</p>}

              {options.length > 0 && (
                <div className="fathers">
                  <p className="label">
                    {options.length} commentar{options.length === 1 ? "y" : "ies"} — pick one
                  </p>
                  <ul className="father-list">
                    {options.map((o) => (
                      <li key={o.url}>
                        <button
                          className={chosen?.url === o.url ? "father chosen" : "father"}
                          onClick={() => run(o)}
                          disabled={busy}
                        >
                          <span className="f-name">{o.father}</span>
                          {o.work && <span className="f-work">{o.work}</span>}
                          {o.preview && <span className="f-prev">{o.preview}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="hint">
                    Catena shows more commentaries behind its &quot;Show more&quot; button than appear here. For one of
                    those, open it in Catena and paste its link above.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the commentary text here…"
                aria-label="Commentary text"
              />
              <div className="actions">
                <button className="primary" onClick={() => run()} disabled={busy}>
                  Make it plain
                </button>
              </div>
            </>
          )}

          <fieldset>
            <legend className="label">Language</legend>
            <div className="seg">
              {(
                [
                  ["en", "English"],
                  ["ar", "العربية"],
                  ["both", "Both"],
                ] as const
              ).map(([v, l]) => (
                <span key={v}>
                  <input type="radio" name="lang" id={`l-${v}`} checked={lang === v} onChange={() => setLang(v)} />
                  <label htmlFor={`l-${v}`}>{l}</label>
                </span>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Level</legend>
            <div className="seg">
              {(
                [
                  ["simple", "Simple"],
                  ["study", "Bible study"],
                ] as const
              ).map(([v, l]) => (
                <span key={v}>
                  <input type="radio" name="level" id={`v-${v}`} checked={level === v} onChange={() => setLevel(v)} />
                  <label htmlFor={`v-${v}`}>{l}</label>
                </span>
              ))}
            </div>
          </fieldset>
          {mode === "verse" && chosen && (
            <div className="actions">
              <button onClick={() => run()} disabled={busy}>
                Redo in this language
              </button>
              {busy && <button onClick={() => ctl.current?.abort()}>Stop</button>}
            </div>
          )}
          {mode === "text" && busy && (
            <div className="actions">
              <button onClick={() => ctl.current?.abort()}>Stop</button>
            </div>
          )}
        </section>

        <section className="pane" aria-label="Plain version" aria-live="polite">
          <div className="out-head">
            <p className="label">Plain version</p>
            <div className="actions">
              {isExample && <span className="badge">Example</span>}
              {fromCache && <span className="badge saved">Saved earlier</span>}
              <button onClick={copy} disabled={!output}>
                Copy
              </button>
            </div>
          </div>
          <div className="output" ref={outRef}>
            {output ? (
              <Markdown source={output} />
            ) : busy ? (
              <p className="placeholder thinking">Reading the Father</p>
            ) : (
              <p className="placeholder">Pick a Father on the left to see his commentary in plain language.</p>
            )}
          </div>
          {status.msg && <p className={status.err ? "status err" : "status"}>{status.msg}</p>}
        </section>
      </div>

      <p className="note">
        The plain version can soften careful theological wording. Keep the original beside it, and check anything that
        sounds surprising against the source or ask a priest.
      </p>
    </main>
  );
}
