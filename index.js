const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_PROFILE_WEBHOOK_URL = process.env.N8N_PROFILE_WEBHOOK_URL;

const SUBMISSIONS_CHANNEL_ID = "1501823063694770206";
const SHOP_CHANNEL_ID = "1501628913435152615";
const ADMIN_SHOP_LOG_CHANNEL_ID = "1379446677647130805";
const APPROVAL_EMOJI = "✅";

const DAILY_SHOP_WEBHOOK_URL = "https://gamersera.app.n8n.cloud/webhook/dailyshop";
const PURCHASE_WEBHOOK_URL = "https://gamersera.app.n8n.cloud/webhook/shop";
const PROFILE_WEBHOOK_URL = "https://gamersera.app.n8n.cloud/webhook/profile";
const CLIP_REVIEW_ACTION_WEBHOOK_URL = "https://gamersera.app.n8n.cloud/webhook/clip-review-action";
const UPLOAD_BASE_URL = "https://gamersera-upload.gzxi554.workers.dev";

const rankRoles = {
  "Rookie": "1503078261150974092",
  "Grinder": "1503078939864862932",
  "Contender": "1503079208124027100",
  "Vanguard": "1503079523867168788",
  "Ascendant": "1503079798489092136",
  "Champion": "1503080883039506645",
  "GE Legend": "1503080595675283621"
};

async function syncRankRole(guild, userId, rank) {
  try {
    const member = await guild.members.fetch(userId);
    const newRoleId = rankRoles[rank];

    if (!newRoleId) return;

    for (const roleId of Object.values(rankRoles)) {
      if (member.roles.cache.has(roleId) && roleId !== newRoleId) {
        await member.roles.remove(roleId);
      }
    }

    if (!member.roles.cache.has(newRoleId)) {
      await member.roles.add(newRoleId);
    }

    console.log(`✅ Synced rank role for ${userId}: ${rank}`);
  } catch (err) {
    console.error("ROLE SYNC ERROR:", err);
  }
}

async function clearChannelMessages(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size > 0) await channel.bulkDelete(messages, true);
  } catch (err) {
    console.error("CLEAR CHANNEL ERROR:", err);
  }
}

