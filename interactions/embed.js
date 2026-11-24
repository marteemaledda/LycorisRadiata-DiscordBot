import { MessageFlags } from 'discord.js';
import { getDb } from '../helper/db.js';
import { createPreview, normalizeEmbedData, validateEmbedData } from '../helper/embeds.js';
import { modalBuild, modalActions, parseModalCustomId } from '../helper/modals.js';

// Keep edits to the same embed in order so overlapping submissions don't overwrite each other's previews.
// This only coordinates interactions handled by this running bot process.
const embedLocks = new Map();

async function withEmbedLock(key, operation) {
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

function trimOrNull(value) {
    if (value == null) return null;
    const t = String(value).trim();
    return t === '' ? null : t;
}

function stripMongoId(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    const { _id, ...rest } = doc;
    return rest;
}

async function reportModalError(interaction, message = 'Could not update the embed. Please try again.') {
    const response = { content: message, flags: MessageFlags.Ephemeral };
    try {
        if (interaction.deferred) {
            await interaction.editReply(message);
        } else if (interaction.replied) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    } catch (error) {
        console.error('Failed to report the embed modal error to the user:', error);
    }
}

function decodeName(rawName) {
    try { return decodeURIComponent(rawName); } catch { return rawName; }
}

function collectModalValues(action, interaction) {
    const config = modalActions[action];
    const values = {};
    const errors = [];
    if (!config) return { values, errors: ['Unknown embed action.'] };

    for (const def of config.inputs) {
        let raw = '';
        try { raw = interaction.fields.getTextInputValue(def.id) ?? ''; } catch { raw = ''; }
        let value = raw;
        if (def.normalize) value = def.normalize(value);
        if (def.validate && !def.validate(value)) {
            errors.push(def.invalidMessage || `Invalid value for ${def.label}.`);
        }
        values[def.id] = value;
    }
    return { values, errors };
}

function applyActionToEmbed(previousEmbed, action, values) {
    const doc = normalizeEmbedData(previousEmbed);
    // Preserve DB/preview linkage and identity fields
    doc.guildId = previousEmbed.guildId;
    doc.name = previousEmbed.name;
    doc.previewChannelId = previousEmbed.previewChannelId;
    doc.previewMessageId = previousEmbed.previewMessageId;
    if (!Array.isArray(doc.fields)) doc.fields = Array.isArray(previousEmbed.fields) ? previousEmbed.fields : [];

    if (action === 'title') {
        const title = trimOrNull(values.title);
        const url = trimOrNull(values.url);
        if (url && !title) throw new Error('Set a title before adding a title URL (or clear the URL).');
        doc.title = title;
        doc.url = url;
    } else if (action === 'description') {
        doc.description = trimOrNull(values.description);
    } else if (action === 'author') {
        const name = trimOrNull(values.author_name);
        const url = trimOrNull(values.author_url);
        const iconURL = trimOrNull(values.author_icon);
        if (!name && !url && !iconURL) {
            doc.author = null;
        } else {
            if (!name) throw new Error('Author name is required if you set an author URL or icon (or clear all author fields).');
            doc.author = { name, url: url || null, iconURL: iconURL || null };
        }
    } else if (action === 'footer') {
        const text = trimOrNull(values.footer_text);
        const iconURL = trimOrNull(values.footer_icon);
        if (!text && !iconURL) {
            doc.footer = null;
        } else {
            if (!text) throw new Error('Footer text is required if you set a footer icon (or clear all footer fields).');
            doc.footer = { text, iconURL: iconURL || null };
        }
    } else if (action === 'color') {
        doc.color = trimOrNull(values.color);
    } else if (action === 'thumbnail') {
        const url = trimOrNull(values.thumbnail);
        doc.thumbnail = url ? { url } : null;
    } else if (action === 'image') {
        const url = trimOrNull(values.image);
        doc.image = url ? { url } : null;
    } else if (action === 'timestamp') {
        doc.timestamp = trimOrNull(values.timestamp);
    } else {
        throw new Error('Unknown embed action.');
    }

    return doc;
}

async function updateEmbed(interaction, action, name, values) {
    const guildId = interaction.guild?.id;
    if (!guildId) throw new Error('Embed modal submissions must be made in a server.');

    const query = { guildId, name };
    const collection = getDb().collection('embeds');

    return withEmbedLock(`${guildId}:${name}`, async () => {
        const previousEmbed = await collection.findOne(query);
        if (!previousEmbed) throw new Error(`Embed "${name}" was not found.`);

        const updatedEmbed = applyActionToEmbed(previousEmbed, action, values);
        const validation = validateEmbedData(updatedEmbed);
        if (!validation.ok) {
            throw new Error(`Could not update embed:\n- ${validation.errors.join('\n- ')}`);
        }

        const updateQuery = { ...query, _id: previousEmbed._id };
        const channel = await interaction.guild.channels.fetch(previousEmbed.previewChannelId);
        if (!channel) throw new Error(`Preview channel for embed "${name}" was not found.`);
        const message = await channel.messages.fetch(previousEmbed.previewMessageId);
        if (!message) throw new Error(`Preview message for embed "${name}" was not found.`);

        const previousRest = stripMongoId(previousEmbed);
        const updatedRest = stripMongoId(updatedEmbed);

        try {
            await message.edit({ embeds: [createPreview(updatedEmbed)] });
            const result = await collection.replaceOne(updateQuery, updatedRest);
            if (result.matchedCount !== 1) {
                throw new Error(`Embed "${name}" was removed while it was being updated.`);
            }
        } catch (error) {
            const rollbackErrors = [];
            try {
                await collection.replaceOne(updateQuery, previousRest);
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
                throw new AggregateError([error, ...rollbackErrors], `Embed "${name}" may be out of sync after the update failed.`);
            }
            throw error;
        }

        return updatedEmbed;
    });
}

export async function handleEmbedButton(interaction) {
    const [system, action, ...rest] = interaction.customId.split(':');
    if (system !== 'embed') return false;

    const rawName = rest.join(':');
    const name = decodeName(rawName);

    try {
        if (modalActions[action]) {
            await modalBuild(interaction, action, name);
            return true;
        }
    } catch (error) {
        console.error('Failed to open the embed editor modal:', error);
        await reportModalError(interaction);
        return true;
    }

    // Unknown embed button action (may be added in later steps)
    return false;
}

export async function handleEmbedModal(interaction) {
    const parsed = parseModalCustomId(interaction.customId);
    if (!parsed) {
        // Back-compat: legacy ids like embed_title_modal:<name> with single input id == field
        const legacy = interaction.customId.match(/^embed_(title|description|color|footer|thumbnail|image)_modal:(.+)$/);
        if (!legacy) return false;
        const [, action, rawName] = legacy;
        const name = rawName;
        if (!modalActions[action]) return false;
        const values = {};
        const def = modalActions[action].inputs[0];
        const inputId = def?.id || action;
        let raw = '';
        try { raw = interaction.fields.getTextInputValue(inputId); } catch { try { raw = interaction.fields.getTextInputValue(action); } catch { raw = ''; } }
        values[inputId] = def?.normalize ? def.normalize(raw) : raw;
        if (def?.validate && !def.validate(values[inputId])) {
            await interaction.reply({ content: def.invalidMessage || `The ${action} value is invalid.`, flags: MessageFlags.Ephemeral });
            return true;
        }
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateEmbed(interaction, action, name, values);
            const cleared = String(values[inputId] ?? '').trim() === '';
            await interaction.editReply(cleared ? `Cleared the ${action} for **${name}**.` : `Updated the ${action} for **${name}**.`);
        } catch (error) {
            console.error(`Failed to update ${action} for embed "${name}":`, error);
            await reportModalError(interaction, error?.message || 'Could not update the embed. Please try again.');
        }
        return true;
    }

    const { action, name } = parsed;
    const { values, errors } = collectModalValues(action, interaction);
    if (errors.length) {
        await interaction.reply({ content: errors.join('\n'), flags: MessageFlags.Ephemeral });
        return true;
    }

    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await updateEmbed(interaction, action, name, values);
        const labels = {
            title: 'title/URL',
            description: 'description',
            author: 'author',
            footer: 'footer',
            color: 'color',
            thumbnail: 'thumbnail',
            image: 'image',
            timestamp: 'timestamp',
        };
        await interaction.editReply(`Updated the ${labels[action] || action} for **${name}**.`);
    } catch (error) {
        console.error(`Failed to update ${action} for embed "${name}":`, error);
        await reportModalError(interaction, error?.message || 'Could not update the embed. Please try again.');
    }

    return true;
}
