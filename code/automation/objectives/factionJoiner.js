import { Objective } from "/code/automation/objectives/base";
export class FactionAutomator extends Objective {
  HACK_FACTIONS = ["CyberSec", "BitRunners", "NiteSec", "The Black Hand"];
  OTHER_SAFE_FACTIONS = ["Tian Di Hui"]; //, "Netburners"];

  constructor(ns) {
    super(ns);
    this.SAFE_TO_JOIN = [...this.HACK_FACTIONS, ...this.OTHER_SAFE_FACTIONS];
  }

  evaluateContinuation() {
    const currentFactions = this.ns.getPlayer().factions;
    const finishedJoiningFactions = this.SAFE_TO_JOIN.every((f) => currentFactions.includes(f));
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
