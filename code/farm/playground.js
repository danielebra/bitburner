import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";
import { SCRIPTS } from "/code/utils.js";

/** @param {NS} ns */
export async function main(ns) {
  const target = "n00dles";
  const manager = new HWGW(ns, target);
  while (!manager.prepareTarget()) {
    ns.print("INFO", `Preparing ${target}`);
  }
  ns.print("Ready");
}

class HWGW {
  constructor(ns, target) {
    this.ns = ns;
    this.cluster = new Cluster(ns);
    this.target = target;
  }
  async prepareTarget() {
    const state = analyzeServer(this.ns, this.target);
    if (state.additionalSecurity > 0) {
      await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
      return false;
    } else if (state.moneyBalancePercentage < 100) {
      await this.cluster.distribute(SCRIPTS.WEAKEN, state.weakenThreadsNeeded, this.target);
      return false;
    } else {
      return true;
    }
  }
}
