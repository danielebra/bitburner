/** @param {NS} ns */
export async function main(ns) {}

export function discoverServers(ns) {
  let discoveredServers = ["home"]; // Start with 'home'
  let toScan = ["home"]; // Queue of servers to scan

  while (toScan.length) {
    let server = toScan.shift();
    let connectedServers = ns.scan(server);

    for (let connectedServer of connectedServers) {
      if (!discoveredServers.includes(connectedServer)) {
        discoveredServers.push(connectedServer);
        toScan.push(connectedServer);
      }
    }
  }
  return discoveredServers;
}

export function getUsableServers(ns) {
  const allServers = discoverServers(ns);

  const servers = allServers.filter((server) => ns.hasRootAccess(server));
  return servers.filter((server) => server != "home");
}

export function getUsableServersEnriched(ns) {
  return getUsableServers(ns).map((server) => {
    const maxMoney = ns.getServerMaxMoney(server);
    const currentMoney = ns.getServerMoneyAvailable(server);
    const percentageFilled = maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0;
    const usedMemory = ns.getServerUsedRam(server);
    const totalMemory = ns.getServerMaxRam(server);
    return {
      name: server,
      currentMoney: currentMoney,
      maxMoney: maxMoney,
      percentageFilled: percentageFilled,
      usedMemory: usedMemory,
      totalMemory: totalMemory,
      availableMemory: totalMemory - usedMemory,
    };
  });
}
