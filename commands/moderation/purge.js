import { SlashCommandBuilder, Client, GatewayIntentBits } from "discord.js";

const data = new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Purges messages in a channel.')
    .addIntegerOption(option =>
        option
        .setName('amount')
        .setDescription('Number of messages to search through.')
        .setRequired(true)
    )
    .addUserOption(option =>
        option
        .setName('user')
        .setDescription('User to purge messages from.')
        .setRequired(false)
    );

async function execute(interaction){

    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user') 

    const id = user?.id // id or null

    const channel = interaction.channel;

    // fetch messages batch
    const messages = await channel.messages.fetch({
        limit: amount
    });

    // no user mentioned 
    if (!user) {
        const deleted = await channel.bulkDelete(messages, true);

        return interaction.reply({
            content: `Deleted ${deleted.size} messages.`,
            flags: MessageFlags.Ephemeral
        });
    } else {
        // filter for user 
        const filtered = messages.filter(
            msg => msg.author.id === user.id
        );

        // always be using await because its async
        await channel.bulkDelete(filtered, true);

        return interaction.reply({
            content: `Deleted ${filtered.size} messages from ${user.tag}.`,
            flags: MessageFlags.Ephemeral
        });

    }
}

export default({
    data,
    execute
});
  