import { analyzeServer } from "/code/farm/inspector.js";
import { HWGW, controller } from "/code/lib/sequencer.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearPort(10);
  ns.tail();
  ns.disableLog("ALL");
  ns.clearLog();
  const target = ns.args[0] || "n00dles";
  const manager = new HWGW(ns, target);
  let isTargetReady = false;
  while (!isTargetReady) {
    ns.print("INFO ", `Preparing ${target}`);
    isTargetReady = await manager.prepareTarget();
  }
  ns.print("INFO ", "Ready");
  await analyzeServer(ns, target);

  while (true) {
    const calculatedThreads = await manager.calculateThreads();
    const calcuatedDurations = await manager.calculateDurations();
    const calculatedPlan = await manager.plan(calculatedThreads, calcuatedDurations);
    ns.print("INFO ", "Calculated Threads: ", calculatedThreads);
    ns.print("INFO ", "Calculated Durations: ", calcuatedDurations);
    ns.print("INFO ", "Plan: ", calculatedPlan);
    const planByEndTime = calculatedPlan.sort((a, b) => a.endTime - b.endTime);
    const planByStartTime = calculatedPlan.sort((a, b) => a.startTime - b.startTime);
    ns.print(
      "DEBUG ",
      "By End Time: ",
      planByEndTime.map((j) => j.script),
    );
    ns.print(
      "DEBUG ",
      "By Start Time: ",
      planByStartTime.map((j) => j.script),
    );
    await manager.execute(calculatedPlan);
    await analyzeServer(ns, target);
    await ns.sleep(1000);
  }
}
