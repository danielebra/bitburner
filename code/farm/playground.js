import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";
import { SCRIPTS, generateUUID } from "/code/utils.js";

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
async function controller(ns, target) {
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
    const planByEndTime = calculatedPlan.sort((a, b) => a.endTime - b.endTime);
    const planByStartTime = calculatedPlan.sort((a, b) => a.startTime - b.startTime);
    ns.print(
      "INFO ",
      "This batch will complete in: ",
      planByEndTime.map((j) => j.endTime)[3] - planByStartTime.map((j) => j.startTime)[3],
    );
    await manager.execute(calculatedPlan);
    await analyzeServer(ns, target);
    await ns.sleep(1000);
  }
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
    // Generate a job plan from given calculated threads and durations
    const OFFSET = 1000;

    const weakenAfterHackStartTime = performance.now();
    const weakenAfterHackEndTime = weakenAfterHackStartTime + durations.weaken;

    const hackStartTime = weakenAfterHackEndTime - durations.hack - OFFSET;
    const hackEndTime = hackStartTime + durations.hack;

    const growStartTime = hackEndTime - durations.grow + OFFSET;
    const growEndTime = growStartTime + durations.grow;

    const weakenAfterGrowStartTime = growEndTime - durations.weaken + OFFSET;
    const weakenAfterGrowEndTime = weakenAfterGrowStartTime + durations.weaken;

    const hackJob = {
      id: generateUUID(),
      startTime: hackStartTime,
      endTime: hackEndTime,
      threads: threads.hackThreads,
      script: SCRIPTS.HACK,
      target: this.target,
      duration: durations.hack,
    };
    const weakenAfterHackJob = {
      id: generateUUID(),
      startTime: weakenAfterHackStartTime,
      endTime: weakenAfterHackEndTime,
      threads: threads.weakenThreadsAfterHack,
      script: SCRIPTS.WEAKEN,
      target: this.target,
      duration: durations.weaken,
    };
    const weakenAfterGrowJob = {
      id: generateUUID(),
      startTime: weakenAfterGrowStartTime,
      endTime: weakenAfterGrowEndTime,
      threads: threads.weakenThreadsAfterGrow,
      script: SCRIPTS.WEAKEN,
      target: this.target,
      duration: durations.weaken,
    };
    const growJob = {
      id: generateUUID(),
      startTime: growStartTime,
      endTime: growEndTime,
      threads: threads.growthThreadsForReplenish,
      script: SCRIPTS.GROW,
      target: this.target,
      duration: durations.grow,
    };

    return [hackJob, weakenAfterHackJob, weakenAfterGrowJob, growJob];
  }

  async execute(plan) {
    // Deep copy for mutation safety
    let tasks = JSON.parse(JSON.stringify(plan));
    while (tasks.length > 0) {
      const currentTime = performance.now();
      const dispatchableTasks = tasks.filter((task) => currentTime >= task.startTime);
      for (const task of dispatchableTasks) {
        this.ns.print("Should dispatch", task.script);
        this.ns.writePort(
          10,
          JSON.stringify({
            // Jank extraction of type from script name
            type: task.script.split("/").pop().split(".js")[0],
            jobID: task.id,
            startTime: currentTime,
            duration: task.duration,
          }),
        );
        await this.cluster.distribute(task.script, task.threads, task.target, false, task.id);
      }

      tasks = tasks.filter((task) => !dispatchableTasks.includes(task));

      await this.ns.sleep(50);
    }
  }

  async batch() {
    // NOTE: This is old code
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
  }
}
