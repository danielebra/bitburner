/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  const objectives = [new FactionAutomator(ns), new ProgramPurchaser(ns)];
  let shouldLoop = true;
  while (shouldLoop) {
    shouldLoop = objectives
      .filter((o) => o.isActive)
      .map((o) => {
        const shouldContinue = o.evaluateContinuation();
        const tick = o.tick();
        ns.print({ objective: o.toString(), shouldContinue, tick });
        if (!shouldContinue) o.tearDown();
        return shouldContinue;
      })
      .includes(true);
    await ns.sleep(2500);
  }
}

class Objective {
  /** @param {NS} ns */
  constructor(ns) {
    this.ns = ns;
    this.isActive = true;
  }
  // Check whether the objective has been met
  shouldContinue() {
    // Update isActive
  }
  // Do the work
  tick() {}

  tearDown() {
    if (this.isActive === false) {
      this.ns.toast(`${this.toString()} has completed`, "success");
    }
  }
}

class FactionAutomator extends Objective {
  HACK_FACTIONS = ["CyberSec", "BitRunners", "NiteSec", "The Black Hand"];
  OTHER_SAFE_FACTIONS = ["Tian Di Hui", "Netburners"];

  constructor(ns) {
    super(ns);
    this.SAFE_TO_JOIN = [...this.HACK_FACTIONS, ...this.OTHER_SAFE_FACTIONS];
  }

  evaluateContinuation() {
    const currentFactions = this.ns.getPlayer().factions;
    const finishedJoiningFactions = currentFactions.includes(this.SAFE_TO_JOIN);
    this.isActive = !finishedJoiningFactions;
    return this.isActive;
  }

  tick() {
    return this.autoJoin();
  }

  autoJoin() {
    const invites = this.ns.singularity.checkFactionInvitations();
    if (invites.length === 0) return false;
    let joinedFactions = [];
    for (const faction of invites) {
      if (this.SAFE_TO_JOIN.includes(faction)) {
        joinedFactions.push(this.ns.singularity.joinFaction(faction));
        this.ns.print(`Joining Faction: ${faction}`);
        this.ns.toast(`Joining Faction: ${faction}`, "info");
      }
    }
    return joinedFactions;
  }
  toString() {
    return "Automatically join factions";
  }
}

class ProgramPurchaser extends Objective {
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

