import { SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
    .setName('diceroll')
    .setDescription('Rolls a 6 sided die')

async function execute(interaction){
    //get random int 1-6
    const result = Math.floor(Math.random() *6 + 1);

    await interaction.reply({
        content: `You rolled a ${result}!`
    });

}

export default{
    data,
    execute    
};