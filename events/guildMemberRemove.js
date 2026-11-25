import { Events, EmbedBuilder} from 'discord.js';
import { getDb } from '../helper/db.js'

export default{
    name : Events.GuildMemberRemove,

    async execute(member){
        // load channel id data
        const db = getDb();
        const settingsCollection = db.collection('settings');
        const settings = settingsCollection.findOne({
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
            .setTitle('Goodbye!')
            .setDescription(`${member.user.tag} left ${member.guild.name}, goodbye!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();


        // send embed
        await channel.send({
            embeds: [embed]
        });

    }
};