import "./OptimizationExample.css";
import type { ChapterStepProps } from "../../registry/types";

const decisions = ["Use", "Store", "Sell"];

export default function OptimizationExample({ step }: ChapterStepProps) {
  const reserve = step >= 1 ? "is-reserve" : "";
  const sell = step >= 2 ? "is-sell" : "";
  const raw = step >= 3 ? "is-raw" : "";
  const result = step >= 4 ? "is-result" : "";

  return (
    <section className={`oe-scene is-charge ${reserve} ${sell} ${raw} ${result}`}>
      <img
        className="oe-bg"
        src="/assets/optimization-24h.png"
        alt="Factory energy optimization map with solar, batteries, forklifts, grid and market routing"
      />
      <div className="oe-shade" />

      <div className="oe-title">
        <p className="kicker">NEXT 24 HOURS</p>
        <h2>Every kWh gets a job.</h2>
      </div>

      <div className="oe-day-arc">
        <span>morning</span>
        <i className="oe-sun" />
        <span>evening</span>
      </div>

      <div className="oe-action oe-charge card">
        <span className="label-mono">NOON PEAK</span>
        <strong>charge batteries + forklifts</strong>
        <div className="oe-mini-bars">
          <i />
          <i />
        </div>
      </div>

      <div className="oe-action oe-reserve card">
        <span className="label-mono">PRICE RISE LATER</span>
        <strong>hold stored energy</strong>
        <div className="oe-price-rail">
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="oe-action oe-sell card">
        <span className="label-mono">MARKET WINDOW</span>
        <strong>sell when it beats storage</strong>
        <div className="oe-decision-row">
          {decisions.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="oe-raw card">
        <span className="label-mono">RAW DATA</span>
        <div className="oe-noise">
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>

      <div className="oe-comparison">
        <div className="oe-cost-card card">
          <span className="label-mono">NORMAL COST</span>
          <strong>baseline</strong>
          <i className="oe-cost-bar oe-cost-normal" />
        </div>
        <div className="oe-cost-card oe-cost-card-active card">
          <span className="label-mono">OPTIMIZED COST</span>
          <strong>lower net spend</strong>
          <i className="oe-cost-bar oe-cost-optimized" />
        </div>
        <div className="oe-save card">
          <span className="label-mono">SAVE / EARN</span>
          <strong>visible value</strong>
        </div>
      </div>
    </section>
  );
}
