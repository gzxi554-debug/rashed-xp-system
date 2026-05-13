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
    console.log("SYNCING ROLE");
    console.log("User ID:", userId);
    console.log("Rank:", rank);

    const member = await guild.members.fetch(userId);
    const newRoleId = rankRoles[rank];

    if (!newRoleId) {
      console.log("No role found for rank:", rank);
      return;
    }

    const allRankRoleIds = Object.values(rankRoles);

    for (const roleId of allRankRoleIds) {
      if (member.roles.cache.has(roleId) && roleId !== newRoleId) {
        console.log("Removing role:", roleId);
        await member.roles.remove(roleId);
      }
    }

    if (!member.roles.cache.has(newRoleId)) {
      console.log("Adding role:", newRoleId);
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

    if (messages.size > 0) {
      await channel.bulkDelete(messages, true);
      console.log(`🧹 Cleared ${messages.size} messages from ${channel.name}`);
    }
  } catch (err) {
    console.error("CLEAR CHANNEL ERROR:", err);
  }
}

function scheduleDailyShop() {
  const now = new Date();
  const target = new Date();

  target.setHours(23, 0, 0, 0); // 11:00 PM server/Railway time

  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();

  console.log(`🕒 Daily shop scheduled in ${Math.floor(delay / 1000)} seconds`);

  setTimeout(() => {
    postDailyShop();

    setInterval(() => {
      postDailyShop();
    }, 24 * 60 * 60 * 1000);
  }, delay);
}

function buildUploadUrl(user) {
  const discordId = encodeURIComponent(user.id);
  const username = encodeURIComponent(user.username);

  return `${UPLOAD_BASE_URL}/?discordId=${discordId}&username=${username}`;
}

async function postSubmissionsOpen() {
  try {
    const channel = await client.channels.fetch(SUBMISSIONS_CHANNEL_ID);
    if (!channel) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_challenge")
        .setLabel("Submit Challenge")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      embeds: [
        {
          color: 0x00D1FF,
          title: "📥 Submissions Are Open",
          description:
`Click **Submit Challenge** to open your secure GamersEra upload page.

Your Discord account will be linked automatically, so you only need to choose your game, challenge, and upload your clip.`
        }
      ],
      components: [row]
    });

    console.log("✅ Submission open message posted.");
  } catch (err) {
    console.error("SUBMISSIONS OPEN POST ERROR:", err);
  }
}

