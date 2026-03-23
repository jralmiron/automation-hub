import { inngest } from "../src/inngest/client.js";

async function main() {
  const result = await inngest.send({
    name: "automation/manual.run",
    data: {
      source: "seed-script",
      job: process.argv[2] ?? "daily",
      text: process.argv.slice(3).join(" ") || "Evento de prueba desde seed-events.ts",
    },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
