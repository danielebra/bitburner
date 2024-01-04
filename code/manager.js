import { getUsableServers } from '/code/utils.js'
/** @param {NS} ns */
export async function main(ns) {
  const target = ns.args[0]
  ns.print("Target is " + target)
  const memoryCost = ns.getScriptRam("code/bot2.js")
  const nodes = getUsableServers(ns)
  let totalThreads = 0
  nodes.forEach((node) => {
    ns.print("Setting up " + node)
    ns.killall(node)
    ns.scp("code/bot2.js", node)
    const nodeRam = ns.getServerMaxRam(node)
    if (nodeRam == 0) {
      ns.print("Server has insufficient memory, skipping");
      return;
    }
    const maxThreads = Math.floor(nodeRam / memoryCost)
    ns.tprint("Server: " + node + ". Threads: " + maxThreads);
    totalThreads += maxThreads;

    ns.exec("code/bot2.js", node, maxThreads, target);
  })

  ns.tprint("Total Threads: " + totalThreads);
}

function scanHosts(ns, server, visitedServers = []) {
    // Scan for connected servers
    let connectedServers = ns.scan(server);

    for (let i = 0; i < connectedServers.length; i++) {
        let connectedServer = connectedServers[i];

        // If the server is not in the visited list, add it and scan it recursively
        if (!visitedServers.includes(connectedServer)) {
            visitedServers.push(connectedServer);
            scanHosts(ns, connectedServer, visitedServers);
        }
    }

    return visitedServers;
}