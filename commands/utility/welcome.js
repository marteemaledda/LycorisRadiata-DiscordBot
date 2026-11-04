import { SlashCommandBuilder, ChannelType } from "discord.js";
import { getDb } from '../../helper/db.js'

const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('configure welcome embed.')

    .addSubcommand(subcommand =>
        subcommand 
        .setName('enable')
        .setDescription('enables welcome embed.')
        .addChannelOption( option =>
            option
            .setName('channel')
            .setDescription('channel to generate welcome embeds.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )

    .addSubcommand(subcommand =>
        subcommand
        .setName('disable')
        .setDescription('disables welcome embed.')
    );

async function execute(interaction){
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const db = getDb();
    const settingsCollection = db.collection('settings');
    
    // enabled
    if (subcommand === 'enable'){
        const channel = interaction.options.getChannel('channel');
        
        await settingsCollection.updateOne(
            {guildId: guildId },
            {
                $set: {
                    welcomeChannelId: channel.id,
                    isEnabled: true
                }
            },
            { upsert: true}
        );


        await interaction.reply({
            content: `Welcome Message enabled in ${channel}.`,
            flags: MessageFlags.Ephemeral
        });
    }

    // disabled 
    if (subcommand === 'disable'){

        await settingsCollection.updateOne(
            { guildId: guildId},
            { $set: { isEnabled: false } }
        );

        await interaction.reply({
            content: `Welcome Message disabled.`,
            flags: MessageFlags.Ephemeral
        });       
    }

}

export default{
    data,
    execute
};