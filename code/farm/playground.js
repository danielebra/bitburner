import { Cluster } from "/code/farm/cluster.js";

/** @param {NS} ns */
export async function main(ns) {
  const cluster = new Cluster(ns)
  ns.tprint(cluster.getTotalRam())
  ns.tprint(cluster.getTotalUsedRam())
  ns.tprint(cluster.getTotalAvailableRam())

  ns.tprint(cluster.getUtilizationPercentage())
}
