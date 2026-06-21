import type { ChapterDef } from "./types";
import FactoryWaste from "../chapters/01-factory-waste/FactoryWaste";
import { narrations as factoryWasteNarrations } from "../chapters/01-factory-waste/narrations";
import PlannerInputs from "../chapters/02-planner-inputs/PlannerInputs";
import { narrations as plannerInputsNarrations } from "../chapters/02-planner-inputs/narrations";
import OptimizationExample from "../chapters/03-optimization-example/OptimizationExample";
import { narrations as optimizationExampleNarrations } from "../chapters/03-optimization-example/narrations";
import ServiceLevelsClose from "../chapters/04-service-levels-close/ServiceLevelsClose";
import { narrations as serviceLevelsCloseNarrations } from "../chapters/04-service-levels-close/narrations";

/**
 * Order = order of presentation.
 *
 * Each chapter MUST provide a `narrations: Narration[]` array. Its length
 * is the chapter's step count — there is no `totalSteps` to maintain
 * separately. This guarantees the audio synthesis pipeline, the runtime
 * stepper, and the chapter `.tsx` switch on `step` cannot drift apart.
 *
 * Visual styling (color, fonts) comes entirely from the active theme —
 * chapters never hard-code palette / font names. See THEMES.md.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: "factory-waste",
    title: "太阳能不是问题，调度才是问题",
    narrations: factoryWasteNarrations,
    Component: FactoryWaste,
  },
  {
    id: "planner-inputs",
    title: "Energy Profit Planner 读懂整个工厂",
    narrations: plannerInputsNarrations,
    Component: PlannerInputs,
  },
  {
    id: "optimization-example",
    title: "24 小时内，每度电被重新分配",
    narrations: optimizationExampleNarrations,
    Component: OptimizationExample,
  },
  {
    id: "service-levels-close",
    title: "从省钱到把余电变成利润",
    narrations: serviceLevelsCloseNarrations,
    Component: ServiceLevelsClose,
  },
];
