const { Client, GatewayIntentBits, Partials } = require("discord.js");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const SUBMISSIONS_CHANNEL_ID = "1501625701198205009";
const APPROVAL_EMOJI = "✅";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

client.once("ready", () => {
  console.log(`✅ XP Reaction Bot is online as ${client.user.tag}`);
});

client.on("messageReactionAdd", async (reaction, user) => {
  try {console.log("REACTION EVENT FIRED");
console.log("Emoji:", reaction.emoji.name);
console.log("User ID:", user.id);
console.log("Channel ID:", reaction.message.channel.id);
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const emoji = reaction.emoji.name;
    const channelId = reaction.message.channel.id;

    if (emoji !== APPROVAL_EMOJI) return;
    if (channelId !== SUBMISSIONS_CHANNEL_ID) return;

    const submitter = reaction.message.author;

    if (!submitter || submitter.bot) return;

    const attachments = Array.from(reaction.message.attachments.values()).map(
      (attachment) => attachment.url
    );

    const payload = {
      type: "xp_approval",
      emoji,
      reactor_id: user.id,
      reactor_username: user.username,
      message_id: reaction.message.id,
      channel_id: channelId,
      submitter_id: submitter.id,
      submitter_username: submitter.username,
      content: reaction.message.content || "",
      attachments
    };

    console.log("Sending XP approval to n8n:", payload);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("n8n webhook failed:", response.status, await response.text());
      return;
    }

    console.log(`✅ XP approval sent for ${submitter.username}`);
  } catch (error) {
    console.error("Reaction approval error:", error);
  }
});
console.log("TOKEN EXISTS:", !!DISCORD_TOKEN);
console.log("TOKEN LENGTH:", DISCORD_TOKEN ? DISCORD_TOKEN.length : 0);
client.login(DISCORD_TOKEN);