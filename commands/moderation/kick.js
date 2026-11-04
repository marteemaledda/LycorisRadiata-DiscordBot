import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

// data 
// command use: /kick (user) [reason]
const data = new SlashCommandBuilder()
	.setName('kick')
	.setDescription('Kicks member from server.')
    .addUserOption(option =>
		option
			.setName('target')
			.setDescription('The member to kick')
			.setRequired(true)
	)
	.addStringOption(option =>
		option
			.setName('reason')
			.setDescription('Reason for the kick')
			.setRequired(false)
	)
    // ADD OPTION TO DM THE USER REASON
     // check if client has perms to kick
	.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);


// function 
async function execute(interaction) {

    const member = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
	
    // second check to make sure client has permission to kick
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
	    return interaction.reply({
	    	content: 'You do not have permission to kick members.',
		    flags: MessageFlags.Ephemeral,
	    });
    }

    // check if member exists
	if (!member) {
		return interaction.reply({
			content: 'Member could not be found.',
			flags: MessageFlags.Ephemeral,
		});
	}

    // check if bot can kick 
	if (!member.kickable) {
		return interaction.reply({
			content: 'Cannot kick that member.',
			flags: MessageFlags.Ephemeral,
		});
	}

    // kick member
    await member.kick(reason);

    // announce kick
    await interaction.reply({
		content: `${member.user.tag} was kicked.\nReason: ${reason}`,
	});

}

// export for handling 
export default {
	data,
	execute,
};