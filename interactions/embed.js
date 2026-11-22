import { MessageFlags } from 'discord.js';
import { getDb } from '../helper/db.js';
import { createPreview } from '../helper/embeds.js';
import { modalBuild, modalConfigs } from '../helper/modals.js';

// Keep edits to the same embed in order so overlapping submissions don't overwrite each other's previews.
// This only coordinates interactions handled by this running bot process.
const embedLocks = new Map();

async function withEmbedLock(key, operation) {
	// Each queued edit waits for the previous edit's promise to be released.
	const previous = embedLocks.get(key) ?? Promise.resolve();
	let release;
	const current = new Promise(resolve => {
		release = resolve;
	});

	embedLocks.set(key, current);
	await previous;

	try {
		return await operation();
	} finally {
		release();
		if (embedLocks.get(key) === current) {
			embedLocks.delete(key);
		}
	}
}

async function restoreEmbedField(collection, query, previousEmbed, field) {
	// Restore the old value, or remove the field if it did not exist before the edit.
	let result;
	if (Object.prototype.hasOwnProperty.call(previousEmbed, field)) {
		result = await collection.updateOne(query, {
			$set: { [field]: previousEmbed[field] },
		});
	} else {
		result = await collection.updateOne(query, {
			$unset: { [field]: '' },
		});
	}

	if (result.matchedCount !== 1) {
		throw new Error('Could not restore the embed document after the failed update.');
	}
}

async function updateEmbedPreview(interaction, field, name, value) {
	// The embed is scoped to its server, so a matching name in another server is separate.
	const guildId = interaction.guild?.id;
	if (!guildId) {
		throw new Error('Embed modal submissions must be made in a server.');
	}

	const query = { guildId, name };
	const collection = getDb().collection('embeds');

	return withEmbedLock(`${guildId}:${name}`, async () => {
		// Keep a snapshot so both MongoDB and Discord can be restored if either update fails.
		const previousEmbed = await collection.findOne(query);
		if (!previousEmbed) {
			throw new Error(`Embed "${name}" was not found.`);
		}

		// Use the saved preview IDs to update the existing preview message.
		const updateQuery = { ...query, _id: previousEmbed._id };
		const channel = await interaction.guild.channels.fetch(previousEmbed.previewChannelId);
		if (!channel) {
			throw new Error(`Preview channel for embed "${name}" was not found.`);
		}

		const message = await channel.messages.fetch(previousEmbed.previewMessageId);
		if (!message) {
			throw new Error(`Preview message for embed "${name}" was not found.`);
		}

		const updatedEmbed = { ...previousEmbed, [field]: value };

		try {
			// Edit the preview, then save the same value to MongoDB.
			await message.edit({ embeds: [createPreview(updatedEmbed)] });

			const result = await collection.updateOne(updateQuery, {
				$set: { [field]: value },
			});
			if (result.matchedCount !== 1) {
				throw new Error(`Embed "${name}" was removed while it was being updated.`);
			}
		} catch (error) {
			// These are compensating updates, not a true cross-service transaction.
			const rollbackErrors = [];

			try {
				await restoreEmbedField(collection, updateQuery, previousEmbed, field);
			} catch (rollbackError) {
				rollbackErrors.push(rollbackError);
			}

			try {
				await message.edit({ embeds: [createPreview(previousEmbed)] });
			} catch (rollbackError) {
				rollbackErrors.push(rollbackError);
			}

			if (rollbackErrors.length > 0) {
				console.error(`Failed to restore embed "${name}" after an update error:`, rollbackErrors);
				throw new AggregateError(
					[error, ...rollbackErrors],
					`Embed "${name}" may be out of sync after the update failed.`,
				);
			}

			throw error;
		}
	});
}

async function reportModalError(interaction) {
	// An interaction can only receive its initial reply once; use the appropriate response method.
	const response = {
		content: 'Could not update the embed. Please try again.',
		flags: MessageFlags.Ephemeral,
	};

	try {
		if (interaction.deferred) {
			await interaction.editReply(response.content);
		} else if (interaction.replied) {
			await interaction.followUp(response);
		} else {
			await interaction.reply(response);
		}
	} catch (error) {
		console.error('Failed to report the embed modal error to the user:', error);
	}
}

export async function handleEmbedButton(interaction) {
	// Return false for buttons owned by other features so the dispatcher can continue routing.
	const [system, action, value] = interaction.customId.split(':');
	if (system !== 'embed') {
		return false;
	}

	try {
		await modalBuild(interaction, action, value);
	} catch (error) {
		console.error('Failed to open the embed editor modal:', error);
		await reportModalError(interaction);
	}

	return true;
}

export async function handleEmbedModal(interaction) {
	// Modal IDs identify both the edited field and the embed name.
	const match = interaction.customId.match(
		/^embed_(title|description|color|footer|thumbnail|image)_modal:(.+)$/,
	);
	if (!match) {
		return false;
	}

	const [, field, name] = match;
	const { maxLength, validate } = modalConfigs[field];

	try {
		const input = interaction.fields.getTextInputValue(field);
		// Blank input means clear; nonblank input must meet the field's length and format rules.
		if (
			input.trim() !== ''
			&& (input.length > maxLength || (validate && !validate(input)))
		) {
			await interaction.reply({
				content: `The ${field} value is invalid or too long.`,
				flags: MessageFlags.Ephemeral,
			});
			return true;
		}

		const value = input.trim() === ''
			? null
			: ['thumbnail', 'image'].includes(field) ? input.trim() : input;

		// Acknowledge before database and Discord API calls, which can take longer than Discord's response window.
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		await updateEmbedPreview(interaction, field, name, value);
		await interaction.editReply(
			value === null
				? `Cleared the ${field} for **${name}**.`
				: `Updated the ${field} for **${name}**.`,
		);
	} catch (error) {
		console.error(`Failed to update ${field} for embed "${name}":`, error);
		await reportModalError(interaction);
	}

	return true;
}
