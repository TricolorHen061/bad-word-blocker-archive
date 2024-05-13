import { WebSocketServer } from "ws"
import * as functions from "./functions"
import * as variables from "./variables"
const crypto = require("crypto")


const [ip, port] = ["localhost", 8080]
const websocket = new WebSocketServer({port : port, host : ip, maxPayload : 100000})
const validSessions = {}


export function startServer(client) {

    websocket.on("connection", ws => {
        ws.on("message", async receivedData => {
            const receivedMessage = receivedData.toString()
            const receivedMessageSplit = receivedMessage.split("|")
            const id = receivedMessageSplit[0]
            const data = JSON.parse(receivedMessageSplit[1].replaceAll("None", "null"))
            const sessionID = data["session_id"]
            const operation = data["operation"]
            delete data["session_id"]
            delete data["operation"]
            const sessionData = validSessions[sessionID]
            const userID = sessionData?.["id"]
            let dataToSend
            if(!userID && operation !== "login") {
                dataToSend = {"error" : "Session code is invalid. Please login again."}
            }
            console.log(data)
            console.log("Operation:")
            console.log(operation)
            const clientCache = client.guilds.cache
            if(!dataToSend && operation === "login") {
                const receivedUserID = data["user_id"]
                if((await functions.getDatabaseValue("banned_things", "users", [], "1")).includes(userID)) return 
                const receivedGuilds = data["user_guilds"]
                const newSessionID = String(crypto.randomBytes(4).toString("hex"))
                validSessions[newSessionID] = {"id" : receivedUserID, "allGuilds" : receivedGuilds}
                console.log(`Logged in, session ID: ${newSessionID}`)
                
                dataToSend = {"session_id" : newSessionID}
            }

            else if(!dataToSend && operation === "get_guilds") {
                const mutualGuilds = []
                const receivedGuilds = sessionData["allGuilds"]
                const sufficientPermissionGuilds = []
                console.log("1")
                for(const guild of functions.collectionToArray(clientCache).filter(guild => (sessionData["allGuilds"].map(guildData => guildData.id)).includes(guild.id))) {
                    console.log("2")
                    await guild.members.fetch()
                    console.log("3")
                    const memberInGuild = await guild.members.resolve(userID)
                    if(memberInGuild) {
                        console.log("4")
                        const guildID = guild.id
                        mutualGuilds.push(guildID)
                        if(functions.hasPermissions(memberInGuild, "MANAGE_GUILD")) {
                            sufficientPermissionGuilds.push(guildID)
                        }
                    }
                    
                }
                dataToSend = {"all_guilds" : receivedGuilds, "mutual_guilds" : mutualGuilds, "sufficient_permission_guilds" : sufficientPermissionGuilds}
            }

            else if(!dataToSend && operation === "get_guild_data") {
                const guildID = data["guild_id"]
                const guild = await functions.getGuild(guildID, client)
                const memberInGuild = await (guild)?.members.fetch(userID)
                if(!functions.hasPermissions(memberInGuild, "MANAGE_GUILD")) {
                    return
                }
                dataToSend = {
                    "guild_id" : guildID,
                    "blacklist" : {
                        "exactmatch" : await functions.getDatabaseValue("custom_bad_words", "badwordlist", [], guildID),
                        "inwordmatch" : await functions.getDatabaseValue("inwordmatch_words", "words", [], guildID),
                        "links" : await functions.getDatabaseValue("custom_bad_links", "Links", [], guildID),
                        "phrases" : await functions.getDatabaseValue("bad_phrases", "phrases", [], guildID)
                    },
                    "strikes" : await (async () => {
                        const usersStrikeInfo = []
                        const guildStrikes = await functions.getDatabaseValue("strikes", "strikes", [], guildID)
                        for(const k in guildStrikes) {
                            const v = guildStrikes[k]
                            const user = (await functions.getMember(k, guild))?.user
                            if(!user) {
                                continue
                            }
                            usersStrikeInfo.push({"tag" : user.tag, "id" : user.id, "strikes" : v})
                         }
                         return usersStrikeInfo
                        })(),
                    "limits" : await functions.getDatabaseValue("punishments", "punishments", {}, guildID),
                    "bypasses" : await (async () => {
                        const bypassesData = {}
                        for(const x of (await functions.getDatabaseValue("bypasses", "roles", [], guildID))) {
                            const roleName = functions.getRole(guild, x)?.name
                            if(roleName) {
                                bypassesData[x] = roleName
                            }
                        }
                        return bypassesData
                    })(),
                    "ignores" : await (async () => {
                        const ignoresData = {}
                        for(const x of (await functions.getDatabaseValue("ignores", "channels", [], guildID))) {
                            const channelName = functions.getChannel(x, client)?.name
                            if(channelName) {
                                ignoresData[x] = channelName
                            }
                        }
                        return ignoresData
                    })(),
                    "channels" : functions.collectionToMultipleAttributeItems(guild.channels.cache, ["name", "id"], "#", 0, channel => channel.isText()),
                    "roles" : functions.collectionToMultipleAttributeItems(guild.roles.cache, ["name", "id"], "@", 0),
                    "settings" : {
                        "admin" : (await functions.getDatabaseValue("settings", "settings", {}, guildID))?.admin ?? true,
                        "respond_to_slash" : (await functions.getDatabaseValue("settings", "settings", {}, guildID))?.respondToSlash ?? true,
                        "already_sent_bypass_message" : (await functions.getDatabaseValue("settings", "settings", {}, guildID))?.alreadySentBypassMessage ?? false
                    },
                    "log" : await functions.getDatabaseValue("logchannels", "Channel", null, guildID),
                    "cleanup" : await functions.getDatabaseValue("when_to_delete_the_bad_word_blocked_message", "Seconds", null, guildID),
                    "get" : await functions.getSavedMessage(memberInGuild.user),
                    "custom" : {
                        "content" : (await functions.getDatabaseValue("custom_messages", "info", null, guildID))?.content || null,
                        "is_embed" : (await functions.getDatabaseValue("custom_messages", "info", null, guildID))?.isEmbed || false,
                        "color" : (await functions.getDatabaseValue("custom_messages", "info", null, guildID))?.color || null
                    }
                }
                sessionData["unmodified_data"] = dataToSend
            }

            else if(!dataToSend && operation === "save") {
                const unmodifiedData = sessionData["unmodified_data"]
                if(!unmodifiedData) {
                    return
                }
                const newData = data["guild_data"]
                const guildID = unmodifiedData["guild_id"]
                const guild = await functions.getGuild(guildID, client)
                const memberInGuild = await (guild)?.members.fetch(userID)
                for(const k in newData) {
                    const requiredPermission = variables.commandPermissions[k]
                    if(!requiredPermission) continue
                    console.log(requiredPermission)
                    if(!functions.hasPermissions(memberInGuild, requiredPermission)) {
                        dataToSend = {"error" : `You need the ${requiredPermission} in that server to modify ${k}`}
                        break
                    }
                }
                for(const x in newData) {
                    const newValue = newData[x]
                    const checkData = variables.websiteSaveFormatDataChecks[x]
                    if(!checkData) continue
                    const [checkResult, formattedData] = await checkData(newValue, [client, guildID])
                    if(!checkResult) {
                        console.log(`Check returned false: ${x}`)
                        console.log(formattedData)
                    }
                    if(x === "blacklist") {
                        for(const k in newValue) {
                            const v = newValue[k]
                            const itemDatabaseData = variables.operationDatabaseValues["blacklist"][k]
                            const [collectionName, keyName] = itemDatabaseData
                            await functions.setDatabaseValue(collectionName, keyName, v, guildID)
                        }
                        continue
                    }
                    const [collectionName, keyName] = variables.operationDatabaseValues[x]
                    if(formattedData === "delete") {
                        await functions.erase(await functions.getCollection(collectionName), guildID)
                        
                    }
                    else {
                        await functions.setDatabaseValue(collectionName, keyName, formattedData, guildID)
                    }
                }
                dataToSend = {"message" : "Data successfully updated"}
            }
            
            ws.send(`${id} ${JSON.stringify(dataToSend)}`)
            console.log("Sent:")
            console.log(`${id} ${JSON.stringify(dataToSend)}`)
        }).on("error", console.log)
    }).on("error", console.log)
}
