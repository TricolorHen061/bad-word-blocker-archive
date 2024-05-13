module GlobalVariables

open MongoDB.Driver
open System
open Types
open Discord.WebSocket
open Discord
open System.Collections.Generic

let socketConfig =
    DiscordSocketConfig(
        GatewayIntents =
            (GatewayIntents.GuildMessages
             ||| GatewayIntents.MessageContent
             ||| GatewayIntents.Guilds
             ||| GatewayIntents.GuildMembers),
        LogLevel = LogSeverity.Verbose
    )

let client = new DiscordShardedClient(socketConfig)

let jsonFileText = IO.File.ReadAllText "../information.json"
let environmentVariablesText = IO.File.ReadAllText "./environment_variables.json"

let jsonInfo = Text.Json.JsonSerializer.Deserialize<JsonInfoData>(jsonFileText)

let environmentVariables =
    Text.Json.JsonSerializer.Deserialize<EnvironmentVariablesData>(environmentVariablesText)

let mutable mongoClientSettings = MongoClientSettings()
mongoClientSettings.Server <- MongoServerAddress(environmentVariables.dbAddress)
mongoClientSettings.MaxConnectionPoolSize <- 500

let db = MongoClient(mongoClientSettings).GetDatabase("badwordblocker")

let pendingMuteRoles = Dictionary<string, string>()

let defaultEmbedTitle = "Message {verb}" // Verb is either "Deleted" or "Flagged"

let defaultEmbedDescription = "{mention}'s message contained blacklisted item(s)."

let badWordBlockerServerId = uint64 "722594194513723987"
let botLogChannelId = uint64 "735259395134586982"
let commandLogChannelId = uint64 "887359608669233182"

let voteLink = "https://top.gg/bot/657776310491545620/vote"
let serverInviteLink = "https://discord.gg/hzrauvY"
let documentationLink = "https://bwbdocs.readthedocs.io/"


let englishWords =
    System.IO.File.ReadLines("../EnglishWords.txt")
    |> Seq.toArray
    |> Array.map (fun x -> x.ToLower())
