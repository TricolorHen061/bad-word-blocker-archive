module Wrappers.DatabaseWrappers

open MongoDB.Bson
open MongoDB.Driver
open GlobalVariables
open Types
open Utils
open System.Threading.Tasks
open System.Collections.Generic
open Discord.WebSocket
open System.Linq

let getCollection (collectionName: string) =
    db.GetCollection<BsonDocument>(collectionName)

let getFilter (id: uint64) =
    Builders<BsonDocument>.Filter.Eq ("_id", string id)

let filter (collection: IMongoCollection<BsonDocument>) (filter: FilterDefinition<BsonDocument>) =
    collection.FindAsync(filter)

let getCollectionName =
    function
    | InexactMatch ->
        { CollectionName = "inwordmatch_words"
          KeyName = "words" }
    | Links ->
        { CollectionName = "custom_bad_links"
          KeyName = "Links" }
    | Phrases ->
        { CollectionName = "bad_phrases"
          KeyName = "phrases" }
    | Bypasses ->
        { CollectionName = "channels_roles_bypasses"
          KeyName = "bypasses" }
    | Strikes ->
        { CollectionName = "strikes"
          KeyName = "strikes" }
    | Limits ->
        { CollectionName = "punishments"
          KeyName = "punishments" }
    | TimedPunishments ->
        { CollectionName = "timed_punishments"
          KeyName = "entries" }
    | CustomMessages ->
        { CollectionName = "custom_messages"
          KeyName = "info" }
    | Logs ->
        { CollectionName = "logchannels"
          KeyName = "Channel" }
    | MessageSave ->
        { CollectionName = "messages"
          KeyName = "message_info" }
    | Extras ->
        { CollectionName = "extra_features"
          KeyName = "data" }
    | ExactMatch ->
        { CollectionName = "custom_bad_words"
          KeyName = "badwordlist" }
    | CustomEmbedWord ->
        { CollectionName = "custom_embed_word"
          KeyName = "word" }

let getDocument<'T> (collection: DbCollections) (guildId: uint64) =
    let collectionData = getCollectionName collection
    let collection = getCollection collectionData.CollectionName

    guildId
    |> uint64
    |> getFilter
    |> filter collection
    |> mapTask (fun x -> x.FirstOrDefault() |> nullableToOption)
    |> mapTask (fun x ->
        x
        |> Option.map (fun v ->
            let returnValue: 'T = v
            returnValue))

let addDocument (collection: DbCollections) (value: BsonValue) (guildId: uint64) =
    task {
        let collectionData = getCollectionName collection
        let collection = getCollection collectionData.CollectionName
        let document = new BsonDocument()
        document.Add(new BsonElement("_id", string guildId)) |> ignore
        document.Add(new BsonElement(collectionData.KeyName, value)) |> ignore
        do! collection.InsertOneAsync(document)
    }

let setDocument (collectionType: DbCollections) (value: BsonValue) (guildId: uint64) =
    task {
        let collectionData = getCollectionName collectionType
        let collection = getCollection collectionData.CollectionName
        let! existingDocument = getDocument collectionType guildId

        if existingDocument.IsNone then
            do! addDocument collectionType value guildId


        let filter = getFilter (uint64 guildId)
        let builder = Builders<BsonDocument>.Update.Set (collectionData.KeyName, value)
        do! collection.UpdateOneAsync(filter, builder) :> Task

    }

let deleteDocument (collectionType: DbCollections) (guildId: uint64) =
    task {
        let filter = getFilter guildId
        let collectionData = getCollectionName collectionType
        let collection = getCollection collectionData.CollectionName
        do! collection.DeleteOneAsync(filter) :> Task
    }

let getStrikes (guildId: uint64) (memberId: uint64) =
    task {
        let! strikesData =
            getDocument<StrikesData> Strikes guildId
            |> taskDefaultValue
                { _id = string guildId
                  strikes = Dictionary<string, int>() }

        return
            getDictionaryValue strikesData.strikes <| string memberId
            |> Option.defaultValue 0
    }

let setStrikes (guildId: uint64) (targetAmount: int) (memberId: uint64) =
    task {

        let! strikesData =
            getDocument<StrikesData> Strikes guildId
            |> taskDefaultValue
                { _id = string guildId
                  strikes = Dictionary<string, int>() }

        let allStrikes = strikesData.strikes
        allStrikes[string memberId] <- targetAmount
        do! setDocument Strikes (allStrikes.ToBsonDocument()) guildId
    }

let addOneStrike (guildId: uint64) (memberId: uint64) =
    task {
        let! currentStrikes = getStrikes guildId memberId
        do! setStrikes guildId (currentStrikes + 1) memberId
    }

let deleteStrikes (guildId: uint64) (memberId: uint64) =
    task {
        let! strikesData =
            getDocument<StrikesData> Strikes guildId
            |> taskDefaultValue
                { _id = string guildId
                  strikes = Dictionary<string, int>() }

        let allStrikes = strikesData.strikes
        ignore <| allStrikes.Remove(string memberId)
        do! setDocument Strikes (allStrikes.ToBsonDocument()) guildId

    }

