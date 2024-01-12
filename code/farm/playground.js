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

  await manager.batch();
  await ns.sleep(60 * 1000 * 60);
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

  async calculate() {
    // Calculates security increase after allocating 10 threads to hacking n00dles
    this.ns.hackAnalyzeSecurity(10, "n00dles");

    // Calculates how much security would be decreased after certain number of weaken threads (is impacted by number of cores, 2nd arg)
    this.ns.weakenAnalyz(10, 1);

    // Calculates how many growth threads would be needed to replenish balance
    const halfBalanceToFullBalanceMultiplier = ns.getServerMaxMoney("n00dles") / (ns.getServerMaxMoney("n00dles") / 2);
    this.ns.growthAnalyze("n00dles", halfBalanceToFullBalanceMultiplier, 1);
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
