import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";
import { SCRIPTS, generateUUID } from "/code/utils.js";

// Notes
/*
The next batch against the same target should be aligned with
  - The completion of the first item in the new batch must be after the last item from the previous batch
  - What happens to waiting for the correct time to dispatch the next job within an existing batch?
  - Jobs for the next batch will be dispatched while the current batch is running
  - Perhaps the planner can adapt to the number of parralel batches allowed?

  The first completion must occur after the previous last completion
*/
export async function controller(ns, target) {
  const manager = new HWGW(ns, target);

  while (true) {
    let isTargetReady = false;
    while (!isTargetReady) {
      ns.print("INFO ", `Preparing ${target}`);
      isTargetReady = await manager.prepareTarget();
    }
    ns.print("INFO ", "Ready");
    await analyzeServer(ns, target);
    const calculatedThreads = await manager.calculateThreads();
    const calcuatedDurations = await manager.calculateDurations();
    const calculatedPlan = await manager.plan(calculatedThreads, calcuatedDurations);

    // TODO: Move extend plan outside of manager
    const masterPlan = await manager.extendPlan(calculatedPlan, calculatedThreads, calcuatedDurations, 10);

    const masterPlanLastEndTime = [...masterPlan].sort((a, b) => a.endTime - b.endTime)[masterPlan.length - 1].endTime;
    for (const task of masterPlan) {
      ns.writePort(
        10,
        JSON.stringify({
          // Jank extraction of type from script name
          type: task.script.split("/").pop().split(".js")[0],
          jobID: task.id,
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.duration,
        }),
      );
    }
    ns.writePort(
      10,
      JSON.stringify({
        type: "spacer",
      }),
    );

    const batchTime = masterPlanLastEndTime - performance.now();

    ns.print("INFO ", "This batch will complete in: ", ns.tFormat(batchTime));
    await manager.execute(masterPlan);
    const timeRemaining = masterPlanLastEndTime - performance.now();
    if (timeRemaining > 0) {
      ns.print("Waiting an additional ", timeRemaining);
      await ns.sleep(timeRemaining);
    }
    await analyzeServer(ns, target);
    await ns.sleep(1000);
  }
}

export class HWGW {
  /** @param {NS} ns */
  constructor(ns, target) {
    this.ns = ns;
    this.cluster = new Cluster(ns, false);
    this.target = target;
  }
  async prepareTarget() {
    const state = await analyzeServer(this.ns, this.target);
    if (state.additionalSecurity > 0.5) {
      await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
      await this.ns.sleep(state.currentWeakenTime);
      return false;
    } else if (state.moneyBalancePercentage < 98) {
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
    const hackThreads = Math.min(Math.ceil(state.hackThreadsNeeded / 2), 2500);
    // Calculates security increase after hacking half balance of target
    const securityIncreaseAfterHack = this.ns.hackAnalyzeSecurity(hackThreads); //, this.target);

    // Calculates how much security would be decreased after certain number of weaken threads (is impacted by number of cores, 2nd arg)
    const securityDecreasePerThread = this.ns.weakenAnalyze(1, cores);

    // Calculates how many growth threads would be needed to replenish balance from half to full
    const halfBalanceToFullBalanceMultiplier = state.maxMoney / (state.maxMoney / 2);
    const growthThreadsForReplenish = Math.ceil(
      this.ns.growthAnalyze(this.target, halfBalanceToFullBalanceMultiplier, cores),
    );
    const securityIncreaseAfterGrow = this.ns.growthAnalyzeSecurity(growthThreadsForReplenish); // , this.target);

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

  async plan(threads, durations, startTime = null) {
    // Generate a job plan from given calculated threads and durations
    const OFFSET = 1000;

    const weakenAfterHackStartTime = startTime || performance.now();
    const weakenAfterHackEndTime = weakenAfterHackStartTime + durations.weaken;

    const hackStartTime = weakenAfterHackEndTime - durations.hack - OFFSET;
    const hackEndTime = hackStartTime + durations.hack;

    const growStartTime = weakenAfterHackEndTime - durations.grow + OFFSET;
    //const growStartTime = hackEndTime - durations.grow + OFFSET;
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

    this.ns.writePort(
      10,
      JSON.stringify({
        type: "expected",
        time: hackJob.endTime,
        minDifficulty: this.ns.getServerMinSecurityLevel(this.target),
        hackDifficulty: this.ns.getServerSecurityLevel(this.target) + this.ns.hackAnalyzeSecurity(hackJob.threads),
        moneyMax: this.ns.getServerMaxMoney(this.target),
        moneyAvailable: Math.max(
          0,
          this.ns.getServerMaxMoney(this.target) -
            this.ns.hackAnalyze(this.target) * hackJob.threads * this.ns.hackAnalyzeChance(this.target),
        ),
      }),
    );
    this.ns.writePort(
      10,
      JSON.stringify({
        type: "expected",
        time: growJob.endTime,
        minDifficulty: this.ns.getServerMinSecurityLevel(this.target),
        hackDifficulty: this.ns.getServerSecurityLevel(this.target) + this.ns.hackAnalyzeSecurity(growJob.threads),
        moneyMax: this.ns.getServerMaxMoney(this.target),
        moneyAvailable: this.ns.getServerMaxMoney(this.target),
      }),
    );
    this.ns.writePort(
      10,
      JSON.stringify({
        type: "expected",
        time: weakenAfterHackJob.endTime,
        minDifficulty: this.ns.getServerMinSecurityLevel(this.target),
        hackDifficulty: this.ns.getServerMinSecurityLevel(this.target),
      }),
    );
    this.ns.writePort(
      10,
      JSON.stringify({
        type: "expected",
        time: weakenAfterGrowJob.endTime,
        minDifficulty: this.ns.getServerMinSecurityLevel(this.target),
        hackDifficulty: this.ns.getServerMinSecurityLevel(this.target),
      }),
    );

    return [hackJob, weakenAfterHackJob, weakenAfterGrowJob, growJob];
  }

  // This doesnt belong in this class, move it out
  async extendPlan(initialPlan, calculatedThreads, calcuatedDurations, cycles) {
    const longestOperation = Math.max(...Object.values(calcuatedDurations));
    let extendedPlan = [...initialPlan];
    for (let i = 0; i != cycles; i++) {
      // Sort the plan in order of completion time
      extendedPlan.sort((a, b) => a.endTime - b.endTime);
      const lastEndTime = extendedPlan[extendedPlan.length - 1].endTime;

      const additionalPlan = await this.plan(
        calculatedThreads,
        calcuatedDurations,
        lastEndTime - longestOperation + 2000,
      );

      extendedPlan = extendedPlan.concat(additionalPlan);
    }
    return extendedPlan;
  }

  async execute(plan) {
    // Deep copy for mutation safety
    let tasks = JSON.parse(JSON.stringify(plan));
    while (tasks.length > 0) {
      const currentTime = performance.now();
      const dispatchableTasks = tasks.filter((task) => currentTime >= task.startTime);

      this.ns.writePort(
        10,
        JSON.stringify({
          type: "observed",
          time: performance.now(),
          minDifficulty: this.ns.getServerMinSecurityLevel(this.target),
          hackDifficulty: this.ns.getServerSecurityLevel(this.target),
          moneyMax: this.ns.getServerMaxMoney(this.target),
          moneyAvailable: this.ns.getServerMoneyAvailable(this.target),
        }),
      );
      for (const task of dispatchableTasks) {
        this.ns.print("Should dispatch", task.script);
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
