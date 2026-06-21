import "./PlannerInputs.css";
import type { ChapterStepProps } from "../../registry/types";

const factoryInputs = [
  "Solar panels",
  "Batteries",
  "EVs",
  "Production",
  "Heating / cooling",
  "History",
];

const externalInputs = [
  "Contracts",
  "Dynamic prices",
  "Weather",
  "Device specs",
];

const intervals = ["00", "06", "12", "18", "24"];

export default function PlannerInputs({ step }: ChapterStepProps) {
  const factory = step >= 1 ? "is-factory" : "";
  const external = step >= 2 ? "is-external" : "";
  const plan = step >= 3 ? "is-plan" : "";

  return (
    <section className={`pi-scene ${factory} ${external} ${plan}`}>
      <img
        className="pi-bg"
        src="/assets/planner-control-layer.png"
        alt="Energy planning system layer connecting factory assets and external signals"
      />
      <div className="pi-shade" />

      <div className="pi-title">
        <p className="kicker">CONTROL LAYER</p>
        <h2>Energy Profit Planner</h2>
      </div>

      <div className="pi-core">
        <span className="label-mono">PLANNER</span>
        <strong>24h optimizer</strong>
      </div>

      <svg className="pi-lines" viewBox="0 0 1920 1080" aria-hidden="true">
        <path className="pi-line pi-line-left-a" d="M 520 344 C 720 374, 820 430, 958 520" />
        <path className="pi-line pi-line-left-b" d="M 520 610 C 705 590, 818 560, 958 532" />
        <path className="pi-line pi-line-right-a" d="M 1414 338 C 1240 364, 1120 430, 966 520" />
        <path className="pi-line pi-line-right-b" d="M 1414 600 C 1222 592, 1108 562, 966 532" />
        <path className="pi-line pi-line-plan" d="M 960 628 C 960 720, 960 790, 960 856" />
      </svg>

      <div className="pi-input-column pi-factory-inputs">
        <span className="label-mono">FACTORY PROFILE</span>
        <div className="pi-chip-grid">
          {factoryInputs.map((item) => (
            <div className="pi-chip card" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="pi-input-column pi-external-inputs">
        <span className="label-mono">MARKET + CONTEXT</span>
        <div className="pi-chip-grid pi-chip-grid-small">
          {externalInputs.map((item) => (
            <div className="pi-chip card" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="pi-plan card">
        <div className="pi-plan-head">
          <span className="label-mono">OUTPUT</span>
          <strong>optimized 24-hour plan</strong>
        </div>
        <div className="pi-timeline">
          {intervals.map((item, index) => (
            <div className="pi-tick" key={item}>
              <i />
              <span>{item}</span>
              {index < intervals.length - 1 && <b />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
