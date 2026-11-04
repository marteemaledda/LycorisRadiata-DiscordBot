import {Events, EmbedBuilder} from 'discord.js';
import { getDb } from '../helper/db.js'

export default{
    name : Events.GuildMemberAdd,

    async execute(member){
        // access settings collection for server 
        const db = getDb();
        const settingsCollection = db.collection('settings');
        const settings = await settingsCollection.findOne({
            guildId: member.guild.id
        });

        if (!settings || !settings.isEnabled) return;


        // get channel id
        const channel = member.guild.channels.cache.get(
            settings.welcomeChannelId
        );

        if (!channel || channel.type !== ChannelType.GuildText) return;

        // embed 
        const embed = new EmbedBuilder()
            .setTitle('Welcome!')
            .setDescription(`Welcome to ${member.guild.name}, ${member}!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();


        // send embed
        await channel.send({
            embeds: [embed]
        });
    }
};