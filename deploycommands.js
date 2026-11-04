// deploy-commands.js

import { REST, Routes } from 'discord.js';
import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

const commands = [];

const foldersPath = path.join('./commands');
const commandFolders = fs.readdirSync(foldersPath);

// Loop through command folders
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);

	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);

		const command = await import(`./${filePath.replace(/\\/g, '/')}`);

		if (command.default?.data) {
			commands.push(command.default.data.toJSON());
		}
	}
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
	console.log(`Started refreshing ${commands.length} application (/) commands.`);

	const data = await rest.put(
		Routes.applicationGuildCommands(
			process.env.CLIENT_ID,
			process.env.GUILD_ID
		),
		{ body: commands }
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
	console.error(error);
}