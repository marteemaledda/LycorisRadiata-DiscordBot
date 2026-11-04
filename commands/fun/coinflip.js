import { SlashCommandBuilder } from "discord.js";

// data 
const data = new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flips a coin.')

async function execute(interaction){
    // get value
    const headOrTail = Math.floor(Math.random() * 2 );
    // if one heads
    if (headOrTail === 0){
        await interaction.reply({
            content: "Coin flipped: It's Heads!"
        })
    }else{
    // if two, tails
        await interaction.reply({
            content: "Coin flipped: It's Tails!"
        })
    }
    

}

export default{
    data,
    execute
};