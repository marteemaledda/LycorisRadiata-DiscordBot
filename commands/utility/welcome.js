import { SlashCommandBuilder, ChannelType, MessageFlags } from "discord.js";
import { getDb } from '../../helper/db.js';

const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome messages for new members.')
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Enable or disable the welcome message and choose its channel/embed.')
            .addBooleanOption(option =>
                option
                    .setName('enabled')
                    .setDescription('Turn the welcome message on or off.')
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('Channel to send welcome messages in (required when enabling).')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('embed')
                    .setDescription('Saved embed name to use, or leave blank/"default" for the default message.')
                    .setRequired(false)
                    .setAutocomplete(true)
            )
    );

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const db = getDb();
    const settingsCollection = db.collection('settings');

    if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const embedInput = interaction.options.getString('embed');

        if (enabled) {
            if (!channel) {
                return interaction.reply({
                    content: 'Please provide a channel when enabling welcome messages.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            let welcomeEmbedName = null;
            if (embedInput && embedInput.trim().toLowerCase() !== 'default') {
                const requestedName = embedInput.trim();
                const embedDoc = await db.collection('embeds').findOne({ guildId, name: requestedName });
                if (!embedDoc) {
                    return interaction.reply({
                        content: `Saved embed "${requestedName}" was not found in this server. Leave the embed option blank to use the default welcome message.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
                welcomeEmbedName = embedDoc.name;
            }

            await settingsCollection.updateOne(
                { guildId },
                {
                    $set: {
                        welcomeChannelId: channel.id,
                        isEnabled: true,
                        welcomeEmbedName,
                    },
                },
                { upsert: true }
            );

            const embedLabel = welcomeEmbedName ? `saved embed **${welcomeEmbedName}**` : 'the default welcome message';
            return interaction.reply({
                content: `Welcome messages enabled in ${channel} using ${embedLabel}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const update = { $set: { isEnabled: false } };
        if (channel) update.$set.welcomeChannelId = channel.id;
        if (embedInput !== null) {
            if (embedInput.trim().toLowerCase() === 'default' || embedInput.trim() === '') {
                update.$set.welcomeEmbedName = null;
            } else {
                const requestedName = embedInput.trim();
                const embedDoc = await db.collection('embeds').findOne({ guildId, name: requestedName });
                if (embedDoc) update.$set.welcomeEmbedName = embedDoc.name;
            }
        }

        await settingsCollection.updateOne(
            { guildId },
            update,
            { upsert: true }
        );

        return interaction.reply({
            content: 'Welcome messages disabled.',
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function autocomplete(interaction) {
    if (interaction.options.getSubcommand() !== 'toggle') {
        return interaction.respond([]);
    }

    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== 'embed') {
        return interaction.respond([]);
    }

    const guildId = interaction.guild?.id;
    if (!guildId) {
        return interaction.respond([]);
    }

    const focused = String(focusedOption.value ?? '').toLowerCase();
    const embedsCollection = getDb().collection('embeds');

    const query = { guildId };
    if (focused) {
        query.name = { $regex: focused.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const embeds = await embedsCollection.find(query, { projection: { name: 1 } })
        .sort({ name: 1 })
        .limit(24)
        .toArray();

    const choices = [{ name: 'Default', value: 'default' }];
    for (const e of embeds) {
        if (!e?.name) continue;
        const name = String(e.name).slice(0, 100);
        if (name.toLowerCase() === 'default') continue;
        if (focused && name.toLowerCase().includes(focused) === false && !name.toLowerCase().startsWith(focused)) {
            // regex already filtered, keep
        }
        choices.push({ name, value: name });
        if (choices.length >= 25) break;
    }

    // Ensure "Default" shows when it matches filter or filter is empty
    const filtered = focused
        ? choices.filter(c => c.name.toLowerCase().includes(focused) || c.value.toLowerCase().includes(focused))
        : choices;

    await interaction.respond(filtered.slice(0, 25));
}

export default {
    data,
    execute,
    autocomplete,
};