let addLimit (amount: int) (action: string) (minutes: int) (guildId: uint64) =
    task {
        let! guildLimitData =
            getDocument<LimitData> Limits guildId
            |> taskDefaultValue
                { _id = string guildId
                  punishments = Dictionary<string, LimitKeyData>() }

        let limitData = guildLimitData.punishments

        let addRole () =
            task {
                limitData[string amount] <- { action = action; minutes = minutes }
                do! setDocument Limits (limitData.ToBsonDocument()) guildId
                return Ok()
            }


        return!
            if limitData.ContainsKey(string amount) then
                task { return Error $"A limit with an amount of `{amount}` already exists. Please remove it first." }
            else if action = "timeout" && minutes = -1 then
                task {
                    return
                        Error
                            $"An action of `timeout` was chosen, but no amount of `minutes` was specified. Please rerun this command and fill in the `minutes` parameter."
                }
            else if minutes <> -1 then

                if action = "timeout" && minutes > jsonInfo.timeoutLimit then
                    task { return Error $"A timeout can have a time limit of up to **{jsonInfo.timeoutLimit} minutes." }
                else if action = "ban" && minutes > jsonInfo.banLimit then
                    task { return Error $"Minutes needs to be under {jsonInfo.banLimit}" }
                else if action = "kick" then
                    task {
                        return
                            Error
                                $"A kick cannot be undone. Please re-run this command and do not fill out the `minutes` parameter."
                    }
                else
                    addRole ()

            else
                addRole ()

    }

let getLimits (guildId: uint64) =
    task {
        let! limitData =
            getDocument<LimitData> Limits guildId
            |> taskDefaultValue
                { _id = string guildId
                  punishments = Dictionary() }

        let mutable allLimits = [||]

        for limit in limitData.punishments do
            allLimits <-
                allLimits
                |> addToArray
                    { Amount = int limit.Key
                      Action = limit.Value.action
                      Minutes = limit.Value.minutes }

        return allLimits
    }

let removeLimit (amount: int) (guildId: uint64) =
    task {
        let! limitData =
            getDocument<LimitData> Limits guildId
            |> taskDefaultValue
                { _id = string guildId
                  punishments = Dictionary() }

        let limits = limitData.punishments
        limits.Remove(string amount) |> ignore
        do! setDocument Limits (limits.ToBsonDocument()) guildId
    }

let getPunishment (memberId: uint64) (guildId: uint64) =
    task {
        let! limitData =
            getDocument<LimitData> Limits guildId
            |> taskDefaultValue
                { _id = string guildId
                  punishments = Dictionary<string, LimitKeyData>() }

        let limits = limitData.punishments
        let! memberStrikes = getStrikes guildId memberId

        let mutable nextLimit: LimitKeyData option = None

        for limit in limits do
            if memberStrikes >= int limit.Key then
                nextLimit <- Some limit.Value

        return
            nextLimit
            |> Option.map (fun x ->
                { Minutes = x.minutes
                  Action = x.action
                  Amount = memberStrikes })
    }

let setCustomEmbed (title: string) (content: string) (color: string) (cleanup: string) (guildId: uint64) =
    task {
        return!
            if not << fst <| System.Int32.TryParse(color) then
                task {
                    return
                        Error
                            "Color needs to be an `Int Value` between 1 and 8 characters. Refer here for colors: https://gist.github.com/thomasbnt/b6f455e2c7d743b796917fa3c205f812"
                }
            else if not << fst <| System.Int32.TryParse(cleanup) then
                task {
                    return
                        Error(
                            "\"Delete after\" entry must contain a number. \n"
                            + "-1 or less = The message will not send\n
                            0 = The message will send and not delete\n
                            Anything above 0 = Amount of seconds that the embed will exist before being deleted"
                        )
                }
            else
                task {
                    do!
                        setDocument
                            CustomMessages
                            ({ title = title
                               content = content
                               color = int color
                               cleanup = int cleanup }
                                .ToBsonDocument())
                            guildId

                    return Ok()
                }


    }

let isBypassing (guildUserRoles: SocketRole array) (channel: SocketChannel) (guildId: uint64) =
    task {
        let! bypassData =
            getDocument<BypassData> Bypasses guildId
            |> taskDefaultValue
                { _id = string guildId
                  bypasses = { channels = [||]; roles = [||] } }

        let everyoneRoleId = string guildId // They are the same

        let filteredBypassData =
            { bypassData with
                bypasses =
                    { bypassData.bypasses with roles = bypassData.bypasses.roles |> subtractArrays [| everyoneRoleId |] } }

        let hasRolesInCommon =
            guildUserRoles
            |> Array.map (fun x -> string x.Id)
            |> difference filteredBypassData.bypasses.roles
            |> fun subtracted -> subtracted.Length <> filteredBypassData.bypasses.roles.Length

        let isBypassChannel =
            filteredBypassData.bypasses.channels.Contains(
                string
                <| if isThreadChannel channel then
                       (channel :?> SocketThreadChannel).ParentChannel.Id
                   else
                       channel.Id
            )

        let isBypassing = hasRolesInCommon || isBypassChannel
        let isEveryoneBypassing = Array.contains everyoneRoleId bypassData.bypasses.roles

        return (isBypassing, isEveryoneBypassing)
    }

