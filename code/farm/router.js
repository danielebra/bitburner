// Objective: Maintain 50% of prize pool

import { getUsableServersEnriched, generateUUID, SCRIPTS } from "/code/utils.js";
import { Cluster } from "/code/farm/cluster.js";
import { analyzeServer } from "/code/farm/inspector.js";

let TARGETS = {};

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
    const servers =
      [ns.args[0]] ||
      getUsableServersEnriched(ns)
        .filter((x) => x.hackable && x.maxMoney > 0)
        .map((info) => info.name);

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
  const c = new Cluster(ns, false);
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

  await c.distribute(scriptToUse, threadsToUse, server, PORT, jobID);
}
