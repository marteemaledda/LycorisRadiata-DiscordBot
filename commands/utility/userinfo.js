import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('information about a user.')
    .addUserOption(option =>
        option
        .setName('user')
        .setDescription('user to get information from.')
        .setRequired(true)
    )

async function execute(interaction){
    const member = interaction.options.getMember('user');

    if (!member) {
        return interaction.reply({
            content: "That user is not in this server.",
            flags: MessageFlags.Ephemeral
        });
    }
    
    // build embed 
    const embed = new EmbedBuilder()
        .setTitle(`${member.displayName} (${member.user.username})`)
        .setDescription(`Join Date: ${member.joinedAt.toLocaleString()} \nCreation Date: ${member.user.createdAt.toLocaleString()}`)
        .addFields(
        {
            name: "Roles",
            value: member
                ?  member.roles.cache.map(r => r.toString()).join(", ")
                : "No roles / not in server",
            inline: true
         },
        )
        .setThumbnail(`${member.user.displayAvatarURL()}`)
        .setColor("#bc4a4a")
        .setFooter({
         text: `ID: ${member.user.id}`,
        });
    await interaction.reply({ embeds: [embed] });
};

export default{
    data,
    execute
};