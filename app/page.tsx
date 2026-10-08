"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { Profile, UI } from "./strings";

type Lang = "en" | "ar" | "both";
type Mode = "verse" | "text";
type FatherOption = { url: string; father: string; work: string; preview: string };
type BookOption = { id: string; en: string; ar: string };

const CODE_KEY = "theobiblia-access-code";
const ERROR_MARK = "[[ERROR]]";

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
  const [profile, setProfile] = useState<Profile>("full");
  const [books, setBooks] = useState<BookOption[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const [mode, setMode] = useState<Mode>("verse");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseNo, setVerseNo] = useState("");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");

  const [verseLabel, setVerseLabel] = useState("");
  const [options, setOptions] = useState<FatherOption[]>([]);
  const [chosen, setChosen] = useState<FatherOption | null>(null);
  const [looking, setLooking] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  const [output, setOutput] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; err?: boolean }>({ msg: "" });
  const ctl = useRef<AbortController | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  const t = UI[profile];
  const isAr = profile === "arabic";

  // The Arabic version only ever answers in Arabic.
  useEffect(() => {
    if (isAr) setLang("ar");
  }, [isAr]);

  useEffect(() => {
    document.documentElement.lang = isAr ? "ar" : "en";
    document.documentElement.dir = t.dir;
  }, [isAr, t.dir]);

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
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setCode(c);
        setProfile(j.profile === "arabic" ? "arabic" : "full");
        setBooks(Array.isArray(j.books) ? j.books : []);
        setSignedIn(true);
        saveCode(c);
        return true;
      }
      setCodeError(j.error ?? UI.full.badCode);
      saveCode("");
      return false;
    } catch {
      setCodeError(UI.full.offline);
      return false;
    }
  }

  function handleAuthLoss(message?: string) {
    setSignedIn(false);
    saveCode("");
    setCodeError(message ?? t.reenter);
  }

  async function lookUp() {
    if (looking) return;
    const usingLink = link.trim() !== "";
    if (!usingLink && (!book || !chapter.trim() || !verseNo.trim())) {
      setStatus({ msg: t.needBook, err: true });
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
        body: JSON.stringify(usingLink ? { verse: link.trim() } : { book, chapter, verse: verseNo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401) handleAuthLoss(j.error);
        setStatus({ msg: j.error ?? t.generic, err: true });
        return;
      }
      setVerseLabel(j.verse ?? "");
      setOptions(j.options ?? []);
      if (!j.options?.length) setStatus({ msg: t.noneFound, err: true });
    } catch {
      setStatus({ msg: t.offline, err: true });
    } finally {
      setLooking(false);
    }
  }

  async function run(pick?: FatherOption) {
    if (busy) return;
    const target = pick ?? chosen;
    if (mode === "verse" && !target) {
      setStatus({ msg: t.needFather, err: true });
      return;
    }
    if (mode === "text" && !text.trim()) {
      setStatus({ msg: t.needText, err: true });
      return;
    }
    const payload =
      mode === "verse"
        ? { link: target!.url, verse: verseLabel, father: target!.father }
        : { text: text.trim() };
    if (pick) setChosen(pick);

    ctl.current = new AbortController();
    setBusy(true);
    setFromCache(false);
    setOutput("");
    setStatus({ msg: "" });

    try {
      const r = await fetch("/api/plain", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": code },
        body: JSON.stringify({ ...payload, lang }),
        signal: ctl.current.signal,
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) handleAuthLoss(j.error);
        setStatus({ msg: j.error ?? t.generic, err: true });
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
      if ((e as Error).name === "AbortError") setStatus({ msg: t.stopped });
      else setStatus({ msg: t.offline, err: true });
    } finally {
      setBusy(false);
    }
  }

  const [diag, setDiag] = useState("");
  async function testConnection() {
    setDiag("…");
    try {
      const r = await fetch("/api/diag", { method: "POST", headers: { "x-access-code": code } });
      const j = await r.json().catch(() => ({}));
      if (j.error) {
        setDiag(j.error);
        return;
      }
      const head = `${j.ok ? "✓" : "✗"} ${j.message ?? ""}`;
      const detail = [
        j.provider && `provider: ${j.provider}`,
        j.model && `model: ${j.model}`,
        j.endpoint,
        j.path,
        j.httpStatus && `HTTP ${j.httpStatus}`,
        j.stage && !j.ok && `stage: ${j.stage}`,
        j.keyShape && `key: ${j.keyShape}`,
        j.auth && `auth: ${j.auth}`,
        j.chain && `tries: ${j.chain}`,
        j.answeredBy && `answered by: ${j.answeredBy}`,
        j.cache && `cache: ${j.cache}`,
      ]
        .filter(Boolean)
        .join(" · ");
      setDiag([head, detail, j.body].filter(Boolean).join("\n"));
    } catch {
      setDiag(t.offline);
    }
  }

  async function copy() {
    const txt = outRef.current?.innerText.trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setStatus({ msg: t.copied });
    } catch {
      setStatus({ msg: t.copyFail });
    }
  }

  if (checking) return <main className="wrap" aria-busy="true" />;

  if (!signedIn) {
    const s = UI.full; // the sign-in page can't know the version yet
    return (
      <main className="wrap">
        <header>
          <div>
            <h1>
              {s.titleA} <span>{s.titleB}</span>
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
            {s.codeLabel}
          </label>
          <input
            id="code"
            type="password"
            autoComplete="current-password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={s.codePlaceholder}
          />
          <div className="actions">
            <button className="primary" type="submit">
              {s.continue}
            </button>
          </div>
          {codeError && <p className="status err">{codeError}</p>}
          <p className="hint">{s.codeHint}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header>
        <div>
          <h1>
            {t.titleA} <span>{t.titleB}</span>
          </h1>
          <p className="sub">{t.tagline}</p>
        </div>
        <button
          className="link"
          onClick={() => {
            saveCode("");
            setSignedIn(false);
            setCode("");
          }}
        >
          {t.signOut}
        </button>
      </header>

      <div className="desk">
        <section className="pane" aria-label={t.tabVerse}>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === "verse"} onClick={() => setMode("verse")}>
              {t.tabVerse}
            </button>
            <button role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}>
              {t.tabText}
            </button>
          </div>

          {mode === "verse" ? (
            <>
              <form
                className="ref-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  lookUp();
                }}
              >
                <div className="field book-field">
                  <label className="label" htmlFor="book">
                    {t.book}
                  </label>
                  <select id="book" value={book} onChange={(e) => setBook(e.target.value)}>
                    <option value="">{t.chooseBook}</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {isAr ? b.ar : `${b.en} — ${b.ar}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field num-field">
                  <label className="label" htmlFor="chapter">
                    {t.chapter}
                  </label>
                  <input
                    id="chapter"
                    type="text"
                    inputMode="numeric"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div className="field num-field">
                  <label className="label" htmlFor="verseno">
                    {t.verse}
                  </label>
                  <input
                    id="verseno"
                    type="text"
                    inputMode="numeric"
                    value={verseNo}
                    onChange={(e) => setVerseNo(e.target.value)}
                    placeholder="16"
                  />
                </div>
                <div className="field find-field">
                  <button className="primary" type="submit" disabled={looking}>
                    {looking ? t.finding : t.find}
                  </button>
                </div>
              </form>

              <details className="alt">
                <summary>{t.orLink}</summary>
                <input
                  id="link"
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder={t.linkPlaceholder}
                  dir="ltr"
                />
              </details>

              {verseLabel && <p className="hint">{verseLabel}</p>}

              {options.length > 0 && (
                <div className="fathers">
                  <p className="label">{t.pickOne(options.length)}</p>
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
                  <p className="hint">{t.moreHint}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.textPlaceholder}
                aria-label={t.tabText}
                dir="auto"
              />
              <div className="actions">
                <button className="primary" onClick={() => run()} disabled={busy}>
                  {t.makePlain}
                </button>
              </div>
            </>
          )}

          <fieldset>
            <legend className="label">{t.language}</legend>
            {isAr ? (
              <div className="seg">
                <span className="locked-lang">{t.langAr}</span>
              </div>
            ) : (
              <div className="seg">
                {(
                  [
                    ["en", t.langEn],
                    ["ar", t.langAr],
                    ["both", t.langBoth],
                  ] as const
                ).map(([v, l]) => (
                  <span key={v}>
                    <input type="radio" name="lang" id={`l-${v}`} checked={lang === v} onChange={() => setLang(v)} />
                    <label htmlFor={`l-${v}`}>{l}</label>
                  </span>
                ))}
              </div>
            )}
          </fieldset>

          {(chosen || busy) && (
            <div className="actions">
              {chosen && mode === "verse" && (
                <button onClick={() => run()} disabled={busy}>
                  {t.redo}
                </button>
              )}
              {busy && <button onClick={() => ctl.current?.abort()}>{t.stop}</button>}
            </div>
          )}
        </section>

        <section className="pane" aria-label={t.out} aria-live="polite">
          <div className="out-head">
            <p className="label">{t.out}</p>
            <div className="actions">
              {fromCache && <span className="badge saved">{t.saved}</span>}
              <button onClick={copy} disabled={!output}>
                {t.copy}
              </button>
            </div>
          </div>
          <div className="output" ref={outRef}>
            {output ? (
              <Markdown source={output} />
            ) : busy ? (
              <p className="placeholder thinking">{t.thinking}</p>
            ) : (
              <p className="placeholder">{t.idle}</p>
            )}
          </div>
          {status.msg && <p className={status.err ? "status err" : "status"}>{status.msg}</p>}
        </section>
      </div>

      <p className="note">{t.note}</p>

      <p className="made">
        {t.made} <span className="heart">&#9829;</span>
      </p>

      <details className="diag">
        <summary>Setup check</summary>
        <div className="actions">
          <button onClick={testConnection}>Test connection</button>
        </div>
        {diag && <pre className="diag-out">{diag}</pre>}
      </details>
    </main>
  );
}
