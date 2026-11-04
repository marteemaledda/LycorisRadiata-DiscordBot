import { SlashCommandBuilder } from 'discord.js';

// data
const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong and latency!');

// function
async function execute(interaction) {
	const sent = await interaction.reply({
		content: 'Pinging...',
		fetchReply: true,
	});

	const latency = sent.createdTimestamp - interaction.createdTimestamp;
	const apiPing = Math.round(interaction.client.ws.ping);

	await interaction.editReply(
		`Pong! Latency is ${latency}ms. API Latency is ${apiPing}ms.`,
	);
}

// export for handling 
export default {
	data,
	execute,
};