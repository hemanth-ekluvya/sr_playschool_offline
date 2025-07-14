const si = require("systeminformation");
const crypto = require("crypto");

async function getHWID() {
  try {
    const bios = await si.bios();
    const cpu = await si.cpu();
    const net = await si.networkInterfaces();

    const uuid = bios.uuid || "no-uuid";
    const processorId = cpu.processorId || cpu.brand || "no-cpu";
    const mac = net.find(n => n.mac && n.mac !== '00:00:00:00:00:00')?.mac || "no-mac";

    const raw = `${uuid}-${processorId}-${mac}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex");

    console.log("Current HWID RAW:", raw);
    console.log("Current HWID HASH:", hash);

    return { raw, hash };
  } catch (err) {
    console.error("HWID error:", err);
    return { raw: "invalid", hash: "invalid" };
  }
}

module.exports = getHWID;
