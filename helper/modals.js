// function for modal creation for embed creator 
import {
    LabelBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

function isValidImageUrl(value) {
    try {
        const url = new URL(value.trim());
        return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
        return false;
    }
}

// Each field's settings are shared by modal construction and submission validation.
const modalConfigs = {
    title: {
        title: 'Edit Embed Title',
        label: 'Embed Title',
        style: TextInputStyle.Short,
        maxLength: 256,
    },

    description: {
        title: 'Edit Embed Description',
        label: 'Embed Description',
        style: TextInputStyle.Paragraph,
        maxLength: 4000,
    },

    color: {
        title: 'Edit Embed Sidebar Color',
        label: 'Embed Sidebar Color',
        style: TextInputStyle.Short,
        placeholder: 'Enter hex color code. Ex: #5865F2',
        maxLength: 7,
        validate: value => /^#[\da-f]{6}$/i.test(value),
    },

    footer: {
        title: 'Edit Embed Footer',
        label: 'Embed Footer',
        style: TextInputStyle.Short,
        maxLength: 2048,
    },

    thumbnail: {
        title: 'Edit Embed Thumbnail',
        label: 'Embed Thumbnail URL',
        style: TextInputStyle.Short,
        placeholder: 'https://img.staticdj.com/82d5158b47acb90b5c158a3eb20ee964_750x.jpeg',
        maxLength: 4000,
        validate: isValidImageUrl,
    },

    image: {
        title: 'Edit Embed Image',
        label: 'Embed Image URL',
        style: TextInputStyle.Short,
        placeholder: 'https://img.staticdj.com/82d5158b47acb90b5c158a3eb20ee964_750x.jpeg',
        maxLength: 4000,
        validate: isValidImageUrl,
    }
};


async function modalBuild(interaction, type, name){
        const config = modalConfigs[type];

        if (!config) return;

         const input = new TextInputBuilder()
             .setCustomId(type)
             .setStyle(config.style)
             .setRequired(false)
             .setMaxLength(config.maxLength);

         if (config.placeholder) {
             input.setPlaceholder(config.placeholder);
         }

         // Discord's Label component wraps the input and provides its visible label.
         const modal = new ModalBuilder()
             // The matching modal handler reads the field and embed name from this ID.
             .setCustomId(`embed_${type}_modal:${name}`)
             .setTitle(config.title)
             .addLabelComponents(new LabelBuilder({
                 label: config.label,
                 component: input,
             }));

         await interaction.showModal(modal);
}

export {
    modalBuild,
    modalConfigs,
}