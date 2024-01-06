import { getUsableServersEnriched } from "/code/utils.js";
export class Cluster {
  /** @param {NS} ns */
  getAvailableThreads(ns, script) {
    const scriptRam = ns.getScriptRam(script);
    let totalThreads = 0;
    const allServers = getUsableServersEnriched(ns);

    for (const server of allServers) {
      totalThreads += Math.floor(server.availableMemory / scriptRam);
    }
    return totalThreads;
  }

  /** @param {NS} ns */
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
