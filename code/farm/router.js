// Objective: Maintain 50% of prize pool

import { getUsableServersEnriched } from "/code/utils.js";
// TO BE MOVED TO UTILS
export class DefaultMap extends Map {
  constructor(defaultVal, ...args) {
    super(...args);
    this.defaultVal = defaultVal;
  }

  get(key) {
    if (!this.has(key)) {
      this.set(
        key,
        typeof this.defaultVal === "function"
          ? new this.defaultVal()
          : this.defaultVal,
      );
    }
    return super.get(key);
  }
}

function generateUUID() {
  let d = new Date().getTime(); //Timestamp
  let d2 = (performance && performance.now && performance.now() * 1000) || 0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
// END MOVE

// const TARGETS = new DefaultMap(() => ({
//   isActive: null,
//   jobID: null,
//   jobStartTime: null,
//   jobExpectedCompletionTime: null,
// }));
let TARGETS = {};

const SCRIPTS = {
  WEAKEN: "/code/farm/weaken.js",
  GROW: "/code/farm/grow.js",
  HACK: "/code/farm/hack.js",
};

const PORT = 12;
async function getTargetData(target) {
  if (!TARGETS[target]) {
    TARGETS[target] = {
      isActive: false,
      jobID: null,
      jobStartTime: null,
      jobExpectedCompletionTime: null,
      runningThreads: 0,
      requestedThreads: 0,
    };
  }
  return TARGETS[target];
}

/** @param {NS} ns */
export async function main(ns) {
  TARGETS = {};
  ns.tail();
  ns.disableLog("ALL");
  // const target = ns.args[0]
  // const servers = [
  //   "iron-gym",
  //   "n00dles",
  //   "hong-fang-tea",
  //   "nectar-net",
  //   "zer0",
  //   "phantasy",
  //   "omega-net",
  //   "neo-net",
  //   "silver-helix",
  //   "johnson-ortho",
  //   "crush-fitness",
  //   "harakiri-sushi",
  //   "foodnstuff",
  //   "joesguns",
  //   "max-hardware",
  //   "sigma-cosmetics",
  //   "the-hub"
  // ];
  while (true) {
    const servers = getUsableServersEnriched(ns).filter(
      (x) => x.hackable && x.maxMoney > 0,
    ).map(info => info.name);
    if (Object.keys(TARGETS).length != Object.keys(servers).length) {
      for (var i = 0; i != servers.length; i++) {
        await getTargetData(servers[i]);
      }
      ns.print("INFO", Object.keys(TARGETS));
    }
    // Process messages from port
    if (!ns.peek(PORT).startsWith("NULL")) {
      const message = ns.readPort(PORT);
      // ns.print(`Message received: ${message}`)
      const [jobID, status, threads] = message.split("#");

      // Update TARGETS based on the message
      Object.keys(TARGETS).forEach((target) => {
        if (TARGETS[target].jobID == jobID && status == "COMPLETE") {
          TARGETS[target].runningThreads -= threads;
          ns.print(
            `ⓘ  Updating job ${jobID} on target ${target}: t=${threads} reached ${status}. ${TARGETS[target].runningThreads} remaining`,
          );
          if (TARGETS[target].runningThreads <= 0) {
            TARGETS[target].isActive = false;
          }
        }
      });
    }

    for (const target of Object.keys(TARGETS)) {
      if (TARGETS[target].isActive === false) {
        await prepareServer(ns, target);
      }
    }

    // ns.print("INFO", TARGETS)
    await ns.sleep(500);
  }
}

/** @param {NS} ns */
async function attackServer(ns, server) {
  while (true) {
    ns.print(`Tick for server: ${server}...`);
    await prepareServer(ns, server);
    await ns.sleep(1000); // Sleep before restarting the cycle for this server
  }
}

/** @param {NS} ns */
async function prepareServer(ns, server) {
  const data = await analyzeServer(ns, server);
  const c = new Cluster();
  const jobID = generateUUID();

  let scriptToUse;
  let threadsToUse;

  if (data.additionalSecurity >= 5) {
    ns.print(`  • Would like to weaken ${server}. ${data.prettyWeaken}`);
    scriptToUse = SCRIPTS.WEAKEN;
    threadsToUse = data.weakenThreadsNeeded;
  } else if (data.moneyBalancePercentage <= 90) {
    ns.print(`  • Would like to grow ${server}. ${data.prettyGrow}`);
    scriptToUse = SCRIPTS.GROW;
    threadsToUse = data.growThreadsNeeded;
  } else {
    ns.print(`  • Would like to hack ${server}. ${data.prettyHack}`);
    const threadsForHalfBalance = Math.floor(data.hackThreadsNeeded / 2);
    const threadsForQuarterBalance = Math.floor(data.hackThreadsNeeded * 0.55);
    scriptToUse = SCRIPTS.HACK;
    threadsToUse = threadsForQuarterBalance;
  }
  TARGETS[server].isActive = true;
  TARGETS[server].jobID = jobID;
  // NOTE: This is naive and doesn't consider the fact that these threads have been allocated and even exist in the cluster
  TARGETS[server].runningThreads = threadsToUse;
  TARGETS[server].requestedThreads = threadsToUse;

  await c.distribute(ns, scriptToUse, threadsToUse, server, PORT, jobID);
}

/** @param {NS} ns */
/** @param {string} server */
async function analyzeServer(ns, server) {
  // Money
  const currentMoney = ns.getServerMoneyAvailable(server);
  const maxMoney = ns.getServerMaxMoney(server);
  const currentHackTime = ns.getHackTime(server);
  const currentGrowTime = ns.getGrowTime(server);
  const moneyBalancePercentage = ((currentMoney / maxMoney) * 100).toFixed(2);

  // Security
  const currentSecurity = ns.getServerSecurityLevel(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const currentWeakenTime = ns.getWeakenTime(server);
  const additionalSecurity = currentSecurity - minSecurity;

  // Threads
  const hackThreadsNeeded = Math.ceil(
    ns.hackAnalyzeThreads(server, currentMoney),
  );
  const growThreadsNeeded = Math.ceil(
    ns.growthAnalyze(server, maxMoney / currentMoney),
  );
  const weakenThreadsNeeded = Math.ceil((currentSecurity - minSecurity) * 20);

  const prettyCash = `${ns.nFormat(currentMoney, "$0.0a")} / ${ns.nFormat(
    maxMoney,
    "$0.0a",
  )} (${moneyBalancePercentage}%)`;
  const prettyHack = `${ns.tFormat(currentHackTime)} (t=${hackThreadsNeeded})`;
  const prettyGrow = `${ns.tFormat(currentGrowTime)} (t=${growThreadsNeeded})`;
  const prettyWeaken = `${ns.tFormat(
    currentWeakenTime,
  )} (t=${weakenThreadsNeeded})`;
  const prettySecurity = `${minSecurity} / ${currentSecurity.toFixed(
    2,
  )} (Δ ${additionalSecurity.toFixed(2)})`;
  ns.print(
    `🧪${server}: ${prettyCash}, Grow ${prettyGrow}, Hack ${prettyHack}, Weaken ${prettyWeaken}, Security ${prettySecurity}`,
  );
  return {
    currentWeakenTime,
    currentGrowTime,
    currentHackTime,
    hackThreadsNeeded,
    growThreadsNeeded,
    weakenThreadsNeeded,
    additionalSecurity,
    moneyBalancePercentage,
    prettyHack,
    prettyWeaken,
    prettySecurity,
    prettyGrow,
  };
}
class Cluster {
  getAvailableThreads(ns, script) {
    const scriptRam = ns.getScriptRam(script);
    let totalThreads = 0;
    const allServers = getUsableServersEnriched(ns);

    for (const server of allServers) {
      totalThreads += Math.floor(server.availableMemory / scriptRam);
    }
    return totalThreads;
  }

  async distribute(ns, script, desiredThreads, ...args) {
    const allServers = getUsableServersEnriched(ns).sort(
      (a, b) => b.availableMemory - a.availableMemory,
    );
    const availableClusterThreads = this.getAvailableThreads(ns, script);

    if (availableClusterThreads == 0) {
      ns.print(`Cluster has no more resources to distribute ${script}`);
    }

    let threadsToAllocate = Math.min(desiredThreads, availableClusterThreads);
    if (threadsToAllocate != desiredThreads) {
      ns.print(
        `Requested to allocate ${desiredThreads} within the cluster but only ${threadsToAllocate} are available`,
      );
    }
    for (const server of allServers) {
      const scriptRam = ns.getScriptRam(script);
      const threadsOnServer = Math.floor(server.availableMemory / scriptRam);

      const threadsAllocatableOnServer = Math.min(
        threadsOnServer,
        threadsToAllocate,
      );
      if (threadsAllocatableOnServer <= 0) {
        continue;
      }
      // if (!ns.fileExists(script, server)) {
      //   ns.scp(script, server);
      // }
      ns.scp(script, server.name);
      ns.exec(
        script,
        server.name,
        threadsAllocatableOnServer,
        ...args,
        threadsAllocatableOnServer,
      );
      threadsToAllocate -= threadsAllocatableOnServer;
      ns.print(
        `     → Started ${script} on ${server.name} with t=${threadsAllocatableOnServer}`,
      );
    }
  }
}
// TODO: Retrieve current cluster state. Eg scan procs on servers and tally the process and threads
// Add queue to interface with cluster instead of immedate distribution
// Optimisation oportunities:
// * Keep hacking until 50% balance (will account for failed hacks)
// * Auto scale to all targes within a single invocation. Requires some state management
// * Prioritise single machine over distributed computing. Perhaps identify the machine with most available threads in order of prority
