import { runManualAutomation } from "./automation.js";

const job = process.argv[2] ?? "daily";
const text = process.argv.slice(3).join(" ");

const result = await runManualAutomation(job, { text });
console.log(JSON.stringify({ job, result }, null, 2));
