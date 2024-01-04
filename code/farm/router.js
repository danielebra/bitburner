// Objective: Maintain 50% of prize pool
import { getUsableServers } from "/code/utils.js";
const SCRIPTS = {
  WEAKEN: "/code/farm/weaken.js",
  GROW: "/code/farm/grow.js",
  HACK: "/code/farm/hack.js",
};
/** @param {NS} ns */
export async function main(ns) {
  ns.tail();
  ns.disableLog("ALL");
  const target = ns.args[0]
  const servers = [
    // "iron-gym",
    // "n00dles",
    // "hong-fang-tea",
    // "nectar-net",
    // "zer0",
    // "phantasy",
    // "omega-net",
    // "neo-net",
    // "silver-helix",
    // "johnson-ortho",
    // "crush-fitness",
    // "harakiri-sushi",
    // "foodnstuff",
    // "joesguns",
    // "max-hardware",
    // "sigma-cosmetics",
  ];
  // servers.forEach((server) => prepareServer(ns, server));
  while ( true ) {
    ns.print("Tick...")
    await prepareServer(ns, target)
    await ns.sleep(1000)

  }
  // attackServer(ns, "iron-gym");
}

/** @param {NS} ns */
/** @param {string} server */
async function attackServer(ns, server) {
  const data = await analyzeServer(ns, server);

}

/** @param {NS} ns */
/** @param {string} server */
async function prepareServer(ns, server) {
  const data = await analyzeServer(ns, server);
  const c = new Cluster()

  if (data.additionalSecurity >= 3) {
    ns.print(`Would like to weaken ${server}. ${data.prettyWeaken}`);
    c.distribute(ns, SCRIPTS.WEAKEN, data.weakenThreadsNeeded, server)
    await ns.sleep(data.currentWeakenTime)
    return false
  }
  else if (data.moneyBalancePercentage <= 95) {
    ns.print(`Would like to grow ${server}. ${data.prettyGrow}`)
    c.distribute(ns, SCRIPTS.GROW, data.growThreadsNeeded, server)
    await ns.sleep(data.currentGrowTime)
    return false
  }
  else {
    ns.print(`Would like to hack ${server}. ${data.prettyHack}`)
    const threadsForHalfBalance = Math.floor(data.hackThreadsNeeded / 2)
    c.distribute(ns, SCRIPTS.HACK, threadsForHalfBalance, server)
    await ns.sleep(data.currentHackTime)
    return true
  }
}

/** @param {NS} ns */
/** @param {string} server */
async function analyzeServer(ns, server) {
  // Money
  const currentMoney = ns.getServerMoneyAvailable(server);
  const maxMoney = ns.getServerMaxMoney(server);
  const currentHackTime = ns.getHackTime(server);
  const currentGrowTime = ns.getGrowTime(server);
  const moneyBalancePercentage = (currentMoney / maxMoney * 100).toFixed(2)

  // Security
  const currentSecurity = ns.getServerSecurityLevel(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const currentWeakenTime = ns.getWeakenTime(server);
  const additionalSecurity = currentSecurity - minSecurity

  // Threads
  const hackThreadsNeeded = Math.ceil(ns.hackAnalyzeThreads(server, currentMoney))
  const growThreadsNeeded = Math.ceil(ns.growthAnalyze(server, maxMoney / currentMoney))
  const weakenThreadsNeeded = Math.ceil((currentSecurity - minSecurity) * 20)


  const prettyCash = `${ns.nFormat(currentMoney, "$0.0a")} / ${ns.nFormat(maxMoney, "$0.0a")} (${moneyBalancePercentage}%)`
  const prettyHack = `${ns.tFormat(currentHackTime)} (t=${hackThreadsNeeded})`
  const prettyGrow = `${ns.tFormat(currentGrowTime)} (t=${growThreadsNeeded})`
  const prettyWeaken = `${ns.tFormat(currentWeakenTime)} (t=${weakenThreadsNeeded})`
  const prettySecurity = `${minSecurity} / ${currentSecurity} (Δ ${additionalSecurity})`
  ns.print(`${server}: ${prettyCash}, Grow ${prettyGrow}, Hack ${prettyHack}, Weaken ${prettyWeaken}, Security ${prettySecurity}`)
  return { currentWeakenTime, currentGrowTime, currentHackTime, hackThreadsNeeded, growThreadsNeeded, weakenThreadsNeeded, additionalSecurity, moneyBalancePercentage, prettyHack, prettyWeaken, prettySecurity, prettyGrow}
}
class Cluster {
  getAvailableThreads(ns, script)  {
    const scriptRam = ns.getScriptRam(script);
    let totalThreads = 0;
    const allServers = getUsableServers(ns);

    for (const server of allServers) {
      const serverRam = ns.getServerMaxRam(server);
      const usedRam = ns.getServerUsedRam(server);
      totalThreads += Math.floor((serverRam - usedRam) / scriptRam);
    }
    return totalThreads;
  }

  distribute(ns, script, desiredThreads, ...args) {
    const allServers = getUsableServers(ns).reverse();
    const availableClusterThreads = this.getAvailableThreads(ns, script)

    if (availableClusterThreads == 0) {
      ns.print(`Cluster has no more resources to distribute ${script}`)
    }

    let threadsToAllocate = Math.min(desiredThreads, availableClusterThreads);
    if (threadsToAllocate != desiredThreads) {
      ns.print(`Requested to allocate ${desiredThreads} within the cluster but only ${threadsToAllocate} are available`)
    }
    for (const server of allServers) {
      const serverRam = ns.getServerMaxRam(server);
      const usedRam = ns.getServerUsedRam(server);
      const scriptRam = ns.getScriptRam(script);
      const threadsOnServer = Math.floor((serverRam - usedRam) / scriptRam);

      const threadsAllocatableOnServer =  Math.min(threadsOnServer, threadsToAllocate);
      if (threadsAllocatableOnServer <= 0) {
        continue;
      }
      if (!ns.fileExists(script, server)) {
          ns.scp(script, server);
      }
      ns.exec(script, server, threadsAllocatableOnServer, ...args);
      threadsToAllocate -= threadsAllocatableOnServer;
      ns.print(`Started ${script} on ${server} with t=${threadsAllocatableOnServer}`);
    }


  }
}
// TODO: Retrieve current cluster state. Eg scan procs on servers and tally the process and threads
// Add queue to interface with cluster instead of immedate distribution
// Optimisation oportunities:
// * Keep hacking until 50% balance (will account for failed hacks)
// * Auto scale to all targes within a single invocation. Requires some state management
// * Prioritise single machine over distributed computing. Perhaps identify the machine with most available threads in order of prority
