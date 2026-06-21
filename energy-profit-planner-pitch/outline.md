# Video Outline

> **主题**：推荐 `blueprint`（待确认）—— 工程蓝图 / 工业图纸气质，适合能源系统、调度逻辑和技术拆解。
> **总时长**：约 2 分钟（口播 270 词左右）
> **章节数**：4 章 / 21 步

---

## 1. factory-waste — 太阳能不是问题，调度才是问题（6 steps · ~32s）

**信息池**（chapter agent 按需挂角标 / 副标 / pull-quote / mono cue）：
- 场景：medium-sized factory with a large solar rooftop system —— 来源 article §2
- 反差：noon sells surplus low; afternoon/evening buys power back high —— 来源 article §2
- 负载对象：production machines, electric forklifts, cooling systems, batteries —— 来源 article §2
- 核心问题：where should every kilowatt-hour go, and when should it be used, stored, or sold —— 来源 article §2

**开发计划**：

- step 1 (~5s) — Hero factory rooftop with "solar surplus at noon".
- step 2 (~5s) — Solar output exceeds immediate factory demand.
- step 3 (~6s) — Surplus goes to the grid at a low-value moment.
- step 4 (~8s) — Later loads reappear: machines, forklifts, cooling, batteries.
- step 5 (~4s) — Problem reframed from supply to timing.
- step 6 (~4s) — Big question: where should every kWh go next?

口播节选：
> Imagine a medium-sized factory with a large solar rooftop. The real question is: where should every kilowatt-hour go next?

---

## 2. planner-inputs — Energy Profit Planner 读懂整个工厂（4 steps · ~25s）

**信息池**：
- 产品名：Energy Profit Planner —— 来源 article §3
- 工厂数据：solar panels, batteries, EVs, production equipment, heating/cooling, historical consumption —— 来源 article §3
- 外部数据：contract terms, dynamic prices, weather forecasts, device specifications —— 来源 article §3
- 输出：optimized 24-hour energy plan, short time intervals —— 来源 article §3

**开发计划**：

- step 1 (~4s) — Product name appears as the control layer.
- step 2 (~8s) — Factory energy profile flows into the planner.
- step 3 (~7s) — Contract, price, weather, and device specs join the input layer.
- step 4 (~6s) — Planner outputs a 24-hour interval-based plan.

口播节选：
> It connects to the factory's energy profile. It also reads contract terms, dynamic prices, weather forecasts, and device specifications.

---

## 3. optimization-example — 24 小时内，每度电被重新分配（7 steps · ~39s）

**信息池**：
- noon strong solar generation —— 来源 article §4
- actions：charge batteries and electric forklifts during solar peak —— 来源 article §4
- actions：shift flexible equipment into low-cost windows —— 来源 article §4
- actions：save stored energy for expensive periods —— 来源 article §4
- market decision：sell surplus when market price beats storing or internal use —— 来源 article §4
- comparison：normal cost vs optimized cost vs save/earn —— 来源 article §4

**开发计划**：

- step 1 (~7s) — Solar peak triggers charge-battery and forklift actions.
- step 2 (~6s) — Low-cost window receives flexible equipment usage.
- step 3 (~5s) — Stored energy is reserved for expensive periods.
- step 4 (~6s) — Market price branch compares sell vs store vs use.
- step 5 (~4s) — Raw energy dashboard fades into a decision comparison.
- step 6 (~6s) — Normal cost and optimized cost are shown side by side.
- step 7 (~5s) — Save or earn number becomes the main visual result.

口播节选：
> The user does not see raw energy data. They see normal cost, optimized cost, and how much money they can save or earn.

---

## 4. service-levels-close — 从省钱到把余电变成利润（4 steps · ~24s）

**信息池**：
- Basic plan：smart charging and appliance scheduling —— 来源 article §5
- Basic outcome：reduce electricity costs without hurting comfort or daily routines —— 来源 article §5
- Premium plan：advanced solar trading and storage optimization —— 来源 article §5
- Premium users：factories, solar-powered households with batteries —— 来源 article §5
- Final claim：not just monitor; actively plan energy usage and energy sales —— 来源 article §6
- Value rule：every kWh goes where it creates most economic value —— 来源 article §6

**开发计划**：

- step 1 (~6s) — Two-tier service model appears: Basic and Premium.
- step 2 (~6s) — Basic highlights smart charging and appliance scheduling.
- step 3 (~6s) — Premium highlights solar trading and storage optimization.
- step 4 (~6s) — Closing line: every kWh creates maximum economic value.

口播节选：
> We do not just monitor energy consumption. We plan energy usage and energy sales.

---

## 素材清单

### 1. factory-waste
- ⚠️ GPT 生成图：medium-sized European factory with solar rooftop, noon sun, industrial but clean, 16:9.
- ⚠️ GPT 生成图：energy surplus flowing to grid at low value, abstract industrial energy flow, no text.

### 2. planner-inputs
- ⚠️ GPT 生成图：central energy planner dashboard surrounded by factory assets, contracts, prices, weather, device specs, no readable UI text.
- ⚠️ 可用矢量/代码视觉：input streams feeding a 24-hour plan timeline.

### 3. optimization-example
- ⚠️ GPT 生成图：battery, forklifts, cooling, production equipment coordinated by solar peak, industrial energy orchestration, no text.
- ⚠️ 可用矢量/代码视觉：normal cost vs optimized cost comparison.

### 4. service-levels-close
- ⚠️ GPT 生成图：premium energy trading/storage control room for factory and solar household, no logos, no fake numbers.
- ⚠️ 可用矢量/代码视觉：Basic vs Premium split and final kWh routing board.
