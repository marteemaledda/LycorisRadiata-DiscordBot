import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import { getDb } from '../../helper/db.js';
import { createDefaultEmbedData, createPreview } from '../../helper/embeds.js';
import { deleteStoredEmbed } from '../../interactions/embed.js';

function buildEmbedEditorComponents(name) {
    const encodedName = encodeURIComponent(name);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed:title:${encodedName}`)
                .setLabel('Title & URL')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:description:${encodedName}`)
                .setLabel('Description')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:author:${encodedName}`)
                .setLabel('Author')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:footer:${encodedName}`)
                .setLabel('Footer')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:color:${encodedName}`)
                .setLabel('Color')
                .setStyle(ButtonStyle.Secondary),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed:thumbnail:${encodedName}`)
                .setLabel('Thumbnail')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:image:${encodedName}`)
                .setLabel('Image')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:timestamp:${encodedName}`)
                .setLabel('Timestamp')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`embed:fields:${encodedName}`)
                .setLabel('Fields')
                .setStyle(ButtonStyle.Secondary),
        );

    return [row, row2];
}

// data 
const data = new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Embed Builder')

    .addSubcommand(subcommand => 
        subcommand
        .setName('create')
        .setDescription('Creates an embed and sends a preview.')

        .addStringOption(option=>
            option
            .setName('name')
            .setDescription('Sets name of embed.')
            .setRequired(true)
        )
    )

    .addSubcommand(subcommand =>
        subcommand
        .setName('edit')
        .setDescription('Edits a saved embed and shows a preview.')

        .addStringOption(option=>
            option
            .setName('name')
            .setDescription('Name of the embed to edit.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )

    .addSubcommand(subcommand =>
        subcommand
        .setName('delete')
        .setDescription('Deletes a saved embed for this server.')

        .addStringOption(option=>
            option
            .setName('name')
            .setDescription('Name of the embed to delete (leave blank to pick from a list).')
            .setRequired(false)
            .setAutocomplete(true)
        )
    )

// function 
async function execute(interaction){
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild?.id;
    const name = interaction.options.getString('name');

    if (!guildId) {
        return interaction.reply({
            content: 'This command can only be used in a server.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const db = getDb();
    const embedsCollection = db.collection('embeds');

    if (subcommand === 'delete') {
        if (!name) {
            const embeds = await embedsCollection.find(
                { guildId },
                { projection: { name: 1 } }
            ).sort({ name: 1 }).limit(26).toArray();

            if (embeds.length === 0) {
                return interaction.reply({
                    content: 'No saved embeds found in this server.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (embeds.length > 25) {
                return interaction.reply({
                    content: 'This server has more than 25 saved embeds. Please use `/embed delete name:<name>` (with autocomplete) to choose one.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const menu = new StringSelectMenuBuilder()
                .setCustomId('embed:delete_select')
                .setPlaceholder('Select an embed to delete')
                .addOptions(embeds.map((e) => ({
                    label: String(e.name ?? '').slice(0, 100) || '(unnamed)',
                    value: String(e.name ?? '').slice(0, 100),
                })));

            return interaction.reply({
                content: 'Select an embed to delete from this server:',
                components: [new ActionRowBuilder().addComponents(menu)],
                flags: MessageFlags.Ephemeral,
            });
        }

        const result = await deleteStoredEmbed(interaction.guild, name);
        if (!result.found) {
            return interaction.reply({
                content: `Embed "${name}" was not found in this server.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            content: `Deleted embed **${name}** from this server.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    if (subcommand === 'edit') {
        const embedDoc = await embedsCollection.findOne({ guildId, name });
        if (!embedDoc) {
            return interaction.reply({
                content: `Embed "${name}" was not found in this server.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const preview = createPreview(embedDoc);
        const components = buildEmbedEditorComponents(name);

        const response = await interaction.reply({
            embeds: [preview],
            components,
            withResponse: true,
        });

        const message = response.resource.message;
        await embedsCollection.updateOne(
            { guildId, name },
            {
                $set: {
                    previewChannelId: interaction.channel.id,
                    previewMessageId: message.id,
                },
            }
        );

        return;
    }

    if (subcommand === 'create') {
        const embed = await embedsCollection.findOne({
            guildId: guildId,
            name: name
        });

        if (embed){
            return await interaction.reply({
                content: `Embed has already been created.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const embedDoc = createDefaultEmbedData(guildId, name);
        await embedsCollection.insertOne(embedDoc);

        const preview = createPreview(embedDoc);
        const components = buildEmbedEditorComponents(name);

        const response = await interaction.reply({
            embeds: [preview],
            components,
            withResponse: true
        });

        const message = response.resource.message;

        await embedsCollection.updateOne(
            {
                guildId: guildId,
                name: name
            },
            {
                $set: {
                    previewChannelId: interaction.channel.id,
                    previewMessageId: message.id
                }
            }
        );
    }

}

async function autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand !== 'delete' && subcommand !== 'edit') {
        return interaction.respond([]);
    }

    const guildId = interaction.guild?.id;
    if (!guildId) {
        return interaction.respond([]);
    }

    const focused = String(interaction.options.getFocused() ?? '').toLowerCase();
    const db = getDb();
    const embedsCollection = db.collection('embeds');

    const query = { guildId };
    if (focused) {
        query.name = { $regex: focused.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const embeds = await embedsCollection.find(query, { projection: { name: 1 } })
        .sort({ name: 1 })
        .limit(25)
        .toArray();

    await interaction.respond(
        embeds
            .filter((e) => e?.name)
            .map((e) => ({ name: String(e.name).slice(0, 100), value: String(e.name).slice(0, 100) }))
    );
}

export default{
    data,
    execute,
    autocomplete,
};