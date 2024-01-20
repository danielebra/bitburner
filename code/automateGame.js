import { ProgramPurchaser, FactionAutomator } from "/code/automation/objectives/index";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  const objectives = [new FactionAutomator(ns), new ProgramPurchaser(ns)];
  let shouldLoop = true;
  while (shouldLoop) {
    shouldLoop = objectives
      .filter((o) => o.isActive)
      .map((o) => {
        const shouldContinue = o.evaluateContinuation();
        const tick = o.tick();
        ns.print({ objective: o.toString(), shouldContinue, tick });
        if (!shouldContinue) o.tearDown();
        return shouldContinue;
      })
      .includes(true);
    await ns.sleep(2500);
  }
  ns.toast("All objectives have been met, bye for now.", "success");
}

