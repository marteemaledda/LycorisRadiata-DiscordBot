import {
	Events,
	MessageFlags,
} from 'discord.js';
import { handleEmbedButton, handleEmbedModal } from '../interactions/embed.js';

export default {
	name: Events.InteractionCreate,

	async execute(interaction) {
		// Feature handlers return true when they own the interaction.
		if (interaction.isButton()) {
			if (await handleEmbedButton(interaction)) {
				return;
			}
		}

		// Route modal submissions by their custom ID; other feature modals can add handlers here.
		if (interaction.isModalSubmit()) {
			if (await handleEmbedModal(interaction)) {
				return;
			}
		}

		if (!interaction.isChatInputCommand()) {
			return;
		}

		// Slash commands are looked up separately from feature-specific buttons and modals.
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			const response = {
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			};

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(response);
			} else {
				await interaction.reply(response);
			}
		}
	},
};
