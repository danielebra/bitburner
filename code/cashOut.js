import { getUsableServersEnriched, generateUUID, SCRIPTS } from "/code/utils.js";
import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();
  const servers = getUsableServersEnriched(ns)
    .filter((x) => x.hackable && x.maxMoney > 0 && x.currentMoney > 0)
    .map((info) => info.name);
  const cluster = new Cluster(ns, false);

  for (var i = 0; i != servers.length; i++) {
    const target = servers[i];
    const data = await analyzeServer(ns, target);
    cluster.distribute(SCRIPTS.HACK, data.hackThreadsNeeded, target);
    ns.tprint(`Depleting ${target}. ${data.prettyCash} ${data.prettyHack}`);
  }
}
