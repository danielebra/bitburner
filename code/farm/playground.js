import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";
import { SCRIPTS } from "/code/utils.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.tail();
  ns.disableLog("ALL");
  ns.clearLog();
  const target = "n00dles";
  const manager = new HWGW(ns, target);
  let isTargetReady = false;
  while (!isTargetReady) {
    ns.print("INFO ", `Preparing ${target}`);
    isTargetReady = await manager.prepareTarget();
  }
  ns.print("INFO ", "Ready");
  const state = await analyzeServer(ns, target);
  ns.print(state.currentWeakenTime);
  ns.print(state.currentGrowTime);
  ns.print(state.currentHackTime);

  const calculatedThreads = await manager.calculateThreads();
  const calcuatedDurations = await manager.calculateDurations();
  const calculatedPlan = await manager.plan(calculatedThreads, calcuatedDurations);
  ns.print("INFO ", "Calculated Threads: ", calculatedThreads);
  ns.print("INFO ", "Calculated Durations: ", calcuatedDurations);
  ns.print("INFO ", "Plan: ", calculatedPlan);
  await manager.execute(calculatedPlan);
  return;
  await analyzeServer(ns, target);
  await manager.cluster.distribute(SCRIPTS.HACK, calculatedThreads.hackThreads, target);
  await ns.sleep(10000);
  await analyzeServer(ns, target);
  await manager.cluster.distribute(SCRIPTS.WEAKEN, calculatedThreads.weakenThreadsAfterHack, target);
  await ns.sleep(10000);
  await analyzeServer(ns, target);
  await manager.cluster.distribute(SCRIPTS.GROW, calculatedThreads.growthThreadsForReplenish, target);
  await ns.sleep(10000);
  await analyzeServer(ns, target);
  await manager.cluster.distribute(SCRIPTS.WEAKEN, calculatedThreads.weakenThreadsAfterGrow, target);
  await ns.sleep(10000);
  await analyzeServer(ns, target);
  // await manager.batch();
  // await ns.sleep(60 * 1000 * 60);
}

class HWGW {
  /** @param {NS} ns */
  constructor(ns, target) {
    this.ns = ns;
    this.cluster = new Cluster(ns);
    this.target = target;
  }
  async prepareTarget() {
    const state = await analyzeServer(this.ns, this.target);
    if (state.additionalSecurity > 0) {
      await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
      await this.ns.sleep(state.currentWeakenTime);
      return false;
    } else if (state.moneyBalancePercentage < 100) {
      await this.cluster.distribute(SCRIPTS.GROW, state.growThreadsNeeded, this.target);
      await this.ns.sleep(state.currentGrowTime);
      return false;
    } else {
      return true;
    }
  }

  async calculateThreads() {
    const state = await analyzeServer(this.ns, this.target);
    const cores = 1;

    // Calcuate the number of threads to hack half of the balance (Note: does not consider hacking chance)
    const hackThreads = Math.ceil(state.hackThreadsNeeded / 2);
    // Calculates security increase after hacking half balance of target
    const securityIncreaseAfterHack = this.ns.hackAnalyzeSecurity(hackThreads, this.target);

    // Calculates how much security would be decreased after certain number of weaken threads (is impacted by number of cores, 2nd arg)
    const securityDecreasePerThread = this.ns.weakenAnalyze(1, cores);

    // Calculates how many growth threads would be needed to replenish balance from half to full
    const halfBalanceToFullBalanceMultiplier = state.maxMoney / (state.maxMoney / 2);
    const growthThreadsForReplenish = Math.ceil(
      this.ns.growthAnalyze(this.target, halfBalanceToFullBalanceMultiplier, cores),
    );
    const securityIncreaseAfterGrow = this.ns.hackAnalyzeSecurity(growthThreadsForReplenish, this.target);

    // TODO: Weaken threads?
    // const weakenThreadsAfterHack = state.minSecurity + (state.minSecurity + securityIncreaseAfterHack) * 20;
    // const weakenThreadsAfterGrow = state.minSecurity + (state.minSecurity + securityIncreaseAfterGrow) * 20;
    const weakenThreadsAfterHack = Math.ceil(securityIncreaseAfterHack / securityDecreasePerThread);
    const weakenThreadsAfterGrow = Math.ceil(securityIncreaseAfterGrow / securityDecreasePerThread);

    return {
      securityIncreaseAfterHack,
      securityIncreaseAfterGrow,
      securityDecreasePerThread,
      growthThreadsForReplenish,
      hackThreads,
      weakenThreadsAfterHack,
      weakenThreadsAfterGrow,
    };
  }

