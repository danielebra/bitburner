import { Cluster } from "/code/farm/cluster.js";
import { SCRIPTS } from "/code/utils.js";
/** @param {NS} ns */
export async function main(ns) {
  ns.tail();
  ns.disableLog("ALL");
  const threads = ns.args[0] || 99999;
  const cluster = new Cluster(ns, false);
  await cluster.distribute(SCRIPTS.FOREVER_WEAKEN, threads, "foodnstuff");
}
