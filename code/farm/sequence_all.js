import { HWGW, controller } from "/code/lib/sequencer.js";
import { getUsableServersEnriched, generateUUID, SCRIPTS } from "/code/utils.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  const servers = getUsableServersEnriched(ns)
    .filter((x) => x.hackable && x.maxMoney > 0 && x.recommendedToHack && x.name != "n00dles")
    // .filter((x) => x.hackable && x.maxMoney > 0 && x.name != "n00dles" )
    .map((info) => info.name);

  for (const server of servers) {
    if (ns.isRunning(SCRIPTS.SEQUENCER_SINGLE_TARGET, "home", server)) {
      ns.tprint(server, " is already running with a sequencer");
      continue;
    }
    ns.tprint("Booting up sequencer for", server);
    ns.run(SCRIPTS.SEQUENCER_SINGLE_TARGET, 1, server);
  }
}
