const { Client, GatewayIntentBits, Partials } = require("discord.js");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const SUBMISSIONS_CHANNEL_ID = "1501823063694770206";
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
  try {
    console.log("REACTION EVENT FIRED");

    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const emoji = reaction.emoji.name;
    const channelId = reaction.message.channel.id;

    if (emoji !== APPROVAL_EMOJI) return;
    if (channelId !== SUBMISSIONS_CHANNEL_ID) return;

    const submitter = reaction.message.author;

    if (!submitter || submitter.bot) return;

    const content = reaction.message.content || "";

    const xpMatch = content.match(/\[XP:\s*(\d+)\]/i);
    const challengeXp = xpMatch ? Number(xpMatch[1]) : 100;

    const challengeMatch = content.match(/\[Challenge:\s*(.+?)\]/i);
    const challengeName = challengeMatch
      ? challengeMatch[1].trim()
      : "Unknown Challenge";

    const attachments = Array.from(
      reaction.message.attachments.values()
    ).map(a => a.url);

    const payload = {
      type: "xp_approval",
      emoji,
      reactor_id: user.id,
      reactor_username: user.username,
      message_id: reaction.message.id,
      channel_id: channelId,
      submitter_id: submitter.id,
      submitter_username: submitter.username,
      content,
      challenge_name: challengeName,
      xp: challengeXp,
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

    console.log("n8n response status:", response.status);

    if (!response.ok) {
      console.error("n8n webhook failed:", response.status, await response.text());
      return;
    }

    console.log(`✅ XP approval sent for ${submitter.username}`);
  } catch (error) {
    console.error("Reaction approval error:", error);
  }
});

client.login(DISCORD_TOKEN);
