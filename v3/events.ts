import { interactionClient, db } from "./bot"
import { BotUtils, Database, Filter, Limits, SavedMessages, StringUtils } from "./utils"
import { databaseNames, colors, defaultBlacklist, blocked_users } from "../.././information.json"
import { InteractionDataApplicationCommand, InteractionDataComponent } from "detritus-client/lib/structures"
import { InteractionCallbackTypes } from "detritus-client/lib/constants"
import { commandChannelCommand } from "./interaction_functions"
import { InteractionContext } from "detritus-client/lib/interaction"

export const newServers = []

export function registerEvents() {
    interactionClient.client.on("messageCreate", async ({ message }) => await BotUtils.messageCreate(message))

    interactionClient.client.on("messageUpdate", async ({message}) => await BotUtils.messageCreate(message))

    interactionClient.client.on("interactionCreate", async ({interaction}) => {
        if(blocked_users.includes(interaction.userId)) return
        const selectMenuData = (interaction?.data as InteractionDataComponent)
        if(selectMenuData.customId === "limitsRemoveSelectMenu") {
            await Limits.remove(interaction.guild, selectMenuData.values, db)
            // await interaction.message.delete()
            return interaction.respond(InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed("Limits removed", "The selected limits were successfully removed.", interaction.user, null, colors.green)})
        }
        else if(selectMenuData.customId === "bypassesRemove") {
            const interactionMessageContent = interaction.message.content
            const entity = interactionMessageContent.split(" ")[3].slice(0, -1)
            const guildBypasses: Map<string, Array<string>> = await db.get(databaseNames.bypasses.collectionName, databaseNames.bypasses.keyName, {roles : [], channels : []}, interaction.guildId)
            const valuesToRemove = selectMenuData.values
            // await interaction.message.delete()
            if(entity === "role") {
                for(const roleId of valuesToRemove) guildBypasses["roles"].splice(guildBypasses["roles"].indexOf(roleId), 1)
            }
            if(entity === "channel") {
                for(const channelId of valuesToRemove) guildBypasses["channels"].splice(guildBypasses["channels"].indexOf(channelId), 1)
            }
            await db.set(databaseNames.bypasses.collectionName, databaseNames.bypasses.keyName, guildBypasses, interaction.guildId)
            await interaction.respond(InteractionCallbackTypes.CHANNEL_MESSAGE_WITH_SOURCE, {embed : BotUtils.createEmbed(`${StringUtils.capitalize(entity)}s removed`, `The selected ${entity}s were removed`, interaction.user, null, colors.green)})
        }

        // if((interaction.data as InteractionDataApplicationCommand).name === "commandchannel") await commandChannelCommand(new InteractionContext(interaction.client, interaction, interaction.data, )

    })

    interactionClient.client.on("guildCreate", async ({ guild, fromUnavailable }) => {
        if(fromUnavailable) return
        console.log(`Joined server ${guild.name}`);
        (await guild.client.rest.fetchChannel("735259395134586982")).createMessage({embed : BotUtils.createEmbed("Joined guild", "Bad Word Blocker joined a new guild", guild.client.user, [{name : "Name", value : guild.name}, {name : "Members", value : String(guild.memberCount)}], colors.green, null, null, guild.iconUrl)})
        for(const collectionNickname in databaseNames.blacklist) {
            const collectionData = databaseNames.blacklist[collectionNickname]
            await db.set(collectionData["collectionName"], collectionData["keyName"], defaultBlacklist.en[collectionNickname], guild.id)
        }
    })

    interactionClient.client.on("guildDelete", async ({ guild }) => {
        if(guild.unavailable) return 
        console.log(`Left server ${guild.name}`);
        (await guild.client.rest.fetchChannel("735259395134586982")).createMessage({embed : BotUtils.createEmbed("Left guild", "Bad Word Blocker left a guild", guild.client.user, [{name : "Name", value : guild.name}, {name : "Members", value : String(guild.memberCount)}], colors.red, null, null, guild.iconUrl)})
        for(const collection of (await db.database.listCollections().toArray())) await db.delete(collection.name, guild.id)
    })

    interactionClient.on("commandRan", async ({ command, context }) => {
        (await context.client.rest.fetchChannel("887359608669233182")).createMessage(`User ${context.user.tag} ran command ${command.name} in guild "${context.guild.name}"`)
    })

}