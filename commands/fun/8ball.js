import { SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Shakes an 8Ball')
    .addStringOption(option => 
        option
            .setName('question')
            .setDescription('Question to be answered by the 8ball.')
            .setRequired(true)
    );

async function execute(interaction){
    // collection of 8 ball responses in a array
    const responses = ["It is certain.",
        "It is decidely so.",
        "Without a doubt.",
        "Yes definitely.",
        "You may rely on it.",
        "As I see it, yes.",
        "Most likely.",
        "Outlook good.",
        "Yes.",
        "Signs point to yes.",
        "Reply hazy, try again.",
        "Ask again later.",
        "Better not tell you now.",
        "Cannot predict now.",
        "Concentrate and ask again.",
        "Don't count on it.",
        "My reply is no.",
        "My sources say no.",
        "Outlook not so good.",
        "Very doubtful"
    ];
    // math random it 
    const result = responses[Math.floor(Math.random()* responses.length)];
    // reply with given number

    const question = interaction.options.getString('question');
    await interaction.reply({
        content: `Question: ${question}\n${result}`
    });
}

export default{
    data,
    execute
};