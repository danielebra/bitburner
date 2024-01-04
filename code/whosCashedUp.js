import { getUsableServers } from '/code/utils.js'
export async function main(ns) {
  ns.disableLog('ALL')
  let servers = getUsableServers(ns);

  ns.tail()
  while (true) {
    ns.clearLog()
    
    let serverMoneyInfo = servers.map(server => {
        const maxMoney = ns.getServerMaxMoney(server);
        const currentMoney = ns.getServerMoneyAvailable(server);
        const percentageFilled = maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0;
        return {
            name: server,
            currentMoney: currentMoney,
            maxMoney: maxMoney,
            percentageFilled: percentageFilled
        };
    });

    serverMoneyInfo = serverMoneyInfo.filter(info => info.maxMoney > 0);
    serverMoneyInfo.sort((a, b) => b.percentageFilled - a.percentageFilled);

    // serverMoneyInfo.sort((a, b) => b.currentMoney - a.currentMoney);

    // Display the information
    serverMoneyInfo.forEach(info => {
      const percentageFilled = ((info.currentMoney / info.maxMoney) * 100).toFixed(2);
    ns.print(`${info.name}: $${info.currentMoney.toLocaleString()}/$${info.maxMoney.toLocaleString()} (${info.percentageFilled.toFixed(2)}%)`);
    });
    await ns.sleep(2500)
  }
}