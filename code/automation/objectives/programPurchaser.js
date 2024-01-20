import { Objective } from "/code/automation/objectives/base";

export class ProgramPurchaser extends Objective {
  HACK_PROGRAMS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"];

  ownedPrograms() {
    // Find all hacking programs that the current user owns
    let filesOwned = [];
    for (const program of this.HACK_PROGRAMS) {
      const hasFile = this.ns.fileExists(program);
      if (!hasFile) continue;
      filesOwned.push(program);
    }
    return filesOwned;
  }

  evaluateContinuation() {
    const shouldContinue = this.HACK_PROGRAMS.length !== this.ownedPrograms().length;
    this.isActive = shouldContinue;
    return this.isActive;
  }
  hasTor() {
    return this.ns.singularity.getDarkwebPrograms().length !== 0;
  }

  tick() {
    // Do one action per tick
    const currentMoney = this.ns.getPlayer().money;
    if (!this.hasTor()) {
      return currentMoney >= 700_000 && this.ns.singularity.purchaseTor();
    }
    const filesOwned = new Set(this.ownedPrograms());
    const programsToPurchase = this.HACK_PROGRAMS.filter((x) => !filesOwned.has(x));
    for (const program of programsToPurchase) {
      const purchasePrice = this.ns.singularity.getDarkwebProgramCost(program);
      if (purchasePrice * 1.1 >= currentMoney) continue;
      const purchased = this.ns.singularity.purchaseProgram(program);
      this.ns.print(`Purchasing Program: ${program}`);
      this.ns.toast(`Purchasing Program: ${program}`, "info");
      this.ns.run("/code/pwn.js");
      return purchased;
    }
    return false;
  }
  toString() {
    return "Automatically purchase programs";
  }
}
