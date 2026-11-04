// dotenv to access env file
import 'dotenv/config';

// Import the necessary classes
import { connectDB } from './helper/db.js'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	MessageFlags,
} from 'discord.js';

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, // Required
        GatewayIntentBits.GuildMessages, // Detect Messages
        GatewayIntentBits.MessageContent, // Read Message Content
        GatewayIntentBits.GuildMembers // See when people join
    ]
 });

client.commands = new Collection(); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Announce Successful Login
client.once(Events.ClientReady, () => {
	console.log(`Ready! Logged in as ${client.user.tag}`);
});


async function main() {
	try {
	await connectDB();
	
// Command Handler
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Searches through folders in command and registers command data into collection
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(`file://${filePath}`);
        const cmd = command.default;

		if (!cmd) {
    	console.log(`[ERROR] ${filePath} has no default export`);
    	continue;
		}

		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in cmd && 'execute' in cmd) {
			client.commands.set(cmd.data.name, cmd);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Event Handler
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);

	const event = (await import(`file://${filePath}`)).default;

	if (event.once) {
		client.once(event.name, (...args) =>
			event.execute(...args),
		);
	} else {
		client.on(event.name, (...args) =>
			event.execute(...args),
		);
	}
}

// Log in to Discord
await client.login(process.env.DISCORD_TOKEN);
 
} catch (error) {
		console.error('Failed to initialize bot, ', error);
		process.exit(1);
	}
}

// starts bot
main();
