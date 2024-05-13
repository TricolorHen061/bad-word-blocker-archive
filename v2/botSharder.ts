const { ShardingManager } = require("discord.js")
import { token } from "./environment_variables/variables.json"
import * as functions from "./functions"

const manager = new ShardingManager("./bot.js", {token : token}) 


manager.on("shardCreate", async shard => {
    await functions.processShardCreate(shard)
})






manager.spawn({timeout : 100000})