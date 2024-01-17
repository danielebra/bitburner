const CITIES = {
  Aevum: "Aevum",
  Chongqing: "Chongqing",
  Sector12: "Sector-12",
  NewTokyo: "New Tokyo",
  Ishima: "Ishima",
  Volhaven: "Volhaven",
};

/** @param {NS} ns */
export async function main(ns) {
  ns.tail();
  await controller(ns);
}

/** @param {NS} ns */
async function controller(ns) {
  const corp = new CorporationManager(ns, ["Agriculture", "escobar"]);

  const cities = corp.divisions.flatMap((d) => d.cities);
  while (true) {
    cities.forEach((c) => c.energise());
    await ns.sleep(1000);
  }
}

class CorporationManager {
  /**
   * @param {NS} ns - Namespace object provided by Bitburner.
   * @param {string[]} divisionNames - Array of division names.
   */
  constructor(ns, divisionNames) {
    this.ns = ns;
    this.divisions = divisionNames.map((d) => new DivisionManager(ns, d));
  }
}
class DivisionManager {
  /**
   * @param {NS} ns - Namespace object provided by Bitburner.
   * @param {string} divisionName - Name of the division.
   */
  constructor(ns, divisionName) {
    this.ns = ns;
    this.divisionName = divisionName;
    this.cities = Object.values(CITIES).map((c) => new CityManager(ns, divisionName, c));
  }
}

class CityManager {
  /**
   * @param {NS} ns - Namespace object provided by Bitburner.
   * @param {string} divisionName - Name of the division.
   * @param {string} cityName - Name of the city.
   */
  constructor(ns, divisionName, cityName) {
    this.ns = ns;
    this.divisionName = divisionName;
    this.cityName = cityName;
  }
  energise() {
    const office = this.ns.corporation.getOffice(this.divisionName, this.cityName);
    const shouldGiveTea = office.avgEnergy < office.maxEnergy * 0.95;
    if (!shouldGiveTea) {
      this.ns.print(`${office.toString()} is already energised`);
      return;
    }
    this.ns.print(`Energising ${this}`);
    const outcome = this.ns.corporation.buyTea(this.divisionName, this.cityName);
    return outcome;
  }
  toString() {
    return `${this.divisionName}:${this.cityName}`;
  }
}