const challenges = [
  { game: "Fortnite", name: "Survive 10 minutes", xp: 50 },
  { game: "Fortnite", name: "Deal 300 damage", xp: 50 },
  { game: "Fortnite", name: "Eliminate 2 bodyguards", xp: 50 },
  { game: "Fortnite", name: "Open 5 chests", xp: 50 },
  { game: "Fortnite", name: "Travel across 2 POIs", xp: 50 },
  { game: "Fortnite", name: "Use 2 different weapons", xp: 50 },
  { game: "Fortnite", name: "Loot a boss area", xp: 50 },
  { game: "Fortnite", name: "Climb for 10 minutes", xp: 50 },
  { game: "Fortnite", name: "Reach mid-height", xp: 50 },
  { game: "Fortnite", name: "Play 2 normal Fortnite matches", xp: 50 },

  { game: "Fortnite", name: "Defeat 1 boss", xp: 100 },
  { game: "Fortnite", name: "Eliminate 5 bodyguards", xp: 100 },
  { game: "Fortnite", name: "Survive 15 minutes", xp: 100 },
  { game: "Fortnite", name: "Deal 800 damage", xp: 100 },
  { game: "Fortnite", name: "Get 3 eliminations in one run", xp: 100 },
  { game: "Fortnite", name: "Fight in a boss zone and survive", xp: 100 },
  { game: "Fortnite", name: "Defeat boss and survive 3 minutes", xp: 100 },
  { game: "Fortnite", name: "Reach checkpoint 1", xp: 100 },
  { game: "Fortnite", name: "Climb for 15 minutes", xp: 100 },
  { game: "Fortnite", name: "Get 3 eliminations in normal Fortnite", xp: 100 },

  { game: "Fortnite", name: "Defeat 2 bosses in one run", xp: 150 },
  { game: "Fortnite", name: "Defeat 3 bosses in one run", xp: 200 },
  { game: "Fortnite", name: "Defeat boss without dying", xp: 150 },
  { game: "Fortnite", name: "Clear boss area: boss + guards", xp: 150 },
  { game: "Fortnite", name: "Survive 20 minutes and defeat a boss", xp: 200 },
  { game: "Fortnite", name: "Get 6 eliminations", xp: 150 },
  { game: "Fortnite", name: "Win a Mini BR match", xp: 200 },
  { game: "Fortnite", name: "Reach checkpoint without falling", xp: 150 },
  { game: "Fortnite", name: "Climb for 20 minutes continuously", xp: 150 },
  { game: "Fortnite", name: "Win 1 normal Fortnite match", xp: 200 },

  { game: "Rocket League", name: "Score 1 goal", xp: 50 },
  { game: "Rocket League", name: "Get 1 assist", xp: 50 },
  { game: "Rocket League", name: "Make 2 saves", xp: 50 },
  { game: "Rocket League", name: "Play 2 matches", xp: 50 },
  { game: "Rocket League", name: "Win 1 match", xp: 50 },
  { game: "Rocket League", name: "Score 2 goals in one match", xp: 100 },
  { game: "Rocket League", name: "Get 1 goal + 1 assist", xp: 100 },
  { game: "Rocket League", name: "Make 3 saves in one match", xp: 100 },
  { game: "Rocket League", name: "Win 2 matches", xp: 100 },
  { game: "Rocket League", name: "Get MVP", xp: 100 },
  { game: "Rocket League", name: "Score a hat-trick", xp: 150 },
  { game: "Rocket League", name: "Win 3 matches in a row", xp: 150 },
  { game: "Rocket League", name: "Get MVP in 2 matches", xp: 150 },
  { game: "Rocket League", name: "Score overtime winner", xp: 150 },
  { game: "Rocket League", name: "Win ranked match", xp: 150 },
  { game: "Rocket League", name: "Score aerial goal", xp: 100 },
  { game: "Rocket League", name: "Assist 2 goals", xp: 100 },
  { game: "Rocket League", name: "Score from midfield", xp: 100 },
  { game: "Rocket League", name: "Win by 3+ goals", xp: 150 },
  { game: "Rocket League", name: "Get 5 shots on target", xp: 100 },
  { game: "Rocket League", name: "Play 5 matches", xp: 150 },
  { game: "Rocket League", name: "Win without conceding", xp: 150 },
  { game: "Rocket League", name: "Score last second goal", xp: 150 },
  { game: "Rocket League", name: "Make 5 saves", xp: 150 },
  { game: "Rocket League", name: "Get 3 assists", xp: 150 },
  { game: "Rocket League", name: "Play with a teammate", xp: 50 },
  { game: "Rocket League", name: "Win with squad", xp: 100 },
  { game: "Rocket League", name: "Score 2 goals + assist", xp: 150 },
  { game: "Rocket League", name: "Win overtime match", xp: 150 },
  { game: "Rocket League", name: "Play 3 ranked matches", xp: 100 },

  { game: "FC26", name: "Score 2 goals", xp: 50 },
  { game: "FC26", name: "Win 1 match", xp: 50 },
  { game: "FC26", name: "Make 3 tackles", xp: 50 },
  { game: "FC26", name: "Keep 50% possession", xp: 50 },
  { game: "FC26", name: "Play 2 matches", xp: 50 },
  { game: "FC26", name: "Win by 2 goals", xp: 100 },
  { game: "FC26", name: "Score with 2 different players", xp: 100 },
  { game: "FC26", name: "Keep clean sheet", xp: 100 },
  { game: "FC26", name: "Make 5 tackles", xp: 100 },
  { game: "FC26", name: "Get 5 shots on target", xp: 100 },
  { game: "FC26", name: "Win 3 matches", xp: 150 },
  { game: "FC26", name: "Score hat-trick", xp: 150 },
  { game: "FC26", name: "Win without conceding", xp: 150 },
  { game: "FC26", name: "Score in first 10 minutes", xp: 100 },
  { game: "FC26", name: "Score from outside the box", xp: 150 },
  { game: "FC26", name: "Win comeback match", xp: 150 },
  { game: "FC26", name: "Score winning goal after 80th min", xp: 150 },
  { game: "FC26", name: "Make 8 tackles", xp: 150 },
  { game: "FC26", name: "Keep 60% possession", xp: 150 },
  { game: "FC26", name: "Play 5 matches", xp: 150 },
  { game: "FC26", name: "Score header goal", xp: 100 },
  { game: "FC26", name: "Assist 2 goals", xp: 100 },
  { game: "FC26", name: "Score 3 goals in one match", xp: 150 },
  { game: "FC26", name: "Win online match", xp: 100 },
  { game: "FC26", name: "Score with defender", xp: 100 },
  { game: "FC26", name: "Win penalty shootout", xp: 150 },
  { game: "FC26", name: "Score 2 long shots", xp: 150 },
  { game: "FC26", name: "Keep 2 clean sheets", xp: 150 },
  { game: "FC26", name: "Win 2 matches in a row", xp: 100 },
  { game: "FC26", name: "Play with different teams", xp: 100 }
];

