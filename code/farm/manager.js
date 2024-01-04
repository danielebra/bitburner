import { getUsableServers } from "/code/utils.js";
export async function main(ns) {
    const target = ns.args[0];
    const weakenScript = '/code/farm/weaken.js';
    const growScript = '/code/farm/grow.js';
    const hackScript = '/code/farm/hack.js';

    const minSecurityLevel = ns.getServerMinSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    ns.tail();
    ns.disableLog("ALL");

    while (true) {
        const currentSecurityLevel = ns.getServerSecurityLevel(target);
        const currentMoney = ns.getServerMoneyAvailable(target);

        const weakenTime = ns.getWeakenTime(target);
        const growTime = ns.getGrowTime(target);
        const hackTime = ns.getHackTime(target);

        const delayForGrow = weakenTime - growTime;
        const delayForHack = weakenTime - hackTime;

        // Determine the required number of threads for each operation
        let requiredWeakenThreads = (currentSecurityLevel > minSecurityLevel) ?
            Math.ceil((currentSecurityLevel - minSecurityLevel) / ns.weakenAnalyze(1)) : 0;
        
        // Special case: if security is at min and weaken time is longer than hack time, skip weaken
        if (currentSecurityLevel === minSecurityLevel && weakenTime > hackTime) {
            requiredWeakenThreads = 0;
        }

        const requiredGrowThreads = Math.ceil(ns.growthAnalyze(target, maxMoney / currentMoney));
        const hackAmount = 0.5; // Amount to hack (e.g., 50% of the server's money)
        const requiredHackThreads = Math.floor(ns.hackAnalyzeThreads(target, currentMoney * hackAmount));

        // Allocate available threads based on the requirement
        const weakenThreads = Math.min(requiredWeakenThreads, getAvailableThreads(ns, weakenScript));
        const growThreads = Math.min(requiredGrowThreads, getAvailableThreads(ns, growScript));
        const hackThreads = Math.min(requiredHackThreads, getAvailableThreads(ns, hackScript));

        // Execute operations
        if (weakenThreads > 0) {
            distributeAndRun(ns, weakenScript, target, weakenThreads);
        }
        await ns.sleep(delayForGrow);
        if (growThreads > 0) {
            distributeAndRun(ns, growScript, target, growThreads);
        }
        await ns.sleep(delayForHack);
        if (hackThreads > 0) {
            distributeAndRun(ns, hackScript, target, hackThreads);
        }

        await ns.sleep(1000); // Cooldown period
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


function distributeAndRun(ns, script, target, totalThreads, hackPercentage = 1) {
    const allServers = getUsableServers(ns);
    let threadsRemaining = Math.min(totalThreads, getAvailableThreads(ns, script));

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
            ns.print("Started " + script + ' on ' + server + ' with ' + threadsOnServer);
        }
    }

    if (threadsRemaining > 0) {
        ns.print(`Warning: Not enough RAM to run ${totalThreads} threads. ${threadsRemaining} threads were not started.`);
    }
}

