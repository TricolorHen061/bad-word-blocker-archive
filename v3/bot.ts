import { ClusterClient, InteractionCommandClient, ShardClient } from "detritus-client";
import { ApplicationCommandOptionTypes } from "detritus-client/lib/constants";
import { addCommands } from "./commands";
import { registerEvents } from "./events";
import { commandChannelCommand, cleanupBotCommand} from "./interaction_functions";
import { Database } from "./utils";
import {databaseNames, topgg_token} from "../.././information.json"
import { token, isProduction } from "./environment_variables.json"
import { addAllVotedUsers, startWebhookListener } from "./votes";
const axios = require('axios').default;

export const interactionClient = new InteractionCommandClient(token, {gateway : {presence : {activity : {name : "/help", type : 0}}}})
export const db = new Database()
export async function addExtraFeatureCommands(guildId: string) {
    interactionClient.addMultiple([
        {name : "commandchannel", description : "Command channels", options : [{name : "add", description : "Adds a channel where, when a message is sent, it's deleted it unless it's from a bot.", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "channel", description : "Channel to add", type : ApplicationCommandOptionTypes.CHANNEL, required : true}]}, {name : "remove", description : "Remove a command channel", type : ApplicationCommandOptionTypes.SUB_COMMAND, options : [{name : "channel", description : "Channel to remove", required : true, type : ApplicationCommandOptionTypes.CHANNEL}]}], guildIds : [guildId], run : async (c, a) => await commandChannelCommand(c, a)},
        {name : "cleanupbot", description : "Clean up bot messages", options : [{name : "add", description : "Deletes a bot's messages after a certain amount of seconds", options : [{name : "bot", description : "Bot whose messages should get deleted after seconds", type : ApplicationCommandOptionTypes.USER, required : true}, {name : "seconds", description : "How long the bot should wait before deleting their message", type : ApplicationCommandOptionTypes.INTEGER, required : true}], type : ApplicationCommandOptionTypes.SUB_COMMAND}, {name : "remove", description : "Remove a bot whose messages are already getting deleted", options : [{name : "bot", description : "Bot to remove from messages getting deleted", type : ApplicationCommandOptionTypes.USER, required : true}], type : ApplicationCommandOptionTypes.SUB_COMMAND}], guildIds : [guildId], run : async (c, a) => await cleanupBotCommand(c, a)}
    ])
    await interactionClient.checkAndUploadCommands()
}

async function postTopggStats(client: ClusterClient) {
    axios.post("https://top.gg/api/bots/657776310491545620/stats", {
        server_count : Number(client.shards.reduce((x, shard) => x + shard.guilds.length, 0)),
        shard_count : Number(client.shardCount),
    },
    {
        headers : {
            Authorization : topgg_token
        }
    }
    ).catch((error:any) => console.log(error))
    console.log("Posted stats")
}

addCommands()
registerEvents();

(async () => {
    try{await interactionClient.run()
    console.log("Ready")
    await addAllVotedUsers()
    if(!isProduction) return
    startWebhookListener(interactionClient.client)
    const extraFeaturesData = await db.get(databaseNames.extras.collectionName, databaseNames.extras.keyName, {}, "1")
    const extraFeaturesGuildIds = Object.keys(extraFeaturesData)
    for(const guildId of extraFeaturesGuildIds) {
        interactionClient.rest.fetchGuild(guildId).then(async guild => {
            await addExtraFeatureCommands(guildId).catch(console.log)
        }).catch(error => {
            delete extraFeaturesData[guildId]
        })
    }
    await db.set(databaseNames.extras.collectionName, databaseNames.extras.keyName, extraFeaturesData, "1") 
    setInterval(async () => await postTopggStats(interactionClient.client as ClusterClient), 1.8e+6)
} catch(e) {
    console.log(e)
}
})()