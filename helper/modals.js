// function for modal creation for embed creator 
import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from 'discord.js';

const modalConfigs = {
    title: {
        title: 'Edit Embed Title',
        label: 'Embed Title',
        style: TextInputStyle.Short
    },

    description: {
        title: 'Edit Embed Description',
        label: 'Embed Description',
        style: TextInputStyle.Paragraph
    },

    color: {
        title: 'Edit Embed Sidebar Color',
        label: 'Embed Sidebar Color',
        style: TextInputStyle.Short,
        placeholder: 'Enter hex color code. Ex: #5865F2'
    },

    footer: {
        title: 'Edit Embed Footer',
        label: 'Embed Footer',
        style: TextInputStyle.Short
    },

    thumbnail: {
        title: 'Edit Embed Thumbnail',
        label: 'Embed Thumbnail URL',
        style: TextInputStyle.Short,
        placeholder : 'https://img.staticdj.com/82d5158b47acb90b5c158a3eb20ee964_750x.jpeg'
    },

    image: {
        title: 'Edit Embed Image',
        label: 'Embed Image URL',
        style: TextInputStyle.Short,
        placeholder: 'https://img.staticdj.com/82d5158b47acb90b5c158a3eb20ee964_750x.jpeg'
    }
};


async function modalBuild(interaction, type, name){
        const config = modalConfigs[type];

        if (!config) return;

         // modal creation
        const modal = new ModalBuilder()
             .setCustomId(`embed_${type}_modal:${name}`)
             .setTitle(config.title);
    
        // edit title text 
        const input = new TextInputBuilder()
             .setCustomId(type)
             .setLabel(config.label)
             .setStyle(config.style)
             .setRequired(false);

             if (config.placeholder) {
                 input.setPlaceholder(config.placeholder);
             }
    
        // input for new title 
        const row = new ActionRowBuilder()
            .addComponents(input);

        modal.addComponents(row);

        await interaction.showModal(modal);

    return;
}

// to do next - helper files for modal submittion 


export {
    modalBuild
}