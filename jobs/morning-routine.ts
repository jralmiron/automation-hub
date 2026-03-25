import { runMorningRoutine } from "./automation.js";

const result = await runMorningRoutine("github-actions-morning");
console.log(JSON.stringify(result, null, 2));
