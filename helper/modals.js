// function for modal creation for embed creator 
import {
    FileUploadBuilder,
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
            { id: 'author_icon_file', label: 'Author Icon File (optional)', kind: 'file', required: false },
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
            { id: 'footer_icon_file', label: 'Footer Icon File (optional)', kind: 'file', required: false },
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
        title: 'Edit Thumbnail',
        customId: (name) => `embed_modal:thumbnail:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'thumbnail',
                label: 'Thumbnail URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/thumb.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Thumbnail URL must be a valid http(s) URL.',
            },
            { id: 'thumbnail_file', label: 'Thumbnail File (optional)', kind: 'file', required: false },
        ],
    },
    image: {
        title: 'Edit Image',
        customId: (name) => `embed_modal:image:${encodeURIComponent(name)}`,
        inputs: [
            {
                id: 'image',
                label: 'Main Image URL (optional)',
                style: TextInputStyle.Short,
                required: false,
                maxLength: 2048,
                placeholder: 'https://example.com/image.png',
                validate: (v) => v.trim() === '' || isValidHttpUrl(v),
                invalidMessage: 'Image URL must be a valid http(s) URL.',
            },
            { id: 'image_file', label: 'Main Image File (optional)', kind: 'file', required: false },
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
    field_add: {
        title: 'Add Field',
        customId: (name) => `embed_modal:field_add:${encodeURIComponent(name)}`,
        inputs: [
            { id: 'field_name', label: 'Field Name', style: TextInputStyle.Short, required: true, maxLength: LIMITS.fieldName },
            { id: 'field_value', label: 'Field Value', style: TextInputStyle.Paragraph, required: true, maxLength: LIMITS.fieldValue },
            { id: 'field_inline', label: 'Inline? (yes/no)', style: TextInputStyle.Short, required: false, maxLength: 5, placeholder: 'no' },
        ],
    },
    field_edit: {
        title: 'Edit Field',
        customId: (name, suffix = '') => `embed_modal:field_edit:${encodeURIComponent(name)}${suffix}`,
        inputs: [
            { id: 'field_name', label: 'Field Name', style: TextInputStyle.Short, required: true, maxLength: LIMITS.fieldName },
            { id: 'field_value', label: 'Field Value', style: TextInputStyle.Paragraph, required: true, maxLength: LIMITS.fieldValue },
            { id: 'field_inline', label: 'Inline? (yes/no)', style: TextInputStyle.Short, required: false, maxLength: 5, placeholder: 'no' },
        ],
    },
};

// Back-compat export for existing consumers.
const modalConfigs = modalActions;

function parseModalCustomId(customId) {
    const match = customId.match(/^embed_modal:(title|description|author|footer|color|thumbnail|image|timestamp|field_add|field_edit):(.+)$/);
    if (!match) return null;
    const [, action, rawRest] = match;
    let name = rawRest;
    let index = null;

    if (action === 'field_edit') {
        // Format: embed_modal:field_edit:<encodedName>:<index>
        const lastColon = rawRest.lastIndexOf(':');
        if (lastColon !== -1) {
            const maybeIndex = rawRest.slice(lastColon + 1);
            if (/^\d+$/.test(maybeIndex)) {
                index = parseInt(maybeIndex, 10);
                name = rawRest.slice(0, lastColon);
            }
        }
    }

    try { name = decodeURIComponent(name); } catch { /* keep raw */ }
    return { action, name, index };
}

async function modalBuild(interaction, type, name, { initialValues = {}, customIdSuffix = '' } = {}) {
    const config = modalActions[type];
    if (!config) return;

    const customId = config.customId
        ? config.customId(name, customIdSuffix)
        : `embed_modal:${type}:${encodeURIComponent(name)}${customIdSuffix}`;
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(config.title);

    for (const def of config.inputs) {
        if (def.kind === 'file') {
            const fileInput = new FileUploadBuilder()
                .setCustomId(def.id)
                .setRequired(Boolean(def.required))
                .setMinValues(def.required ? 1 : 0)
                .setMaxValues(1);

            modal.addLabelComponents(new LabelBuilder({ label: def.label, component: fileInput }));
            continue;
        }

        const input = new TextInputBuilder()
            .setCustomId(def.id)
            .setStyle(def.style)
            .setRequired(Boolean(def.required));

        if (def.maxLength) input.setMaxLength(def.maxLength);
        if (def.placeholder) input.setPlaceholder(def.placeholder);

        const initial = Object.prototype.hasOwnProperty.call(initialValues, def.id)
            ? initialValues[def.id]
            : def.value;
        if (initial !== undefined && initial !== null && String(initial) !== '') {
            input.setValue(String(initial));
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