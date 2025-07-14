const si = require("systeminformation");

async function run() {
  const uuid = await si.uuid();
  const cpu = await si.cpu();

  const uuidValue = uuid.os;
  const processorId = cpu.processorId || "unknown";

//   const uuidHash = crypto.createHash("sha256").update(uuidValue).digest("hex");
//   const processorHash = crypto
//     .createHash("sha256")
//     .update(processorId)
//     .digest("hex");

  console.log("UUID:", uuidValue);
//   console.log("UUID Hash:", uuidHash);
  console.log("Processor ID:", processorId);
//   console.log("Processor Hash:", processorHash);
}

run();
