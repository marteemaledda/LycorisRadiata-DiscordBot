// function for modal creation for embed creator 
import {
    LabelBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { LIMITS } from './embeds.js';

function isValidHttpUrl(value) {
    try {
        const url = new URL(value.trim());
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
    } catch {
        return false;
    }
}

function normalizeColor(value) {
    const v = value.trim();
    if (/^#[\da-fA-F]{6}$/.test(v)) return v.toUpperCase();
    if (/^[\da-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
    return v;
}

// Action configs shared by modal construction and submission validation.
// Some actions use multiple inputs (e.g. title+url, author, footer).
const modalActions = {
    title: {
        title: 'Edit Title & URL',
        customId: (name) => `embed_modal:title:${encodeURIComponent(name)}`,
        inputs: [
            { id: 'title', label: 'Title', style: TextInputStyle.Short, required: false, maxLength: LIMITS.title },
            {
                id: 'url',
                label: 'Title URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Title URL must be a valid http(s) URL.',
            },
        ],
    },
    description: {
        title: 'Edit Description',
        customId: (name) => `embed_modal:description:${encodeURIComponent(name)}`,
        inputs: [
            // Discord modal text inputs allow up to 4000 characters (embed descriptions allow up to 4096).
            { id: 'description', label: 'Description', style: TextInputStyle.Paragraph, required: false, maxLength: 4000 },
        ],
    },
    author: {
        title: 'Edit Author',
        customId: (name) => `embed_modal:author:${encodeURIComponent(name)}`,
        inputs: [
            { id: 'author_name', label: 'Author Name', style: TextInputStyle.Short, required: false, maxLength: LIMITS.authorName },
            {
                id: 'author_url',
                label: 'Author URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Author URL must be a valid http(s) URL.',
            },
            {
                id: 'author_icon',
                label: 'Author Icon URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/icon.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Author icon URL must be a valid http(s) URL.',
            },
        ],
    },
    footer: {
        title: 'Edit Footer',
        customId: (name) => `embed_modal:footer:${encodeURIComponent(name)}`,
        inputs: [
            { id: 'footer_text', label: 'Footer Text', style: TextInputStyle.Short, required: false, maxLength: LIMITS.footerText },
            {
                id: 'footer_icon',
                label: 'Footer Icon URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/icon.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Footer icon URL must be a valid http(s) URL.',
            },
        ],
    },
    color: {
        title: 'Edit Color',
        customId: (name) => `embed_modal:color:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'color',
                label: 'Embed Color',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 7,
                placeholder: '#5865F2',
                normalize: normalizeColor,
                validate: (v) => v.trim() === '' || /^#[\da-fA-F]{6}$/.test(normalizeColor(v)),
                invalidMessage: 'Color must be a hex code like #5865F2 (or blank to clear).',
            },
        ],
    },
    thumbnail: {
        title: 'Edit Thumbnail URL',
        customId: (name) => `embed_modal:thumbnail:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'thumbnail',
                label: 'Thumbnail URL',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/thumb.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Thumbnail URL must be a valid http(s) URL.',
            },
        ],
    },
    image: {
        title: 'Edit Image URL',
        customId: (name) => `embed_modal:image:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'image',
                label: 'Main Image URL',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/image.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Image URL must be a valid http(s) URL.',
            },
        ],
    },
    timestamp: {
        title: 'Edit Timestamp',
        customId: (name) => `embed_modal:timestamp:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'timestamp',
                label: 'Timestamp',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 40,
                placeholder: 'now, or 2026-11-23T22:00:00Z (blank clears)',
                validate: (v) => {
                    const t = v.trim();
                    if (t === '' || t.toLowerCase() === 'now') return true;
                    return !Number.isNaN(new Date(t).getTime());
                },
                invalidMessage: 'Timestamp must be "now", a valid date/time, or blank to clear.',
                normalize: (v) => {
                    const t = v.trim();
                    if (t === '') return '';
                    if (t.toLowerCase() === 'now') return new Date().toISOString();
                    return new Date(t).toISOString();
                },
            },
        ],
    },
};

// Back-compat export for existing consumers.
const modalConfigs = modalActions;

function parseModalCustomId(customId) {
    const match = customId.match(/^embed_modal:(title|description|author|footer|color|thumbnail|image|timestamp):(.+)$/);
    if (!match) return null;
    const [, action, rawName] = match;
    let name = rawName;
    try { name = decodeURIComponent(rawName); } catch { /* keep raw */ }
    return { action, name };
}

async function modalBuild(interaction, type, name) {
    const config = modalActions[type];
    if (!config) return;

    const modal = new ModalBuilder()
        .setCustomId(config.customId ? config.customId(name) : `embed_modal:${type}:${encodeURIComponent(name)}`)
        .setTitle(config.title);

    for (const def of config.inputs) {
        const input = new TextInputBuilder()
            .setCustomId(def.id)
            .setStyle(def.style)
            .setRequired(Boolean(def.required));

        if (def.maxLength) input.setMaxLength(def.maxLength);
        if (def.placeholder) input.setPlaceholder(def.placeholder);
        if (def.value !== undefined && def.value !== null && String(def.value) !== '') {
            input.setValue(String(def.value));
        }

        modal.addLabelComponents(new LabelBuilder({ label: def.label, component: input }));
    }

    await interaction.showModal(modal);
}

export {
    modalBuild,
    modalConfigs,
    modalActions,
    parseModalCustomId,
    isValidHttpUrl,
}