  async calculateDurations() {
    const state = await analyzeServer(this.ns, this.target);
    return {
      hack: state.currentHackTime,
      weaken: state.currentWeakenTime,
      grow: state.currentGrowTime,
    };
  }

  async plan(threads, durations) {
    const OFFSET = 1000;

    const weakenAfterHackStartTime = performance.now();
    const weakenAfterHackEndTime = weakenAfterHackStartTime + durations.weaken;

    const hackStartTime = weakenAfterHackEndTime - durations.hack - OFFSET;
    const hackEndTime = hackStartTime + durations.hack;

    const growStartTime = hackEndTime - durations.grow - OFFSET;
    const growEndTime = growStartTime + durations.grow;

    const weakenAfterGrowStartTime = growEndTime - durations.grow - OFFSET;
    const weakenAfterGrowEndTime = weakenAfterGrowStartTime + durations.weaken;

    return { weakenAfterHackStartTime, hackStartTime, growStartTime, weakenAfterGrowStartTime };
  }

  async execute(plan) {
    let tasks = [
      { id: 1, startTime: plan.weakenAfterHackStartTime, script: SCRIPTS.WEAKEN },
      { id: 2, startTime: plan.hackStartTime, script: SCRIPTS.HACK },
      { id: 3, startTime: plan.growStartTime, script: SCRIPTS.GROW },
      { id: 4, startTime: plan.weakenAfterGrowStartTime, script: SCRIPTS.WEAKEN },
    ];

    while (tasks.length > 0) {
      const currentTime = performance.now();
      const dispatchableTasks = tasks.filter((task) => currentTime >= task.startTime);
      dispatchableTasks.forEach((task) => this.ns.print("Should dispatch", task.script));

      tasks = tasks.filter((task) => !dispatchableTasks.includes(task));

      await this.ns.sleep(50);
    }
  }

  async batch() {
    const state = await analyzeServer(this.ns, this.target);

    //
    const growTime = state.currentGrowTime;
    const weakenTime = state.currentWeakenTime;
    const hackTime = state.currentHackTime;
    //
    const hackThreads = Math.floor(state.hackThreadsNeeded / 2);
    const growThreads = state.growThreadsNeeded;
    const weakenThreads = state.weakenThreadsNeeded;
    const totalThreadsNeeded = hackThreads + growThreads + weakenThreads + weakenThreads;
    this.ns.print(totalThreadsNeeded);
    if (totalThreadsNeeded <= this.cluster.getAvailableThreads(SCRIPTS.GROW)) {
      this.ns.print("We can afford");
    } else {
      this.ns.print("Not enough threads");
    }
    return;
    // Retrieve the dynamic times for each operation
    // const weakenTime = this.ns.getWeakenTime(this.target);
    // const growTime = this.ns.getGrowTime(this.target);
    // const hackTime = this.ns.getHackTime(this.target);

    // const operationDelay = 1000; // 1 second delay

    // const hackStartTime = weakenTime - hackTime - operationDelay;
    // const growStartTime = weakenTime - growTime + operationDelay;

    // // Calculate the number of threads needed for each operation
    // const weakenThreads = 100;
    // const growThreads = 100;
    // const hackThreads = 100;

    // let startTime = Date.now();
    // // Distribute the first weaken operation immediately
    // this.ns.print("WARN ", (Date.now() - startTime) / 1000);
    // this.cluster.distribute(SCRIPTS.WEAKEN, weakenThreads, this.target);

    // // Wait for the second weaken start time, then distribute
    // // await this.ns.sleep(weaken2StartTime - growStartTime); // Adjust for elapsed time
    // await this.ns.sleep(2000);
    // this.ns.print("WARN ", (Date.now() - startTime) / 1000);
    // this.cluster.distribute(SCRIPTS.WEAKEN, weakenThreads, this.target);

    // // Wait for the grow start time, then distribute
    // // await this.ns.sleep(growStartTime - hackStartTime); // Adjust for elapsed time
    // await this.ns.sleep(2000);
    // this.ns.print("WARN ", (Date.now() - startTime) / 1000);
    // this.cluster.distribute(SCRIPTS.GROW, growThreads, this.target);

    // // Wait for the hack start time, then distribute
    // // await this.ns.sleep(hackStartTime); // Convert to milliseconds
    // await this.ns.sleep(8000);
    // this.ns.print("WARN ", (Date.now() - startTime) / 1000);
    // this.cluster.distribute(SCRIPTS.HACK, hackThreads, this.target);

    // The operations are now scheduled to complete in the correct order
  }

  calculateWeakenThreadsForHack() {
    return 100;
  }
  calculateWeakenThreadsForGrow() {
    return 100;
  }
}
