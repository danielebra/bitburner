export class Objective {
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
