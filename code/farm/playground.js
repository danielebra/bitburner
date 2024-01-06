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
  ns.print("INFO ","Ready");
  const state = await analyzeServer(ns, target);
  ns.print(state.currentWeakenTime);
  ns.print(state.currentGrowTime);
  ns.print(state.currentHackTime);
}

class HWGW {
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

  async batch() {
    const state = await analyzeServer(this.ns, this.target);
    // Calculate how many weaken threads its going to take to recover from hack
    await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
    await this.ns.sleep()
    // Calculate how many weaken threads its going to take to recover from grow
    await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
    await this.ns.sleep()
    // Calculate how many grow threads its going to take to recover from hack
    await this.cluster.distribute(SCRIPTS.GROW, state.growThreadsNeeded, this.target);
    await this.ns.sleep()
    const threadsForHalfBalance = Math.floor(state.hackThreadsNeeded / 2)
    await this.cluster.distribute(SCRIPTS.HACK, threadsForHalfBalance, this.target);
  }
}
