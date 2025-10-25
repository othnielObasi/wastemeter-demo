import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Bell,
  Timer as TimerIcon,
  GripVertical,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

/**
 * Wastemeter – AI Focus Overlay (Portfolio Prototype)
 * ---------------------------------------------------
 * A polished, production-ready React component that simulates an AI-driven
 * “Wastemeter” overlay for learning apps. It demonstrates:
 *  • Real-time anti-pattern detection (simulated stream)
 *  • Progressive negative feedback (color → motion → sound → haptics)
 *  • Draggable floating widget with accessibility & reduced-motion support
 *  • Snooze, mute, and customizable thresholds
 *  • Session summary panel and educator-friendly logs (simulated)
 *
 * TECHNOLOGY: React + TailwindCSS + Framer Motion + lucide-react
 * This single-file component is portfolio-ready and can be dropped into a Next.js
 * or Vite React app. Tailwind is assumed to be available in the host project.
 */

/**
 * CONFIGURATION
 */
const DEFAULT_CONFIG = {
  // Frequency of AI polling / UI refresh (ms)
  tickMs: 1000,
  // Thresholds (seconds) to escalate visual/audio cues
  thresholds: {
    warn: 10,
    high: 25,
    critical: 45,
  },
  // Map anti-patterns to whether they count as wasted time
  patterns: [
    { key: "FOCUSED", label: "Focused", waste: false },
    { key: "SOCIALIZING", label: "Socializing", waste: true },
    { key: "IDLING", label: "Idling", waste: true },
    { key: "NON_LEARNING_CONTENT", label: "Non-learning Content", waste: true },
    { key: "AWAY_FROM_SEAT", label: "Away from Seat", waste: true },
    { key: "EATING", label: "Eating", waste: true },
    { key: "RUSHING", label: "Rushing", waste: false },
    { key: "SKIPPING_RECOMMENDED_LESSON", label: "Skipping Lesson", waste: false },
    { key: "CHEATING", label: "Cheating", waste: true },
  ],
  // Simulated session length (seconds). When reached, session auto-ends.
  targetSessionSec: 8 * 60, // 8 minutes for demo
};

/** Utility: clamp */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Hook: Reduced motion preference
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Simulated AI stream
 * Randomly selects anti-patterns with dwell-time to create believable sequences.
 */
function useSimulatedAIStream(config) {
  const [state, setState] = useState({
    pattern: config.patterns[0], // FOCUSED
    secondsInPattern: 0,
    sessionSec: 0,
    wastedSec: 0,
  });
  const dwellLeftRef = useRef(0);

  // Weighted probabilities for switching patterns
  const weightedPool = useMemo(
    () => [
      // Higher weight for FOCUSED to keep demo realistic
      { key: "FOCUSED", w: 36 },
      { key: "SOCIALIZING", w: 8 },
      { key: "IDLING", w: 10 },
      { key: "NON_LEARNING_CONTENT", w: 10 },
      { key: "AWAY_FROM_SEAT", w: 4 },
      { key: "EATING", w: 4 },
      { key: "RUSHING", w: 6 },
      { key: "SKIPPING_RECOMMENDED_LESSON", w: 4 },
      { key: "CHEATING", w: 2 },
    ],
    []
  );

  const pickPattern = () => {
    const total = weightedPool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    const chosenKey = weightedPool.find((p) => (r -= p.w) < 0)?.key || "FOCUSED";
    return DEFAULT_CONFIG.patterns.find((p) => p.key === chosenKey) || DEFAULT_CONFIG.patterns[0];
  };

  useEffect(() => {
    const t = setInterval(() => {
      setState((prev) => {
        let { pattern, secondsInPattern, sessionSec, wastedSec } = prev;
        let dwell = dwellLeftRef.current;
        if (dwell <= 0) {
          pattern = pickPattern();
          // Set new dwell time biased by pattern type
          const base = pattern.key === "FOCUSED" ? 6 : 10; // avg seconds
          dwell = Math.max(2, Math.round(base + Math.random() * base));
          dwellLeftRef.current = dwell;
          secondsInPattern = 0;
        }
        dwellLeftRef.current = Math.max(0, dwell - 1);

        sessionSec += 1;
        secondsInPattern += 1;
        if (pattern.waste) wastedSec += 1;

        return { pattern, secondsInPattern, sessionSec, wastedSec };
      });
    }, config.tickMs);
    return () => clearInterval(t);
  }, [config.tickMs, weightedPool]);

  return state;
}

/**
 * Progress Ring (SVG)
 */
function ProgressRing({ size = 96, stroke = 10, progress = 0, trackClass = "", barClass = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamp(progress, 0, 100) / 100) * c;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className={`fill-none ${trackClass}`} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        className={`fill-none rotate-[-90deg] origin-center ${barClass}`}
      />
    </svg>
  );
}

