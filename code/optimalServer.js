/** @param {NS} ns **/
export async function main(ns) {
  const maxServers = 25; // Maximum number of servers you can own
  const playerMoney = ns.getPlayer().money; // Current money available


  calculateOptimalServerMemory(ns, maxServers, playerMoney)
  calculateLargestSingleServer(ns, playerMoney)
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

export function calculateLargestSingleServer(ns, playerMoney) {
  const serverCosts = getServerPrices(ns)
  let optimalMemory = 0;
  for (let memory in serverCosts) {
    if (serverCosts[memory] <= playerMoney) {
      optimalMemory = Math.max(optimalMemory, parseInt(memory));
    }
  }
  const pretty = serverCosts[optimalMemory].toLocaleString('en-US', {style: 'currency', currency:'USD'})

  ns.tprint(`Optimal Single Purchase: ${optimalMemory} GB. This will cost ${pretty}`);
  return optimalMemory
}

// Calculate the cost of purchasing the maximum number of servers for each memory size
function calculateServerCosts(ns, maxServers) {
  let serverCosts = {};
  for (let mem = 2; mem <= ns.getPurchasedServerMaxRam(); mem *= 2) {
    const price = ns.getPurchasedServerCost(mem)
    ns.tprint(`${mem.toLocaleString()}: ${price.toLocaleString('en-US', {style: 'currency', currency:'USD'})}`)
    serverCosts[mem] = price * maxServers;
  }
  return serverCosts;
}

function getServerPrices(ns) {
  let serverCost = {};
  for (let mem = 2; mem <= ns.getPurchasedServerMaxRam(); mem *= 2) {
    const price = ns.getPurchasedServerCost(mem)
    serverCost[mem] = price;
  }
  return serverCost;
}