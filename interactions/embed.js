import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import { getDb } from '../helper/db.js';
import { createPreview, normalizeEmbedData, validateEmbedData, LIMITS } from '../helper/embeds.js';
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

function parseInline(value) {
    const v = String(value ?? '').trim().toLowerCase();
    return v === 'yes' || v === 'y' || v === 'true' || v === '1' || v === 'inline';
}

function formatFieldValue(value) {
    const s = String(value ?? '');
    return s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

function truncate(value, max) {
    const s = String(value ?? '');
    return s.length > max ? `${s.slice(0, max - 3)}...` : s;
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
    } else if (action === 'field_add') {
        if (doc.fields.length >= LIMITS.fields) {
            throw new Error(`Cannot add more than ${LIMITS.fields} fields.`);
        }
        const name = String(values.field_name ?? '').trim();
        const value = String(values.field_value ?? '').trim();
        if (!name || !value) throw new Error('Field name and value are required.');
        doc.fields.push({ name, value, inline: parseInline(values.field_inline) });
    } else if (action === 'field_edit') {
        const idx = parseInt(String(values.field_index ?? '').trim(), 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= doc.fields.length) {
            throw new Error(`Select a valid field to edit.`);
        }
        const name = String(values.field_name ?? '').trim();
        const value = String(values.field_value ?? '').trim();
        if (!name || !value) throw new Error('Field name and value are required.');
        doc.fields[idx] = { name, value, inline: parseInline(values.field_inline) };
    } else if (action === 'field_remove') {
        const idx = parseInt(String(values.field_index ?? '').trim(), 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= doc.fields.length) {
            throw new Error(`Select a valid field to remove.`);
        }
        doc.fields.splice(idx, 1);
    } else if (action === 'field_clear') {
        doc.fields = [];
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

async function getEmbedDoc(guildId, name) {
    return getDb().collection('embeds').findOne({ guildId, name });
}

function buildFieldSelectMenu(name, action, fields) {
    const encodedName = encodeURIComponent(name);
    const placeholder = action === 'field_edit_select' ? 'Select a field to edit' : 'Select a field to remove';
    const options = fields.slice(0, LIMITS.fields).map((field, i) => ({
        label: truncate(`${i + 1}. ${String(field.name ?? '').trim() || '(unnamed)'}`, 100),
        description: truncate(`${field.inline ? 'Inline' : 'Not inline'} — ${String(field.value ?? '').trim() || '(empty)'}`, 100),
        value: String(i),
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`embed:${action}:${encodedName}`)
            .setPlaceholder(placeholder)
            .addOptions(options)
    );
}

async function showFieldsMenu(interaction, name) {
    const encodedName = encodeURIComponent(name);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`embed:field_add:${encodedName}`).setLabel('Add Field').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`embed:field_edit:${encodedName}`).setLabel('Edit Field').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`embed:field_remove:${encodedName}`).setLabel('Remove Field').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`embed:field_list:${encodedName}`).setLabel('List Fields').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed:field_clear:${encodedName}`).setLabel('Clear All').setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({
        content: `Manage fields for **${name}** (max ${LIMITS.fields}). Edit/Remove use a dropdown of existing fields.`,
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}

export async function handleEmbedButton(interaction) {
    const [system, action, ...rest] = interaction.customId.split(':');
    if (system !== 'embed') return false;

    const rawName = rest.join(':');
    const name = decodeName(rawName);

    try {
        if (action === 'fields') {
            await showFieldsMenu(interaction, name);
            return true;
        }

        if (action === 'field_list') {
            const guildId = interaction.guild?.id;
            if (!guildId) {
                await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
                return true;
            }
            const embedDoc = await getEmbedDoc(guildId, name);
            if (!embedDoc) {
                await interaction.reply({ content: `Embed "${name}" was not found.`, flags: MessageFlags.Ephemeral });
                return true;
            }
            const fields = Array.isArray(embedDoc.fields) ? embedDoc.fields : [];
            if (fields.length === 0) {
                await interaction.reply({ content: `**${name}** has no fields.`, flags: MessageFlags.Ephemeral });
            } else {
                const lines = fields.map((f, i) => `${i + 1}. **${String(f.name ?? '')}**${f.inline ? ' (inline)' : ''}: ${formatFieldValue(f.value)}`);
                await interaction.reply({ content: `Fields for **${name}**:\n${lines.join('\n')}`.slice(0, 1900), flags: MessageFlags.Ephemeral });
            }
            return true;
        }

        if (action === 'field_clear') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateEmbed(interaction, 'field_clear', name, {});
            await interaction.editReply(`Cleared all fields for **${name}**.`);
            return true;
        }

        if (action === 'field_edit' || action === 'field_remove') {
            const guildId = interaction.guild?.id;
            if (!guildId) {
                await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
                return true;
            }
            const embedDoc = await getEmbedDoc(guildId, name);
            if (!embedDoc) {
                await interaction.reply({ content: `Embed "${name}" was not found.`, flags: MessageFlags.Ephemeral });
                return true;
            }
            const fields = Array.isArray(embedDoc.fields) ? embedDoc.fields : [];
            if (fields.length === 0) {
                await interaction.reply({ content: `**${name}** has no fields to ${action === 'field_edit' ? 'edit' : 'remove'}.`, flags: MessageFlags.Ephemeral });
                return true;
            }
            const selectAction = action === 'field_edit' ? 'field_edit_select' : 'field_remove_select';
            await interaction.reply({
                content: `Select a field to ${action === 'field_edit' ? 'edit' : 'remove'} for **${name}**:`,
                components: [buildFieldSelectMenu(name, selectAction, fields)],
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (modalActions[action]) {
            await modalBuild(interaction, action, name);
            return true;
        }
    } catch (error) {
        console.error('Failed to handle embed button:', error);
        await reportModalError(interaction, error?.message || 'Could not handle that embed action.');
        return true;
    }

    // Unknown embed button action (may be added in later steps)
    return false;
}

export async function handleEmbedSelectMenu(interaction) {
    const [system, action, ...rest] = interaction.customId.split(':');
    if (system !== 'embed') return false;

    const rawName = rest.join(':');
    const name = decodeName(rawName);
    const selectedIndex = parseInt(interaction.values?.[0] ?? '', 10);

    if (!Number.isInteger(selectedIndex) || selectedIndex < 0) return false;

    try {
        if (action === 'field_remove_select') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateEmbed(interaction, 'field_remove', name, { field_index: String(selectedIndex) });
            await interaction.editReply(`Removed field #${selectedIndex + 1} from **${name}**.`);
            return true;
        }

        if (action === 'field_edit_select') {
            const guildId = interaction.guild?.id;
            if (!guildId) {
                await interaction.reply({ content: 'This can only be used in a server.', flags: MessageFlags.Ephemeral });
                return true;
            }
            const embedDoc = await getEmbedDoc(guildId, name);
            if (!embedDoc) {
                await interaction.reply({ content: `Embed "${name}" was not found.`, flags: MessageFlags.Ephemeral });
                return true;
            }
            const fields = Array.isArray(embedDoc.fields) ? embedDoc.fields : [];
            const field = fields[selectedIndex];
            if (!field) {
                await interaction.reply({ content: `That field no longer exists in **${name}**.`, flags: MessageFlags.Ephemeral });
                return true;
            }

            await modalBuild(interaction, 'field_edit', name, {
                customIdSuffix: `:${selectedIndex}`,
                initialValues: {
                    field_name: String(field.name ?? ''),
                    field_value: String(field.value ?? ''),
                    field_inline: field.inline ? 'yes' : 'no',
                },
            });
            return true;
        }
    } catch (error) {
        console.error('Failed to handle embed select menu:', error);
        await reportModalError(interaction, error?.message || 'Could not handle that embed action.');
        return true;
    }

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

    const { action, name, index } = parsed;
    const { values, errors } = collectModalValues(action, interaction);
    if (action === 'field_edit' && index !== null && index !== undefined) {
        values.field_index = String(index);
    }
    if (action === 'field_edit' && (index === null || index === undefined)) {
        errors.push('Could not determine which field to edit. Please select a field again.');
    }
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
            field_add: 'fields (added)',
            field_edit: 'field (edited)',
        };
        await interaction.editReply(`Updated the ${labels[action] || action} for **${name}**.`);
    } catch (error) {
        console.error(`Failed to update ${action} for embed "${name}":`, error);
        await reportModalError(interaction, error?.message || 'Could not update the embed. Please try again.');
    }

    return true;
}
