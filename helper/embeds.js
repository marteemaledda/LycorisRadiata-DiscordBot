import { EmbedBuilder } from "discord.js";


// function to update embed with new data
function createPreview(data) {
    const embed = new EmbedBuilder()
    if (data.title) {embed.setTitle(data.title);}
    if (data.description) {embed.setDescription(data.description);}
    if (data.description) embed.setDescription(data.description);
    if (data.color) embed.setColor(data.color);
    if (data.footer) embed.setFooter({ text: data.footer });
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.image) embed.setImage(data.image);

    return embed
}

export {
    createPreview
};