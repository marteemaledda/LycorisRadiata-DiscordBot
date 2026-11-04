import { SlashCommandBuilder, EmbedBuilder, ChannelType } from "discord.js";

const data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('information about the server.');

async function execute(interaction){
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const textCount = guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText
    ).size;

    const voiceCount = guild.channels.cache.filter(
        c => c.type === ChannelType.GuildVoice
    ).size;



    const embed = new EmbedBuilder()
        .setTitle(`${guild.name}`)
        .setDescription(`Created on ${guild.createdAt.toLocaleString()}`)  
        .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
        .addFields(
            { name: `Owner`, value: `${owner.user.tag}`, inline: true },
            { name: `Members`, value: `${guild.memberCount}`, inline: true },
            { name: `Channels`, value: `${textCount} text, ${voiceCount} voice`, inline: false },
        )
        .setFooter({
            text: `ID: ${guild.id}`
        })

    await interaction.reply({ embeds: [embed] })
}

export default{
    data,
    execute
};