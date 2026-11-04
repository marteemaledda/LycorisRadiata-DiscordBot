// UPDATE THIS SO IT USES DATA BASE AND CHECKS IN EVERY NOW AND THEN

import { SlashCommandBuilder} from "discord.js";
import ms from "ms";

const data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder.')
    .addStringOption(option => 
        option
        .setName('time')
        .setDescription('Time until reminder. Eg: 30m, 2h, 1d.')
        .setRequired(true)
    )
    .addStringOption(option => 
        option
        .setName('content')
        .setDescription('the content of your reminder.')
        .setRequired(true)
    );

async function execute(interaction){

    const timeStr = interaction.options.getString('time');
    const timeMs = ms(timeStr);

    const reminderContent = interaction.options.getString('content');

    // check format of time
    if (!timeMs){
        return await interaction.reply({
            content: `Invalid time format. Try again.`,
            flags: MessageFlags.Ephemeral
        })
    } 

    await interaction.reply({
        content: `Reminder set! Will remind you in: ${timeStr}.`
    })

    setTimeout(async () => {
        await interaction.followUp({
            content: `${interaction.user}, reminder: ${reminderContent}`
        });
    }, timeMs);

}

export default({
    data,
    execute
});