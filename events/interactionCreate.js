import {
    Events,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
	ActionRow
} from 'discord.js';
import { getDb } from '../helper/db.js'
import { createPreview } from '../helper/embeds.js'
import { modalBuild } from '../helper/modals.js'

export default {
	name: Events.InteractionCreate,

	async execute(interaction) {

		// HANDLES BUTTONS
		if (interaction.isButton()) {

			// identifies what button is for 
    		const [system, action, value] = interaction.customId.split(':');

			// Creates modals for embed creation buttons 
			if (system === 'embed') {
    			await modalBuild(interaction, action, value);

    			return;
			}

		}
			

		// HANDLES MODAL SUBMITTION 
		if (interaction.isModalSubmit()) {
    		if (interaction.customId.startsWith('embed_title_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const title = interaction.fields.getTextInputValue('title');

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates title to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { title: title }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with title: **${title}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}

			// handle description modal submittion
			if (interaction.customId.startsWith('embed_description_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const description = interaction.fields.getTextInputValue('description');

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates description to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { description: description }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with description: **${description}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}

			// color modal submittion 
			if (interaction.customId.startsWith('embed_color_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const color = interaction.fields.getTextInputValue('color');
				if (!/^#([A-Fa-f0-9]{6})$/.test(color)) {
    				return await interaction.reply({
        				content: 'Please enter a valid hex color, such as `#5865F2`.',
        				flags: MessageFlags.Ephemeral
    				});
				}

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates description to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { color: color }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with color: **${color}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}

			// footer 
			if (interaction.customId.startsWith('embed_footer_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const footer = interaction.fields.getTextInputValue('footer');

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates title to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { footer: footer }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with footer: **${footer}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}

			// thumnail
    		if (interaction.customId.startsWith('embed_thumbnail_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const thumbnail = interaction.fields.getTextInputValue('thumbnail');

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates title to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { thumbnail: thumbnail }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with thumbnail: **${thumbnail}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}

			//image 
    		if (interaction.customId.startsWith('embed_image_modal:')) {
        		const name = interaction.customId.split(':')[1];

        		const image = interaction.fields.getTextInputValue('image');

        		const db = getDb();
				const embedsCollection = db.collection('embeds');

				// updates title to database
				await embedsCollection.updateOne({
        		guildId: interaction.guild.id,
        		name: name
				},
    			{
        			$set: { image: image }
   			 	}
				);


				const updatedEmbed = await embedsCollection.findOne({
    				guildId: interaction.guild.id,
    				name: name
				});

				// updates preview of embed
				const preview = createPreview(updatedEmbed);

				// finds channel preview is in
				const channel = await interaction.guild.channels.fetch(
    				updatedEmbed.previewChannelId
				);

				// gets message in given channel
				const message = await channel.messages.fetch(
 					updatedEmbed.previewMessageId
				);

				// updates message with new data/embed
				await message.edit({
    				embeds: [preview]
				});

        		await interaction.reply({
            		content: `Updating **${name}** with image: **${image}**`,
            		flags: MessageFlags.Ephemeral
        		});
   			}
    		return;
		}


		// HANDLES SLASH COMMAND
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};