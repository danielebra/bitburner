// Objective: Maintain 50% of prize pool
import { getUsableServers } from "/code/utils.js";
/** @param {NS} ns */
export async function main(ns) {
  ns.tail()
  ns.disableLog('ALL')
  attackServer(ns, "iron-gym");
}

/** @param {NS} ns */
/** @param {string} server */
async function attackServer(ns, server) {
  // Money
  const currentMoney = ns.getServerMoneyAvailable(server);
  const maxMoney = ns.getServerMaxMoney(server);
  const currentHackTime = ns.getHackTime(server);
  const currentGrowTime = ns.getGrowTime(server);

  // Security
  const currentSecurity = ns.getServerSecurityLevel(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const currentWeakenTime = ns.getWeakenTime(server);

  // Threads
  const hackThreadsNeeded = Math.ceil(ns.hackAnalyzeThreads(server, currentMoney))
  const growThreadsNeeded = Math.ceil(ns.growthAnalyze(server, maxMoney / currentMoney))
  const weakenThreadsNeeded = Math.ceil((currentSecurity - minSecurity) * 20)


  const prettyCash = `${ns.nFormat(currentMoney, "$0.0a")} / ${ns.nFormat(maxMoney, "$0.0a")} (${(currentMoney / maxMoney * 100).toFixed(2)}%)`
  const prettyHack = `${ns.tFormat(currentHackTime)} (t=${hackThreadsNeeded})`
  const prettyGrow = `${ns.tFormat(currentGrowTime)} (t=${growThreadsNeeded})`
  const prettyWeaken = `${ns.tFormat(currentWeakenTime)} (t=${weakenThreadsNeeded})`
  const prettySecurity = `${minSecurity} / ${currentSecurity} (Δ ${currentSecurity - minSecurity})`
  ns.print(`${server}: ${prettyCash}, Grow ${prettyGrow}, Hack ${prettyHack}, Weaken ${prettyWeaken}, Security ${prettySecurity}`)
}
