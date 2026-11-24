import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { getDb } from '../../helper/db.js';
import { createDefaultEmbedData, createPreview } from '../../helper/embeds.js';

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

// function 
async function execute(interaction){
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const name = interaction.options.getString('name');

    const db = getDb();
    const embedsCollection = db.collection('embeds');



    // create an embed 
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
    
    // row for buttons 
    const row = new ActionRowBuilder() // max 5 buttons per row
    .addComponents(
        // BUTTON CREATION
        new ButtonBuilder()
            .setCustomId(`embed:title:${name}`)
            .setLabel('Title')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`embed:description:${name}`)
            .setLabel('Description')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed:color:${name}`)
            .setLabel('Color')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed:footer:${name}`)
            .setLabel('Footer')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`embed:thumbnail:${name}`)
            .setLabel('Thumbnail')
            .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder()
    .addComponents(
         new ButtonBuilder()
            .setCustomId(`embed:image:${name}`)
            .setLabel('Image')
            .setStyle(ButtonStyle.Secondary)
    );

    // builds base embed 
    const preview = createPreview(embedDoc);

    // build embed msg 
    const response = await interaction.reply({
        embeds: [preview],
        components: [row, row2],
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

export default{
    data,
    execute
};