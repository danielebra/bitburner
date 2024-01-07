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

export function getUsableServers(ns, excludeHome = true) {
  const allServers = discoverServers(ns);

  const servers = allServers.filter((server) => ns.hasRootAccess(server));
  if (excludeHome) {
    return servers.filter((server) => server != "home");
  }
  return servers;
}

/** @param {NS} ns */
export function getUsableServersEnriched(ns, excludeHome = true) {
  const currentHackingLevel = ns.getHackingLevel();
  return getUsableServers(ns, excludeHome).map((server) => {
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
      hackable: currentHackingLevel > ns.getServerRequiredHackingLevel(server),
    };
  });
}

export function generateUUID() {
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
export const SCRIPTS = {
  WEAKEN: "/code/farm/weaken.js",
  FOREVER_WEAKEN: "/code/farm/forever-weaken.js",
  GROW: "/code/farm/grow.js",
  HACK: "/code/farm/hack.js",
};