let saveMessage (blacklistedItem: string) (message: SocketMessage) =
    task {
        let guild = (message.Author :?> SocketGuildUser).Guild

        let v =
            { content = message.Content
              time = System.DateTime.Now.ToString()
              blacklistedItem = blacklistedItem }

        let! existingData =
            getDocument<MessageSaveData> MessageSave guild.Id
            |> taskDefaultValue
                { _id = string guild.Id
                  message_info = Dictionary() }

        let savedMessagesData = existingData.message_info
        savedMessagesData[string message.Author.Id] <- v
        do! setDocument MessageSave (savedMessagesData.ToBsonDocument()) guild.Id
    }

let getSavedMessage (userId: uint64) (guildId: uint64) =
    task {
        let! existingData =
            getDocument<MessageSaveData> MessageSave guildId
            |> taskDefaultValue
                { _id = string guildId
                  message_info = Dictionary() }

        return getDictionaryValue existingData.message_info <| string userId
    }

let setCommandChannels (guildId: uint64) (channelIds: uint64 array) =
    task {
        let! extrasData =
            getDocument<ExtrasData> Extras (uint64 "1")
            |> taskDefaultValue { _id = "1"; data = Dictionary() }

        let guildExtrasData =
            getDictionaryValue extrasData.data (string guildId)
            |> Option.defaultValue
                { command_channels = [||]
                  cleanup_bots = [||] }

        let data = extrasData.data

        data[string guildId] <- { guildExtrasData with command_channels = Array.map string channelIds }

        do! setDocument Extras (data.ToBsonDocument()) <| uint64 "1"

    }

let getCommandChannels (guildId: uint64) =
    task {
        let! extrasData =
            getDocument<ExtrasData> Extras (uint64 "1")
            |> taskDefaultValue { _id = "1"; data = Dictionary() }

        let guildExtrasData =
            getDictionaryValue extrasData.data (string guildId)
            |> Option.defaultValue
                { command_channels = [||]
                  cleanup_bots = [||] }

        return guildExtrasData.command_channels
    }

let removeCommandChannels (guildId: uint64) (channelIds: string array) =
    task {
        let! commandChannels = getCommandChannels guildId
        let subtracted = subtractArrays commandChannels channelIds

        do! setCommandChannels guildId <| Array.map uint64 subtracted

    }


let addCommandChannel (guildId: uint64) (channelId: uint64) =
    task {
        let! commandChannels = getCommandChannels guildId
        let newValue = commandChannels |> addToArray (string channelId)

        do! setCommandChannels guildId <| Array.map uint64 newValue

    }

let setCleanupBots (guildId: uint64) (cleanupData: string array array) =
    task {
        let! extrasData =
            getDocument<ExtrasData> Extras (uint64 "1")
            |> taskDefaultValue { _id = "1"; data = Dictionary() }

        let guildExtrasData =
            getDictionaryValue extrasData.data (string guildId)
            |> Option.defaultValue
                { command_channels = [||]
                  cleanup_bots = [||] }

        let data = extrasData.data

        data[string guildId] <- { guildExtrasData with cleanup_bots = cleanupData }

        do! setDocument Extras (data.ToBsonDocument()) <| uint64 "1"

    }

let getCleanupBots (guildId: uint64) =
    task {
        let! extrasData =
            getDocument<ExtrasData> Extras (uint64 "1")
            |> taskDefaultValue { _id = "1"; data = Dictionary() }

        let guildExtrasData =
            getDictionaryValue extrasData.data (string guildId)
            |> Option.defaultValue
                { command_channels = [||]
                  cleanup_bots = [||] }

        return guildExtrasData.cleanup_bots
    }

let removeCleanupBots (guildId: uint64) (botIds: uint64 array) =
    task {
        let! cleanupBots = getCleanupBots guildId

        let subtracted =
            cleanupBots
            |> Array.filter (fun data -> (not ((Array.map string botIds).Contains(Array.item 0 data))))

        do! setCleanupBots guildId subtracted

    }


let addCleanupBot (guildId: uint64) (botId: uint64) (seconds: int) =
    task {
        let! cleanupBots = getCleanupBots guildId
        let newValue = cleanupBots |> addToArray [| string botId; string seconds |]

        do! setCleanupBots guildId newValue

    }

let updateServer (guild: SocketGuild) =
    task {

        let! exactMatch = getDocument<ExactMatchData> ExactMatch guild.Id
        let! inexactMatch = getDocument<InexactMatchData> InexactMatch guild.Id
        do! deleteDocument CustomMessages guild.Id
        let newValue = inexactMatch.Value.words |> Array.append exactMatch.Value.badwordlist
        do! setDocument InexactMatch (BsonArray newValue) guild.Id
        do! deleteDocument ExactMatch guild.Id
        do! guild.DeleteApplicationCommandsAsync()

    }

