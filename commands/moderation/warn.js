import { SlashCommandBuilder } from "discord.js";
import { addWarning, getWarnings } from "../../helper/warnings.js";

const data = new SlashCommandBuilder()  
    .setName('warn')
    .setDescription('warn commands')
    
    .addSubcommand(subcommand =>
        subcommand
        .setName('user')
        .setDescription('Warns user.')
        .addUserOption(option =>
            option
            .setName('user')
            .setDescription('user to be warned')
            .setRequired(true)
        )
        .addStringOption(option =>
            option
            .setName('reason')
            .setDescription('reason for warn')
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
        subcommand
        .setName('cases')
        .setDescription('lists warn cases for users')
        .addUserOption(option =>
            option
            .setName('user')
            .setDescription('user to list cases for')
            .setRequired(true)
        )
    )

async function execute(interaction){
    const subcommand = interaction.options.getSubcommand();

    // Warn user subcommand
    if (subcommand === 'user'){
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') ?? 'No reason provided.';
        // add warning to cases

        const warning = await addWarning(
            interaction.guild.id,
            user.id,
            interaction.user.id,
            reason
        );

        // reply that warning is added 
        await interaction.reply({
            content: `${user} was warned.\nCase #${warning.case}\nReason: ${reason}`
        });
    }

    // list cases subcommand 
    if (subcommand === 'cases'){
        const user = interaction.options.getUser('user');

        const warnings = await getWarnings(
        interaction.guild.id,
        user.id
    );

    if (!warnings.length) {
        return interaction.reply("No warnings found.");
    }

    const list = warnings
        .map(w => `Case #${w.case} - ${w.reason}`)
        .join("\n");

    await interaction.reply(list);
    }
    
}

export default({
    data,
    execute
})