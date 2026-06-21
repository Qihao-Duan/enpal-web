import "./FactoryWaste.css";
import type { ChapterStepProps } from "../../registry/types";

const loads = ["Machines", "Forklifts", "Cooling", "Batteries"];

export default function FactoryWaste({ step }: ChapterStepProps) {
  const solarLevel = step >= 1 ? "is-active" : "";
  const exportLevel = step >= 2 ? "is-export" : "";
  const laterLoads = step >= 3 ? "is-later" : "";
  const reframe = step >= 4 ? "is-reframe" : "";
  const question = step >= 5 ? "is-question" : "";

  return (
    <section
      className={`fw-scene ${solarLevel} ${exportLevel} ${laterLoads} ${reframe} ${question}`}
    >
      <img
        className="fw-bg"
        src="/assets/factory-solar-surplus.png"
        alt="Factory rooftop solar system with energy flowing toward the grid"
      />
      <div className="fw-bg-shade" />

      <div className="fw-copy">
        <p className="kicker">ENERGY PROFIT PLANNER</p>
        <h1>
          <span>Solar is abundant.</span>
          <span>Timing is missing.</span>
        </h1>
      </div>

      <div className="fw-solar-panel card">
        <div className="fw-panel-head">
          <span className="label-mono">NOON SOLAR PEAK</span>
          <span className="fw-status">surplus</span>
        </div>
        <div className="fw-meter">
          <span>Solar output</span>
          <i className="fw-bar fw-bar-solar" />
        </div>
        <div className="fw-meter">
          <span>Immediate demand</span>
          <i className="fw-bar fw-bar-demand" />
        </div>
      </div>

      <svg className="fw-flow" viewBox="0 0 1920 1080" aria-hidden="true">
        <path
          className="fw-export-line"
          d="M 1040 438 C 1240 378, 1390 350, 1572 316 C 1660 300, 1730 296, 1840 284"
        />
        <path
          className="fw-buy-line"
          d="M 1800 690 C 1585 722, 1395 740, 1228 708 C 1030 670, 902 610, 716 622"
        />
      </svg>

      <div className="fw-grid-export card">
        <span className="label-mono">GRID EXPORT</span>
        <strong>low-value moment</strong>
      </div>

      <div className="fw-loads">
        {loads.map((load) => (
          <div className="fw-load card" key={load}>
            <span className="fw-load-dot" />
            <strong>{load}</strong>
          </div>
        ))}
      </div>

      <div className="fw-buyback card">
        <span className="label-mono">LATER DEMAND</span>
        <strong>buy back at a higher price</strong>
      </div>

      <div className="fw-reframe">
        <div className="fw-frame-card card">
          <span className="label-mono">NOT ONLY</span>
          <strong>Energy supply</strong>
        </div>
        <div className="fw-frame-card fw-frame-card-active card">
          <span className="label-mono">THE REAL GAP</span>
          <strong>Timing + routing</strong>
        </div>
      </div>

      <div className="fw-question">
        <p className="label-mono">DECISION LAYER</p>
        <h2>
          <span>Where should</span>
          <span>every kWh go next?</span>
        </h2>
        <div className="fw-route-board">
          <span>use</span>
          <i />
          <span>store</span>
          <i />
          <span>sell</span>
        </div>
      </div>
    </section>
  );
}
