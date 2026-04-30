/*
Design philosophy: Swiss International biomedical instrumentation. This page uses asymmetric workbench layout, IBM Plex typography, restrained emerald/amber/blue signal colors, and audit-friendly measurements that reinforce technical validation rather than decorative dashboard patterns.
*/
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CheckCircle2, Copy, Database, Gauge, RotateCcw, Sigma, SlidersHorizontal, TriangleAlert } from "lucide-react";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663181981883/5txTWg86sNj9Vqy8SxeBnA/ecg-lab-hero-6F6PZsfuLcakmsmR3HuSgk.webp";
const GRID_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663181981883/5txTWg86sNj9Vqy8SxeBnA/ecg-grid-panel-8SBhW4HqFjovzFyYeJ669g.webp";
const COEFFICIENT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663181981883/5txTWg86sNj9Vqy8SxeBnA/ecg-coefficient-card-P8emxupqy9hCS5jPuvWjbo.webp";

const DEFAULT_SAMPLE_RATE = 100;
const DEFAULT_SINE_HZ = 10;
const DEFAULT_CUTOFF_HZ = 0.8;
const MAX_CHART_POINTS = 1400;

function computeCoefficients(sampleRateHz: number, cutoffHz = DEFAULT_CUTOFF_HZ) {
  const k = Math.tan((Math.PI * cutoffHz) / sampleRateHz);
  const k2 = k * k;
  const kRoot2 = k * Math.SQRT2;
  const norm = 1 + kRoot2 + k2;
  return {
    b0: 1 / norm,
    b1: -2 / norm,
    b2: 1 / norm,
    a1: (2 * (k2 - 1)) / norm,
    a2: (1 - kRoot2 + k2) / norm,
  };
}

function applyEcgFilter(samples: number[], sampleRateHz: number, cutoffHz = DEFAULT_CUTOFF_HZ) {
  const c = computeCoefficients(sampleRateHz, cutoffHz);
  let w1 = 0;
  let w2 = 0;
  return samples.map((input) => {
    const output = c.b0 * input + w1;
    w1 = c.b1 * input - c.a1 * output + w2;
    w2 = c.b2 * input - c.a2 * output;
    return output;
  });
}

function generateSinusoid(frequencyHz: number, sampleRateHz: number, count: number, amplitude = 1) {
  return Array.from({ length: count }, (_, n) => amplitude * Math.sin((2 * Math.PI * frequencyHz * n) / sampleRateHz));
}

function parseSamples(text: string) {
  return text
    .replace(/[\[\](){};]/g, " ")
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

function formatSamples(samples: number[]) {
  return samples.map((value) => Number(value.toFixed(6))).join(" ");
}

function rms(values: number[]) {
  if (!values.length) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearson(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length < 2) return 0;
  const ax = a.slice(0, length);
  const bx = b.slice(0, length);
  const ma = mean(ax);
  const mb = mean(bx);
  let numerator = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < length; i += 1) {
    const va = ax[i] - ma;
    const vb = bx[i] - mb;
    numerator += va * vb;
    da += va * va;
    db += vb * vb;
  }
  return da > 0 && db > 0 ? numerator / Math.sqrt(da * db) : 0;
}

function safeFixed(value: number, digits = 6) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function createDemo(sampleRateHz: number, sineHz: number) {
  const count = 500;
  const sine = generateSinusoid(sineHz, sampleRateHz, count, 0.75);
  const baseline = generateSinusoid(0.1, sampleRateHz, count, 0.45);
  const respiration = generateSinusoid(0.33, sampleRateHz, count, 0.18);
  const original = sine.map((value, index) => value + baseline[index] + respiration[index]);
  const filtered = applyEcgFilter(original, sampleRateHz);
  return { original, filtered };
}

function downsampleIndices(length: number, maxPoints: number) {
  if (length <= maxPoints) return Array.from({ length }, (_, index) => index);
  const step = Math.ceil(length / maxPoints);
  const indices: number[] = [];
  for (let i = 0; i < length; i += step) indices.push(i);
  if (indices[indices.length - 1] !== length - 1) indices.push(length - 1);
  return indices;
}