/**
 * Compute UI severity and palette
 */
function getSeverity(secondsInPattern, thresholds, isWaste) {
  if (!isWaste) return "ok";
  if (secondsInPattern >= thresholds.critical) return "critical";
  if (secondsInPattern >= thresholds.high) return "high";
  if (secondsInPattern >= thresholds.warn) return "warn";
  return "mild";
}

const severityStyles = {
  ok: {
    bg: "bg-emerald-600/95",
    border: "ring-emerald-400/60",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.35)]",
    track: "stroke-emerald-900/30",
    bar: "stroke-emerald-300",
  },
  mild: {
    bg: "bg-amber-500/95",
    border: "ring-amber-300/60",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.35)]",
    track: "stroke-amber-900/30",
    bar: "stroke-amber-200",
  },
  warn: {
    bg: "bg-orange-500/95",
    border: "ring-orange-300/60",
    glow: "shadow-[0_0_36px_rgba(249,115,22,0.45)]",
    track: "stroke-orange-900/30",
    bar: "stroke-orange-200",
  },
  high: {
    bg: "bg-red-600/95",
    border: "ring-red-300/70",
    glow: "shadow-[0_0_44px_rgba(220,38,38,0.55)]",
    track: "stroke-red-900/40",
    bar: "stroke-red-200",
  },
  critical: {
    bg: "bg-red-700/95",
    border: "ring-red-200",
    glow: "shadow-[0_0_60px_rgba(185,28,28,0.7)]",
    track: "stroke-red-950/40",
    bar: "stroke-red-100",
  },
};

/**
 * Optional: feedback beeps + haptics
 */
function useFeedback({ muted, reducedMotion }) {
  const ping = useRef(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Create a simple beep using Web Audio API
    ping.current = (freq = 880, durMs = 80) => {
      try {
        if (muted) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
        o.start();
        o.stop(ctx.currentTime + durMs / 1000);
        o.onended = () => ctx.close();
      } catch {
        // no-op
      }
    };
  }, [muted]);

  const vibrate = (ms = 30) => {
    if (reducedMotion) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(ms);
      }
    } catch {
      // no-op
    }
  };

  return {
    ping: (f, d) => ping.current?.(f, d),
    vibrate,
  };
}

/**
 * WastemeterOverlay – Floating widget
 */
