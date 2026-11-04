import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

// data
// command use: /ban (member) [reason]
const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans member from the server.')
    .addUserOption(option =>
        option 
            .setName('target')
            .setDescription('User to ban.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('reason')
            .setDescription('Reason for the ban.')
            .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

// function 
async function execute(interaction){

    const member = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
            
    // check if client has permission to ban
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembersMembers)) {
	    return interaction.reply({
	    	    content: 'You do not have permission to ban members.',
		        flags: MessageFlags.Ephemeral,
	        });
        }

    // check if member is part of guild
    if(!member){
        return interaction.reply({
            content: 'Member is not a part of the server.',
            flags: MessageFlags.Ephemeral,
        });
    }

    // check if bot can ban member
    if(!member.bannable){
        return interaction.reply({
            content: 'I do not have permission to ban that member.',
            flags: MessageFlags.Ephemeral,
        });
    }

    // ban member
    await member.ban({
       reason: reason
    });

    // announce ban
    await interaction.reply({
            content: `${member.user.tag} was banned.\nReason: ${reason}`,
    });
}  
// export for handling 
export default {
	data,
	execute,
};