function AppMetric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "border-emerald-500/40 bg-emerald-50/70" : tone === "warn" ? "border-amber-500/50 bg-amber-50/80" : "border-slate-200 bg-white/78";
  return (
    <div className={`metric-card ${toneClass}`}>
      <p className="metric-label">{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

export default function Home() {
  const [sampleRateHz, setSampleRateHz] = useState(DEFAULT_SAMPLE_RATE);
  const [sineHz, setSineHz] = useState(DEFAULT_SINE_HZ);
  const [ignoreTransient, setIgnoreTransient] = useState(300);
  const initialDemo = useMemo(() => createDemo(DEFAULT_SAMPLE_RATE, DEFAULT_SINE_HZ), []);
  const [originalText, setOriginalText] = useState(() => formatSamples(initialDemo.original));
  const [filteredText, setFilteredText] = useState(() => formatSamples(initialDemo.filtered));

  const original = useMemo(() => parseSamples(originalText), [originalText]);
  const receivedFiltered = useMemo(() => parseSamples(filteredText), [filteredText]);
  const expectedFiltered = useMemo(() => applyEcgFilter(original, sampleRateHz), [original, sampleRateHz]);
  const sineReference = useMemo(() => generateSinusoid(sineHz, sampleRateHz, original.length || receivedFiltered.length || 1), [sineHz, sampleRateHz, original.length, receivedFiltered.length]);

  const analysis = useMemo(() => {
    const length = Math.min(original.length, receivedFiltered.length, expectedFiltered.length);
    const start = Math.min(Math.max(0, ignoreTransient), Math.max(0, length - 1));
    const filteredSlice = receivedFiltered.slice(start, length);
    const expectedSlice = expectedFiltered.slice(start, length);
    const originalSlice = original.slice(start, length);
    const errors = filteredSlice.map((value, index) => value - expectedSlice[index]);
    const absoluteErrors = errors.map(Math.abs);
    const rmse = rms(errors);
    const maxAbsError = absoluteErrors.length ? Math.max(...absoluteErrors) : 0;
    const correlationToReference = pearson(filteredSlice, expectedSlice);
    const dcBefore = Math.abs(mean(originalSlice));
    const dcAfter = Math.abs(mean(filteredSlice));
    const rmsBefore = rms(originalSlice);
    const rmsAfter = rms(filteredSlice);
    const ratio = rmsBefore > 0 ? rmsAfter / rmsBefore : 0;
    const pass = length > 0 && rmse <= 1e-4 && maxAbsError <= 1e-3;
    const warning = original.length !== receivedFiltered.length;
    return { length, start, rmse, maxAbsError, correlationToReference, dcBefore, dcAfter, rmsBefore, rmsAfter, ratio, pass, warning };
  }, [expectedFiltered, ignoreTransient, original, receivedFiltered]);

  const coefficients = useMemo(() => computeCoefficients(sampleRateHz), [sampleRateHz]);

  const chartData = useMemo(() => {
    const length = Math.max(original.length, receivedFiltered.length, expectedFiltered.length, sineReference.length);
    const indices = downsampleIndices(length, MAX_CHART_POINTS);
    return indices.map((index) => ({
      index,
      time: index / sampleRateHz,
      original: original[index] ?? null,
      received: receivedFiltered[index] ?? null,
      expected: expectedFiltered[index] ?? null,
      sine: sineReference[index] ?? null,
      positiveTolerance: expectedFiltered[index] != null ? expectedFiltered[index] + 0.001 : null,
      negativeTolerance: expectedFiltered[index] != null ? expectedFiltered[index] - 0.001 : null,
    }));
  }, [expectedFiltered, original, receivedFiltered, sampleRateHz, sineReference]);

  function loadDemo(nextFrequency = sineHz) {
    const demo = createDemo(sampleRateHz, nextFrequency);
    setOriginalText(formatSamples(demo.original));
    setFilteredText(formatSamples(demo.filtered));
  }

  function copyExpected() {
    navigator.clipboard?.writeText(formatSamples(expectedFiltered));
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f1ea] text-slate-900">
      <section className="hero-shell" style={{ backgroundImage: `linear-gradient(90deg, rgba(244,241,234,.96) 0%, rgba(244,241,234,.86) 48%, rgba(244,241,234,.35) 100%), url(${HERO_IMAGE})` }}>
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Activity size={15} /> UnifiedMeasurement · ECG HPF 0.8 Hz</div>
            <h1>Visual validator for the ECG filter on the <span>neolink</span> branch</h1>
            <p>
              Paste the original samples and the filtered samples received from the parser. This page recalculates the same 2nd-order Butterworth high-pass filter used in <code>UnifiedMeasurement</code>, overlays a reference sine wave, and measures error, correlation, RMS, and slow-component removal.
            </p>
          </div>
          <aside className="coefficient-card" style={{ backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.90), rgba(255,255,255,.78)), url(${COEFFICIENT_IMAGE})` }}>
            <p>active coefficients</p>
            <dl>
              <div><dt>b0</dt><dd>{safeFixed(coefficients.b0, 8)}</dd></div>
              <div><dt>b1</dt><dd>{safeFixed(coefficients.b1, 8)}</dd></div>
              <div><dt>b2</dt><dd>{safeFixed(coefficients.b2, 8)}</dd></div>
              <div><dt>a1</dt><dd>{safeFixed(coefficients.a1, 8)}</dd></div>
              <div><dt>a2</dt><dd>{safeFixed(coefficients.a2, 8)}</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="workbench">
        <aside className="input-rail">
          <div className="panel settings-panel">
            <div className="panel-title"><SlidersHorizontal size={17} /> Parameters</div>
            <label>
              Sample rate (Hz)
              <input type="number" min="1" value={sampleRateHz} onChange={(event) => setSampleRateHz(Math.max(1, Number(event.target.value) || DEFAULT_SAMPLE_RATE))} />
            </label>
            <label>
              Reference sine wave (Hz)
              <input type="number" min="0.01" step="0.01" value={sineHz} onChange={(event) => setSineHz(Math.max(0.01, Number(event.target.value) || DEFAULT_SINE_HZ))} />
            </label>
            <label>
              Ignore initial transient (samples)
              <input type="number" min="0" value={ignoreTransient} onChange={(event) => setIgnoreTransient(Math.max(0, Number(event.target.value) || 0))} />
            </label>
            <div className="button-row">
              <button onClick={() => loadDemo()}><RotateCcw size={15} /> Demo</button>
              <button onClick={copyExpected}><Copy size={15} /> Copy expected</button>
            </div>
          </div>

          <div className="panel text-panel">
            <label>
              Original samples
              <textarea value={originalText} onChange={(event) => setOriginalText(event.target.value)} spellCheck={false} />
            </label>
            <label>
              Received filtered samples
              <textarea value={filteredText} onChange={(event) => setFilteredText(event.target.value)} spellCheck={false} />
            </label>
          </div>
        </aside>

        <section className="analysis-deck">
          <div className="status-strip">
            <div className={`status-badge ${analysis.pass ? "pass" : "review"}`}>
              {analysis.pass ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
              {analysis.pass ? "matches the filter" : "review tolerance or input"}
            </div>
            <div className="status-note">
              {analysis.warning ? "The vectors have different lengths; metrics use only the intersection." : `Comparing ${analysis.length} samples after index ${analysis.start}.`}
            </div>
          </div>

          <div className="metrics-grid">
            <AppMetric label="RMSE vs. reference" value={safeFixed(analysis.rmse, 8)} detail="root mean square error of the received filter output" tone={analysis.rmse <= 1e-4 ? "good" : "warn"} />
            <AppMetric label="Maximum absolute error" value={safeFixed(analysis.maxAbsError, 8)} detail="largest point-by-point difference" tone={analysis.maxAbsError <= 1e-3 ? "good" : "warn"} />
            <AppMetric label="Correlation" value={safeFixed(analysis.correlationToReference, 6)} detail="received filtered × expected filtered" tone={analysis.correlationToReference >= 0.999 ? "good" : "neutral"} />
            <AppMetric label="DC before → after" value={`${safeFixed(analysis.dcBefore, 5)} → ${safeFixed(analysis.dcAfter, 5)}`} detail="absolute mean after transient" tone={analysis.dcAfter <= analysis.dcBefore ? "good" : "warn"} />
          </div>

          <div className="chart-panel" style={{ backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.93), rgba(255,255,255,.90)), url(${GRID_IMAGE})` }}>
            <header>
              <div>
                <p><Gauge size={16} /> comparative trace</p>
                <h2>Original, received filtered, expected filtered, and sine wave</h2>
              </div>
              <span>{chartData.length} rendered points</span>
            </header>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 18, right: 28, bottom: 12, left: 8 }}>
                  <CartesianGrid stroke="#cbd5d1" strokeDasharray="2 6" />
                  <XAxis dataKey="time" type="number" tickFormatter={(value) => `${Number(value).toFixed(1)}s`} stroke="#52605b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#52605b" tick={{ fontSize: 11 }} width={46} />
                  <Tooltip formatter={(value: number | string) => (typeof value === "number" ? safeFixed(value, 6) : value)} labelFormatter={(label) => `time: ${safeFixed(Number(label), 4)} s`} contentStyle={{ borderRadius: 0, border: "1px solid #94a39e", fontFamily: "IBM Plex Mono, monospace" }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: 12 }} />
                  <Area type="monotone" dataKey="positiveTolerance" name="tolerance +0.001" stroke="none" fill="#f2b84b" fillOpacity={0.06} isAnimationActive={false} />
                  <Line type="monotone" dataKey="original" name="original" stroke="#55706b" strokeWidth={1.25} dot={false} opacity={0.58} isAnimationActive={false} />
                  <Line type="monotone" dataKey="received" name="received filtered" stroke="#0c6b56" strokeWidth={2.1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="expected" name="expected filtered" stroke="#1e67a6" strokeWidth={1.8} dot={false} strokeDasharray="7 5" isAnimationActive={false} />
                  <Line type="monotone" dataKey="sine" name="sine wave" stroke="#c98222" strokeWidth={1.3} dot={false} opacity={0.8} isAnimationActive={false} />
                  <ReferenceLine y={0} stroke="#26332f" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="method-grid">
            <article>
              <h3><Sigma size={17} /> How to validate</h3>
              <p>Use a synthetic signal with a low-frequency component added to a passband sine wave. The filtered output should match the reference recalculated here, and the slow component should drop after the initial transient.</p>
            </article>
            <article>
              <h3><Database size={17} /> What to paste</h3>
              <p>Numbers separated by spaces, commas, line breaks, or semicolons are accepted. Paste exactly the vector before filtering and the vector returned by <code>measurement.ecgMV()</code>.</p>
            </article>
            <article>
              <h3><Activity size={17} /> Mirrored formula</h3>
              <p>The page uses <code>tan(π × 0.8 / fs)</code> and the same transposed direct-form II equation as the C++ implementation to reduce divergence between the tool and the code.</p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
