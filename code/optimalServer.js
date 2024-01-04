/** @param {NS} ns **/
export async function main(ns) {
  const maxServers = 25; // Maximum number of servers you can own
  const playerMoney = ns.getPlayer().money; // Current money available


  return calculateOptimalServerMemory(ns, maxServers, playerMoney)
}

export function calculateOptimalServerMemory(ns, maxServers, playerMoney) {
  const serverCosts = calculateServerCosts(ns, maxServers);
  let optimalMemory = 0;
  for (let memory in serverCosts) {
    if (serverCosts[memory] <= playerMoney) {
      optimalMemory = Math.max(optimalMemory, parseInt(memory));
    }
  }

  ns.tprint("Optimal Purchase: " + maxServers + " servers with " + optimalMemory + "GB each. This will cost $" + serverCosts[optimalMemory]);
  return optimalMemory
}

// Calculate the cost of purchasing the maximum number of servers for each memory size
function calculateServerCosts(ns, maxServers) {
  let serverCosts = {};
  for (let mem = 2; mem <= ns.getPurchasedServerMaxRam(); mem *= 2) {
    serverCosts[mem] = ns.getPurchasedServerCost(mem) * maxServers;
  }
  return serverCosts;
}