function clean(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
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

  postDailyShop();
  scheduleDailyShop();
});

client.on("messageReactionAdd", async (reaction, user) => {
  try {
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

    const gameMatch = content.match(/\[Game:\s*(.+?)\]/i);
    const challengeMatch = content.match(/\[Challenge:\s*(.+?)\]/i);

    if (!gameMatch || !challengeMatch) {
      console.log("STOPPED: missing [Game:] or [Challenge:]");
      return;
    }

    const submittedGame = gameMatch[1].trim();
    const submittedChallenge = challengeMatch[1].trim();

    const challenge = challenges.find(c =>
      clean(c.game) === clean(submittedGame) &&
      clean(c.name) === clean(submittedChallenge)
    );

    if (!challenge) {
      console.log("STOPPED: challenge not found:", submittedGame, submittedChallenge);
      return;
    }

    const attachments = Array.from(reaction.message.attachments.values()).map(a => a.url);

    const payload = {
      type: "xp_approval",
      emoji,
      reactor_id: user.id,
      reactor_username: user.username,
      message_id: reaction.message.id,
      channel_id: channelId,
      submitter_id: submitter.id,
      submitter_username: submitter.username,
      game: challenge.game,
      challenge_name: challenge.name,
      xp: challenge.xp,
      content,
      attachments
    };

    console.log("Sending XP approval to n8n:", payload);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("n8n response status:", response.status);

    if (!response.ok) {
      console.error("n8n webhook failed:", response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log("n8n response data:", data);

    const rank = data.rank?.trim();

    if (rank) {
      await syncRankRole(reaction.message.guild, submitter.id, rank);
    }

    console.log(`✅ ${submitter.username} earned ${challenge.xp} XP for ${challenge.name}`);
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: message.author.id
      })
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

    if (!response.ok) {
      console.error("Daily shop webhook failed:", response.status, await response.text());
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data.items) || data.items.length === 0) {
      console.log("No shop items returned from n8n.");
      return;
    }

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
        footer: {
          text: `Item ID: ${item.item_id}`
        }
      };

      if (item.image_url) {
        embed.image = { url: item.image_url };
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${item.item_id}`)
          .setLabel("Buy Item")
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (err) {
    console.error("SHOP ERROR:", err);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    if (interaction.customId === "submit_challenge") {
      const uploadUrl = buildUploadUrl(interaction.user);

      await interaction.reply({
        content: `✅ Your secure upload page is ready:\n${uploadUrl}\n\nOnly you can see this message.`,
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

      await interaction.editReply({
        content: "✅ Purchase marked as delivered."
      });

      return;
    }

    if (!interaction.customId.startsWith("buy_")) return;

    const itemId = interaction.customId.replace("buy_", "");

    // Prevent Discord timeout while n8n processes the purchase
    await interaction.deferReply({ ephemeral: true });

    const response = await fetch(PURCHASE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: interaction.user.id,
        username: interaction.user.username,
        item_id: itemId
      })
    });

    const rawText = await response.text();

    console.log("Purchase webhook status:", response.status);
    console.log("Purchase webhook raw response:", rawText);

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
      console.error("Purchase webhook did not return JSON:", rawText);

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

    // DM receipt to buyer
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
    } catch (err) {
      console.log("Could not DM user purchase receipt.");
    }

    // Admin purchase log with Delivered button
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
    console.error("BUY BUTTON ERROR:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ Purchase failed."
        });
      } else {
        await interaction.reply({
          content: "❌ Purchase failed.",
          ephemeral: true
        });
      }
    } catch (e) {
      console.error("FINAL INTERACTION ERROR:", e);
    }
  }
});

client.login(DISCORD_TOKEN);