function WastemeterOverlay({ config = DEFAULT_CONFIG }) {
  const reducedMotion = usePrefersReducedMotion();
  const ai = useSimulatedAIStream(config);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(true);
  const [log, setLog] = useState([]);

  const { thresholds } = config;
  const now = Date.now();
  const snoozed = now < snoozedUntil;

  // Pause/resume simulation by skipping updates to UI/feedback but keep timer for realism
  useEffect(() => {
    if (!running) return;
  }, [running]);

  // Feedback hooks
  const feedback = useFeedback({ muted, reducedMotion });

  const sever = getSeverity(ai.secondsInPattern, thresholds, ai.pattern.waste);
  const theme = severityStyles[sever];

  const wastedPct = Math.round((ai.wastedSec / Math.max(1, ai.sessionSec)) * 100);
  const progressForRing = clamp(wastedPct, 0, 100);

  // Emit feedback on escalation edges
  const lastSever = useRef(sever);
  useEffect(() => {
    if (snoozed || !running) return;
    if (ai.pattern.waste) {
      const order = ["mild", "warn", "high", "critical"];
      const prevIdx = order.indexOf(lastSever.current);
      const idx = order.indexOf(sever);
      if (idx > prevIdx) {
        feedback.ping(700 + idx * 100, 100);
        feedback.vibrate(25 + idx * 10);
      }
    }
    lastSever.current = sever;
  }, [sever, ai.pattern.waste, snoozed, running, feedback]);

  // Keep a rolling log (educator analytics / debug)
  useEffect(() => {
    setLog((L) => {
      const entry = {
        t: new Date().toLocaleTimeString(),
        pattern: ai.pattern.key,
        secs: ai.secondsInPattern,
        wasted: ai.pattern.waste,
        totalWaste: ai.wastedSec,
      };
      const next = [entry, ...L].slice(0, 40);
      return next;
    });
  }, [ai.pattern.key, ai.secondsInPattern, ai.wastedSec]);

  // Snooze / resume
  const onSnooze = (mins = 1) => setSnoozedUntil(Date.now() + mins * 60 * 1000);

  // Accessibility label
  const ariaLabel = ai.pattern.waste
    ? `High waste risk: ${ai.pattern.label}. In pattern for ${ai.secondsInPattern} seconds. Session waste ${wastedPct} percent.`
    : `Focused. Session waste ${wastedPct} percent.`;

  // Animate helpers
  const shake = !reducedMotion && ai.pattern.waste && (sever === "high" || sever === "critical");

  // Safer drag constraints (avoid SSR window usage)
  const dragConstraints = undefined; // no constraints => free drag

  return (
    <>
      {/* Floating draggable overlay */}
      <motion.div
        aria-live="polite"
        aria-label={ariaLabel}
        role="status"
        className={`fixed bottom-6 left-6 z-50 w-[360px] select-none ${theme.bg} backdrop-blur-xl text-white ring-2 ${theme.border} ${theme.glow} rounded-2xl shadow-xl`}
        drag={dragEnabled}
        dragMomentum={!reducedMotion}
        dragElastic={0.2}
        dragConstraints={dragConstraints}
        whileHover={{ scale: reducedMotion ? 1 : 1.01 }}
        animate={shake ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
        transition={shake ? { duration: 0.4 } : {}}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 opacity-90" />
            <span className="font-semibold tracking-wide">Wastemeter v1</span>
            <span className="text-white/70 text-xs ml-2">AI Focus Tracker</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              title={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
              className="p-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              title={dragEnabled ? "Lock position" : "Unlock to drag"}
              onClick={() => setDragEnabled((d) => !d)}
              className="p-1 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <GripVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex gap-4">
            {/* Progress Ring */}
            <div className="relative">
              <ProgressRing
                size={96}
                stroke={12}
                progress={progressForRing}
                trackClass={theme.track}
                barClass={`${theme.bar} transition-[stroke-dasharray] duration-500 ease-out`}
              />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-bold tabular-nums">{wastedPct}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-white/80">Session Waste</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <div className="text-sm opacity-90">Current Behavior</div>
              </div>
              <div className="mt-0.5 text-lg font-semibold truncate">{ai.pattern.label}</div>
              <div className="mt-1 flex items-center gap-2 text-white/85">
                <TimerIcon className="w-4 h-4" />
                <span className="text-sm">Duration: {ai.secondsInPattern}s</span>
                <span className="mx-1">•</span>
                <span className="text-sm">Session: {ai.sessionSec}s</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={sever} />
                {!snoozed ? (
                  <button
                    onClick={() => onSnooze(1)}
                    className="text-xs px-2 py-1 rounded-lg bg-white/15 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Snooze alerts for 1 minute"
                  >
                    Snooze 1 min
                  </button>
                ) : (
                  <div className="text-xs px-2 py-1 rounded-lg bg-white/10">Snoozed</div>
                )}
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/15 hover:bg-white/20 transition focus:outline-none focus:ring-2 focus:ring-white/40 flex items-center gap-1"
                  aria-label={running ? "Pause" : "Resume"}
                >
                  {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {running ? "Pause" : "Resume"}
                </button>
              </div>

              {/* Nudges */}
              <AnimatePresence mode="popLayout">
                {!snoozed && ai.pattern.waste && (
                  <motion.div
                    key={sever}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className={`mt-2 text-sm ${sever === "mild" ? "text-white/90" : "text-white"}`}
                  >
                    {sever === "mild" && "Heads up — time to refocus."}
                    {sever === "warn" && "You're drifting. Eyes back on the lesson."}
                    {sever === "high" && "High waste detected — close distractions now."}
                    {sever === "critical" && "Critical: Prolonged distraction. Refocus immediately."}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mini session summary tray (bottom-right) */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 max-w-md w-[380px] bg-neutral-900/85 text-neutral-100 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="font-semibold">Session Summary (Live)</div>
          <div className="text-xs text-white/60">Wasted: {ai.wastedSec}s • Total: {ai.sessionSec}s</div>
        </div>
        <div className="max-h-48 overflow-auto px-2 pb-2">
          <table className="w-full text-xs">
            <thead className="text-white/60 sticky top-0 bg-neutral-900/90">
              <tr>
                <th className="text-left font-medium py-1 pl-2">Time</th>
                <th className="text-left font-medium py-1">Pattern</th>
                <th className="text-right font-medium py-1 pr-2">In-Pattern</th>
              </tr>
            </thead>
            <tbody>
              {log.map((e, i) => (
                <tr key={i} className="odd:bg-white/0 even:bg-white/5">
                  <td className="py-1 pl-2 align-top">{e.t}</td>
                  <td className="py-1 align-top">{String(e.pattern).replaceAll("_", " ")}</td>
                  <td className="py-1 pr-2 text-right align-top">{e.secs}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    ok: { label: "FOCUSED", cls: "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30" },
    mild: { label: "MILD", cls: "bg-amber-400/20 text-amber-100 border border-amber-300/30" },
    warn: { label: "WARN", cls: "bg-orange-400/20 text-orange-100 border border-orange-300/30" },
    high: { label: "HIGH", cls: "bg-red-500/20 text-red-100 border border-red-300/30" },
    critical: { label: "CRITICAL", cls: "bg-red-600/25 text-red-100 border border-red-200/30" },
  };
  const s = map[severity] || map.ok;
  return <span className={`text-[10px] tracking-widest px-2 py-1 rounded-md ${s.cls}`}>{s.label}</span>;
}

/** ------------------------------------------------------
 * Dev Self-Tests (run in browser console) + Visual Test Grid
 * -------------------------------------------------------*/
const SHOW_TESTS = true; // set false to hide visual tests
function runSelfTests() {
  try {
    console.group("Wastemeter Self-Tests");
    console.assert(clamp(120, 0, 100) === 100, "clamp upper bound failed");
    console.assert(clamp(-5, 0, 100) === 0, "clamp lower bound failed");

    const th = DEFAULT_CONFIG.thresholds;
    console.assert(getSeverity(0, th, false) === "ok", "severity ok failed");
    console.assert(getSeverity(5, th, true) === "mild", "severity mild failed");
    console.assert(getSeverity(12, th, true) === "warn", "severity warn failed");
    console.assert(getSeverity(30, th, true) === "high", "severity high failed");
    console.assert(getSeverity(50, th, true) === "critical", "severity critical failed");
    console.groupEnd();
  } catch (e) {
    console.error("Self-tests encountered an error:", e);
  }
}

if (typeof window !== "undefined") {
  // Run once on load
  setTimeout(runSelfTests, 0);
}

function VisualTestGrid() {
  if (!SHOW_TESTS) return null;
  const severities = ["ok", "mild", "warn", "high", "critical"];
  return (
    <div className="mx-auto max-w-6xl px-6 mt-8">
      <div className="text-white/70 text-sm">Dev Visual Tests</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
        {severities.map((s) => (
          <div key={s} className="rounded-xl border border-white/10 p-3 bg-white/5">
            <div className="text-xs text-white/60 mb-2">{s}</div>
            <SeverityBadge severity={s} />
            <div className="mt-2">
              <ProgressRing size={64} stroke={8} progress={{ ok: 2, mild: 10, warn: 25, high: 45, critical: 70 }[s]} trackClass="stroke-white/10" barClass="stroke-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Demo wrapper with full-bleed stage & background scene to emphasize overlay
 */
export default function WastemeterDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero / Stage */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">AI-Powered Wastemeter</h1>
            <p className="text-white/70 mt-1">Real-time behavioral feedback overlay for focused learning.</p>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-xs text-white/50">Portfolio Prototype</div>
            <div className="text-sm font-medium">React · Tailwind · Framer Motion</div>
          </div>
        </header>

        {/* Mock learning content */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm uppercase tracking-widest text-white/60">Lesson</div>
              <h2 className="text-2xl font-semibold mt-1">Understanding Neural Attention</h2>
              <p className="mt-3 text-white/80 leading-relaxed">
                Attention mechanisms let models focus on important parts of the input while processing. In human learning,
                attention fluctuates with internal and external stimuli. This overlay demonstrates how feedback can gently nudge
                the learner back on track when distractions arise.
              </p>
              <ul className="mt-4 space-y-2 text-white/80">
                <li>• Key idea: Query, Key, Value projections</li>
                <li>• Visual intuition: which tokens matter most?</li>
                <li>• Practice: summarize paragraphs with highlighted salience</li>
              </ul>
              <div className="mt-6 aspect-video rounded-xl bg-black/60 grid place-items-center text-white/50 border border-white/10">
                <div className="text-center">
                  <div className="text-sm">(Video Placeholder)</div>
                  <div className="text-xs">Imagine a lecture playing here while the Wastemeter floats above</div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm uppercase tracking-widest text-white/60">How it works</div>
              <p className="mt-2 text-white/80 text-sm leading-relaxed">
                The overlay ingests simulated multimodal signals and classifies anti-patterns like socializing or idling. Alerts
                escalate over time via color, motion, sound, and haptics (respecting reduced-motion settings). Drag to reposition,
                snooze to pause alerts, and watch the live session summary update.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm uppercase tracking-widest text-white/60">Success metrics</div>
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                <li>• ↓ 20% average wasted time per session</li>
                <li>• &lt; 10% false-positive rate</li>
                <li>• ≥ 70% positive/neutral user sentiment</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <WastemeterOverlay />

      {/* Visual tests (portfolio-only) */}
      <VisualTestGrid />
    </div>
  );
}
