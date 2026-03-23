import { Inngest } from "inngest";
import { env } from "../config/env.js";

export const inngest = new Inngest({
  id: env.INNGEST_APP_ID,
  eventKey: env.INNGEST_EVENT_KEY,
});
