import "./ServiceLevelsClose.css";
import type { ChapterStepProps } from "../../registry/types";

const basicItems = ["Smart charging", "Appliance scheduling", "Daily routines stay intact"];
const premiumItems = ["Solar trading", "Storage optimization", "Battery-heavy sites"];

export default function ServiceLevelsClose({ step }: ChapterStepProps) {
  const basic = step >= 1 ? "is-basic" : "";
  const premium = step >= 2 ? "is-premium" : "";
  const shift = step >= 3 ? "is-shift" : "";
  const plan = step >= 4 ? "is-plan" : "";
  const final = step >= 5 ? "is-final" : "";

  return (
    <section className={`sl-scene ${basic} ${premium} ${shift} ${plan} ${final}`}>
      <img
        className="sl-bg"
        src="/assets/basic-premium-tiers.png"
        alt="Basic and premium energy planning service tiers for homes and factories"
      />
      <div className="sl-shade" />

      <div className="sl-title">
        <p className="kicker">SERVICE MODEL</p>
        <h2>Two levels of energy value.</h2>
      </div>

      <div className="sl-tiers">
        <div className="sl-tier sl-basic card">
          <span className="label-mono">BASIC</span>
          <strong>save without changing routines</strong>
          <div className="sl-items">
            {basicItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="sl-tier sl-premium card">
          <span className="label-mono">PREMIUM</span>
          <strong>turn surplus into profit</strong>
          <div className="sl-items">
            {premiumItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="sl-shift card">
        <span className="label-mono">THE SHIFT</span>
        <div className="sl-shift-row">
          <strong>monitor</strong>
          <i />
          <strong>plan</strong>
        </div>
      </div>

      <div className="sl-plan-board card">
        <span className="label-mono">ACTIVE PLANNING</span>
        <div className="sl-plan-grid">
          <span>energy usage</span>
          <i />
          <span>energy sales</span>
        </div>
      </div>

      <div className="sl-final">
        <p className="label-mono">VALUE RULE</p>
        <h2>Every kWh moves where it creates the most economic value.</h2>
      </div>
    </section>
  );
}
