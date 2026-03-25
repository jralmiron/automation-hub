import { runNightDigest } from "./automation.js";

const result = await runNightDigest("github-actions-night");
console.log(JSON.stringify(result, null, 2));
