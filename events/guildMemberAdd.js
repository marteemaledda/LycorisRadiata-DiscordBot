import { Events, EmbedBuilder, ChannelType } from 'discord.js';
import { getDb } from '../helper/db.js';
import { createPreview, renderWelcomeEmbedData } from '../helper/embeds.js';

export default {
    name: Events.GuildMemberAdd,

    async execute(member) {
        const db = getDb();
        const settingsCollection = db.collection('settings');
        const settings = await settingsCollection.findOne({
            guildId: member.guild.id,
        });

        if (!settings || !settings.isEnabled || !settings.welcomeChannelId) return;

        let channel = member.guild.channels.cache.get(settings.welcomeChannelId);
        if (!channel) {
            try {
                channel = await member.guild.channels.fetch(settings.welcomeChannelId);
            } catch {
                channel = null;
            }
        }

        if (!channel || channel.type !== ChannelType.GuildText) return;

        let embed;

        if (settings.welcomeEmbedName) {
            const embedDoc = await db.collection('embeds').findOne({
                guildId: member.guild.id,
                name: settings.welcomeEmbedName,
            });

            if (embedDoc) {
                embed = createPreview(renderWelcomeEmbedData(embedDoc, member));
            }
        }

        if (!embed) {
            embed = new EmbedBuilder()
                .setTitle('Welcome!')
                .setDescription(`Welcome to ${member.guild.name}, ${member}!`)
                .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                .setTimestamp();
        }

        try {
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Failed to send welcome message:', error);
        }
    },
};