import { handleTelegramWebhookRequest } from "../src/telegram-bridge/telegram-webhook.js";

const payload = {
  update_id: 1,
  message: {
    message_id: 1,
    text: process.env.TEST_TELEGRAM_TEXT ?? "/help",
    chat: { id: process.env.TELEGRAM_CHAT_ID ?? "0", type: "private" },
    from: { id: 1, is_bot: false, username: "local-test" },
  },
};

const result = await handleTelegramWebhookRequest({
  body: payload,
  secretHeader: process.env.TELEGRAM_WEBHOOK_SECRET,
});

console.log(JSON.stringify(result, null, 2));
