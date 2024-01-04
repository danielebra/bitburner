import { getUsableServers } from "/code/utils.js";
/** @param {NS} ns **/
export async function main(ns) {
  const target = ns.args[0];
  const weakenScript = "/code/farm/weaken.js"; // Update paths as necessary
  const growScript = "/code/farm/grow.js";
  const hackScript = "/code/farm/hack.js";

  const weakenTime = ns.getWeakenTime(target);
  const growTime = ns.getGrowTime(target);
  const hackTime = ns.getHackTime(target);

  const delayForGrow = weakenTime - growTime;
  const delayForHack = weakenTime - hackTime;
  ns.tail();
  ns.disableLog("ALL");
  while (true) {
    const totalAvailableThreads = getAvailableThreads(ns, weakenScript); // Get total threads for the most demanding script

    // Allocate threads to each operation, ensuring total does not exceed totalAvailableThreads
    const weakenThreads = Math.floor(totalAvailableThreads / 3);
    const growThreads = Math.floor(totalAvailableThreads / 3);
    const hackThreads = totalAvailableThreads - weakenThreads - growThreads;

    // Distribute weaken, grow, and hack operations across servers
    distributeAndRun(ns, weakenScript, target, weakenThreads);
    await ns.sleep(delayForGrow - 200);
    distributeAndRun(ns, growScript, target, growThreads);
    await ns.sleep(delayForHack - delayForGrow);
    distributeAndRun(ns, hackScript, target, hackThreads, 0.5);

    await ns.sleep(1000);
  }
}

function getAvailableThreads(ns, script) {
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

function distributeAndRun(
  ns,
  script,
  target,
  totalThreads,
  hackPercentage = 1,
) {
  const allServers = getUsableServers(ns);
  let threadsRemaining = totalThreads;

  for (const server of allServers) {
    if (threadsRemaining <= 0) break;

    const serverRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    const scriptRam = ns.getScriptRam(script);
    let threadsOnServer = Math.floor((serverRam - usedRam) / scriptRam);
    threadsOnServer = Math.min(threadsOnServer, threadsRemaining);
    if (!ns.fileExists(script, server)) {
      ns.scp(script, server);
    }
    if (threadsOnServer > 0) {
      ns.exec(script, server, threadsOnServer, target, hackPercentage);
      threadsRemaining -= threadsOnServer;
      ns.print(
        "Started + " + script + " on " + server + " with " + threadsOnServer,
      );
    }
  }

  if (threadsRemaining > 0) {
    ns.print(
      `Warning: Not enough RAM to run ${totalThreads} threads. ${threadsRemaining} threads were not started.`,
    );
  }
}
