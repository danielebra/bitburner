import { getUsableServersEnriched } from "/code/utils.js";
export class Cluster {
  /** @param {NS} ns */
  constructor(ns) {
    this.ns = ns;
  }
  getTotalRam() {
    const allServers = getUsableServersEnriched(this.ns);
    return allServers.reduce((acc, server) => acc + server.totalMemory, 0);
  }
  getTotalAvailableRam() {
    const allServers = getUsableServersEnriched(this.ns);
    return allServers.reduce((acc, server) => acc + server.availableMemory, 0);
  }
  getTotalUsedRam() {
    const allServers = getUsableServersEnriched(this.ns);
    return allServers.reduce((acc, server) => acc + server.usedMemory, 0);
  }
  getUtilizationPercentage() {
    const max = this.getTotalRam()
    const used = this.getTotalUsedRam()
    
    if (max === 0) return 0;

    return ((used / max) * 100).toFixed(2)

  }
  getAvailableThreads(script) {
    const scriptRam = this.ns.getScriptRam(script);
    let totalThreads = 0;
    const allServers = getUsableServersEnriched(this.ns);

    for (const server of allServers) {
      totalThreads += Math.floor(server.availableMemory / scriptRam);
    }
    return totalThreads;
  }

  async distribute(script, desiredThreads, ...args) {
    const allServers = getUsableServersEnriched(this.ns).sort(
      (a, b) => b.availableMemory - a.availableMemory,
    );
    const availableClusterThreads = this.getAvailableThreads(script);

    if (availableClusterThreads == 0) {
      this.ns.print(`Cluster has no more resources to distribute ${script}`);
    }

    let threadsToAllocate = Math.min(desiredThreads, availableClusterThreads);
    if (threadsToAllocate != desiredThreads) {
      this.ns.print(
        `Requested to allocate ${desiredThreads} within the cluster but only ${threadsToAllocate} are available`,
      );
    }
    for (const server of allServers) {
      const scriptRam = this.ns.getScriptRam(script);
      const threadsOnServer = Math.floor(server.availableMemory / scriptRam);

      const threadsAllocatableOnServer = Math.min(
        threadsOnServer,
        threadsToAllocate,
      );
      if (threadsAllocatableOnServer <= 0) {
        continue;
      }
      // if (!ns.fileExists(script, server)) {
      //   this.ns.scp(script, server);
      // }
      this.ns.scp(script, server.name);
      this.ns.exec(
        script,
        server.name,
        threadsAllocatableOnServer,
        ...args,
        threadsAllocatableOnServer,
      );
      threadsToAllocate -= threadsAllocatableOnServer;
      this.ns.print(
        `     → Started ${script} on ${server.name} with t=${threadsAllocatableOnServer}`,
      );
    }
  }
}