function scheduleDailyShop() {
  const now = new Date();
  const target = new Date();

  target.setHours(23, 0, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  console.log(`🛒 Daily shop scheduled in ${Math.floor(delay / 1000)} seconds`);

  setTimeout(() => {
    postDailyShop();

    setInterval(() => {
      postDailyShop();
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

function scheduleSubmissionsOpen() {
  const now = new Date();
  const target = new Date();

  target.setHours(20, 0, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  console.log(`📸 Submissions open scheduled in ${Math.floor(delay / 1000)} seconds`);

  setTimeout(() => {
    postSubmissionsOpen();

    setInterval(() => {
      postSubmissionsOpen();
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

function buildUploadUrl(user) {
  return `${UPLOAD_BASE_URL}/?discordId=${encodeURIComponent(user.id)}&username=${encodeURIComponent(user.username)}`;
}

async function postSubmissionsOpen() {
  try {
    const channel = await client.channels.fetch(SUBMISSIONS_CHANNEL_ID);
    if (!channel) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_challenge")
        .setLabel("Submit Challenge now!")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: "Hey @everyone",
      embeds: [
        {
          color: 0x00D1FF,
          title: "📸 Daily Challenge Submissions Are Open",
          description:
`Submit your proof for today's challenges below 👇

━━━━━━━━━━━━━━

✅ **Requirements**

• Screenshot or clip proof
• Must show gameplay
• Use a different skin/team/car
• Mention which challenge you completed
• Fake submissions = XP denied

━━━━━━━━━━━━━━

🔥 Good luck grinders`
        }
      ],
      components: [row],
      allowedMentions: {
        parse: ["everyone"]
      }
    });

    console.log("✅ Submission open message posted.");
  } catch (err) {
    console.error("SUBMISSIONS OPEN POST ERROR:", err);
  }
}

const challenges = [];

function clean(text) {
  return String(text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once("ready", () => {
  console.log(`✅ XP Reaction Bot is online as ${client.user.tag}`);
  console.log(`🌍 Current server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  scheduleDailyShop();
  scheduleSubmissionsOpen();
});

client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;
  } catch (error) {
    console.error("Reaction approval error:", error);
  }
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === "/opensubmissions") {
      await postSubmissionsOpen();
      await message.reply("✅ Submission button posted.");
      return;
    }

    if (message.content.toLowerCase() !== "/geprofile") return;

    const response = await fetch(PROFILE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: message.author.id })
    });

    if (!response.ok) {
      await message.reply("❌ Failed to load profile.");
      return;
    }

    const data = await response.json();

    const currentXP = Number(data.total_xp || 0);
    const currentLevelXP = Math.floor(currentXP / 500) * 500;
    const progress = currentXP - currentLevelXP;
    const percentage = Math.floor((progress / 500) * 100);

    await message.reply({
      embeds: [
        {
          color: 0x00D1FF,
          title: `🎮 ${message.member?.displayName || message.author.username}'s Profile`,
          description:
`🏅 Rank: ${data.rank}
🎖️ Level: ${data.level}
⚡ Total XP: ${data.total_xp}
🪙 GE Tokens: ${data.ge_tokens}
✅ Challenges Completed: ${data.challenges_completed}

📈 Progress to next level:
${progress}/500 XP (${percentage}%)`
        }
      ]
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
  }
});

async function postDailyShop() {
  try {
    const response = await fetch(DAILY_SHOP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "discord_bot" })
    });

    if (!response.ok) return;

    const data = await response.json();
    const channel = await client.channels.fetch(SHOP_CHANNEL_ID);
    if (!channel) return;

    await clearChannelMessages(channel);

    await channel.send({
      content: "## 🪙 Daily GE Token Shop\nClick **Buy Item** under any reward to purchase privately."
    });

    for (const item of data.items) {
      const embed = {
        title: item.item_name,
        description:
`🏷️ ${item.category}

🪙 ${item.cost} GE Tokens

${item.description}`,
        color: item.category === "Featured Item" ? 0xFFD700 : 0x00D1FF,
        footer: { text: `Item ID: ${item.item_id}` }
      };

      if (item.image_url) embed.image = { url: item.image_url };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${item.item_id}`)
          .setLabel("Buy Item")
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });
    }
  } catch (err) {
    console.error("SHOP ERROR:", err);
  }
}

async function handleClipReview(interaction, action) {
  const prefix = action === "approve" ? "approve_clip_" : "reject_clip_";
  const fileName = interaction.customId.replace(prefix, "");

  await interaction.deferReply({ ephemeral: true });

  const response = await fetch(CLIP_REVIEW_ACTION_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action,
      fileName,
      admin_id: interaction.user.id,
      admin_username: interaction.user.username,
      message_id: interaction.message.id,
      channel_id: interaction.channelId,
      guild_id: interaction.guildId
    })
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error("CLIP REVIEW WEBHOOK ERROR:", response.status, rawText);

    await interaction.editReply({
      content: "❌ Review action failed. Check n8n clip-review-action workflow."
    });

    return;
  }

  let data = {};

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (err) {
    data = {};
  }

  const playerId =
    data.discordId ||
    data.discord_id ||
    data.user_id ||
    data.userId ||
    data["Discord ID"];

  const rank = data.rank || data.new_rank;

  if (action === "approve" && playerId && rank && interaction.guild) {
    await syncRankRole(interaction.guild, playerId, String(rank).trim());
  }

  const oldEmbed = interaction.message.embeds[0];
  const oldDescription = oldEmbed?.description || "";

  const alreadyReviewed =
    oldDescription.includes("✅ Status: Approved") ||
    oldDescription.includes("❌ Status: Rejected");

  const statusText =
    action === "approve"
      ? `✅ Status: Approved\n👮 Reviewed By: <@${interaction.user.id}>`
      : `❌ Status: Rejected\n👮 Reviewed By: <@${interaction.user.id}>`;

  const newColor = action === "approve" ? 0x2ECC71 : 0xE74C3C;
  const newTitle = action === "approve" ? "✅ Clip Submission Approved" : "❌ Clip Submission Rejected";

  const newDescription = alreadyReviewed
    ? oldDescription
    : `${oldDescription}

━━━━━━━━━━━━━━
${statusText}`;

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_done_${fileName}`)
      .setLabel(action === "approve" ? "Approved" : "Rejected")
      .setStyle(action === "approve" ? ButtonStyle.Success : ButtonStyle.Danger)
      .setDisabled(true)
  );

  await interaction.message.edit({
    embeds: [
      {
        color: newColor,
        title: newTitle,
        description: newDescription
      }
    ],
    components: [disabledRow]
  });

  if (playerId) {
    try {
      const player = await client.users.fetch(playerId);

      await player.send({
        embeds: [
          {
            color: newColor,
            title: action === "approve" ? "✅ Challenge Approved" : "❌ Challenge Rejected",
            description:
action === "approve"
  ? `Your challenge submission has been approved.

⚡ XP and GE Tokens have been added to your profile.`
  : `Your challenge submission has been rejected.

Please make sure your proof follows the challenge requirements before submitting again.`
          }
        ]
      });
    } catch (err) {
      console.log("Could not DM player review result.");
    }
  }

  await interaction.editReply({
    content: data.message || `✅ Submission ${action === "approve" ? "approved" : "rejected"} successfully.`
  });
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("approve_clip_")) {
      await handleClipReview(interaction, "approve");
      return;
    }

    if (interaction.customId.startsWith("reject_clip_")) {
      await handleClipReview(interaction, "reject");
      return;
    }

    if (interaction.customId === "submit_challenge") {
      const uploadUrl = buildUploadUrl(interaction.user);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Submit Challenge now!")
          .setStyle(ButtonStyle.Link)
          .setURL(uploadUrl)
      );

      await interaction.reply({
        content: "✅ Your secure upload page is ready. Click the button below to submit your proof.",
        components: [row],
        ephemeral: true
      });

      return;
    }

    if (interaction.customId.startsWith("delivered_")) {
      const parts = interaction.customId.split("_");
      const userId = parts[1];
      const itemId = parts.slice(2).join("_");

      await interaction.deferReply({ ephemeral: true });

      const oldEmbed = interaction.message.embeds[0];
      const oldDescription = oldEmbed?.description || "";

      const deliveredDescription = oldDescription.replace(
        "⏳ Status: Pending Delivery",
        `✅ Status: Delivered
👮 Delivered By: <@${interaction.user.id}>`
      );

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`delivered_done_${userId}_${itemId}`)
          .setLabel("Delivered")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );

      await interaction.message.edit({
        embeds: [
          {
            color: 0x2ECC71,
            title: "✅ Shop Purchase Delivered",
            description: deliveredDescription
          }
        ],
        components: [disabledRow]
      });

      try {
        const buyer = await client.users.fetch(userId);
        await buyer.send({
          embeds: [
            {
              color: 0x2ECC71,
              title: "✅ Your GE Shop Reward Was Delivered",
              description:
`Your purchase has been marked as delivered by the GamersEra team.

📦 Item ID: ${itemId}

Thank you for using the GE Token Shop!`
            }
          ]
        });
      } catch (err) {
        console.log("Could not DM user delivery confirmation.");
      }

      await interaction.editReply({ content: "✅ Purchase marked as delivered." });
      return;
    }

    if (!interaction.customId.startsWith("buy_")) return;

    const itemId = interaction.customId.replace("buy_", "");

    await interaction.deferReply({ ephemeral: true });

    const response = await fetch(PURCHASE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: interaction.user.id,
        username: interaction.user.username,
        item_id: itemId
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      await interaction.editReply({
        content: "❌ Purchase system error. Check n8n purchase workflow."
      });
      return;
    }

    let data;

    try {
      data = JSON.parse(rawText);
    } catch (err) {
      await interaction.editReply({
        content: "❌ Purchase system returned invalid JSON. Check n8n Respond to Webhook node."
      });
      return;
    }

    const success = data.success === true || data.success === "true";

    if (!success) {
      await interaction.editReply({
        content: `❌ ${data.message || "Purchase failed."}`
      });
      return;
    }

    await interaction.editReply({
      content:
`✅ ${data.message || `Successfully purchased ${itemId}.`}
🪙 New Balance: ${data.new_balance} GE Tokens`
    });

    try {
      await interaction.user.send({
        embeds: [
          {
            color: 0x00D1FF,
            title: "🛒 Purchase Successful",
            description:
`Thank you for your purchase from the GE Token Shop!

📦 Item: ${data.item_name || itemId}
🪙 Cost: ${data.cost || "?"} GE Tokens
💰 New Balance: ${data.new_balance} GE Tokens

An admin will contact you as soon as possible to help you redeem your reward. Thank you for supporting the GamersEra community!`
          }
        ]
      });
    } catch (err) {}

    try {
      const logChannel = await client.channels.fetch(ADMIN_SHOP_LOG_CHANNEL_ID);

      if (logChannel) {
        const deliveredRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`delivered_${interaction.user.id}_${itemId}`)
            .setLabel("Delivered")
            .setStyle(ButtonStyle.Success)
        );

        await logChannel.send({
          embeds: [
            {
              color: 0xFFD700,
              title: "🛒 New Shop Purchase",
              description:
`👤 User: <@${interaction.user.id}>
📦 Item: ${data.item_name || itemId}
🪙 Cost: ${data.cost || "?"} GE Tokens
💰 New Balance: ${data.new_balance} GE Tokens

⏳ Status: Pending Delivery`
            }
          ],
          components: [deliveredRow]
        });
      }
    } catch (err) {
      console.error("ADMIN SHOP LOG ERROR:", err);
    }
  } catch (err) {
    console.error("BUTTON ERROR:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "❌ Action failed." });
      } else {
        await interaction.reply({ content: "❌ Action failed.", ephemeral: true });
      }
    } catch (e) {}
  }
});

client.login(DISCORD_TOKEN);
