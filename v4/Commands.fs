namespace Commands

open Discord
open Discord.Interactions
open Discord.WebSocket
open System.Threading.Tasks
open System.Linq
open Utils.EmbedUtils
open Utils.ModalUtils
open Utils.TextInputUtils
open Utils.DbUtils
open Utils
open Utils.InteractionUtils
open Utils.ComponentBuilderUtils
open Utils.SelectMenuUtils
open Utils.GeneralUtils
open Utils.FileUtils
open Utils.LimitUtils
open Utils.MessageUtils
open Utils.StrikeUtils
open Utils.CommandChannelUtils
open Utils.ModeratedBotsUtils
open Models.Types
open MongoDB.Bson
open FSharp.Control
open System.Runtime.InteropServices



module Async = 
   let Map (f: ('T -> 'A)) (v: 'T Async) = 
      async {
         let! result = v
         return f result
      }
      

type SlashCommands () =

   inherit InteractionModuleBase ()

   [<SlashCommand("ping", "Pings the bot")>]
   member public this.PingCommand (): Task =
      task {
            let latency = (this.Context.Client :?> DiscordSocketClient).Latency
            let embed =
               createEmbed "Pong!" $"API latency is {latency}" this.Context.User
               |> withColor Color.Blue
            printfn "...Being run?"
            do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }
   
   [<SlashCommand("clear", "Clears a certain amount of messages from the channel")>]
   member public this.ClearCommand (amount:int): Task = 
      task {
         let minLimit, maxLimit = getLimitPair "clear"
         let embed =
            createEmbed "Messages Cleared" $"{amount} messages were cleared" this.Context.User
            |> withColor Color.Green
         let limitEmbed =
            createEmbed "Out of limits" $"Number must be between {minLimit} and {maxLimit}" this.Context.User
            |> withColor Color.Red
         if amount > maxLimit || amount < minLimit then
            do! this.Context.Interaction |> interactionRespondWithEmbed limitEmbed None
         else
            let channel = (this.Context.Channel :?> ITextChannel)
            let! gottenMessages =
               channel.GetMessagesAsync(amount + 1, CacheMode.AllowDownload).ToArrayAsync()
            let messages =
               gottenMessages[0]
               |> Seq.map (fun message -> message.Id)
            do! channel.DeleteMessagesAsync messages
            do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

   [<SlashCommand("blacklist", "Manage the server blacklist")>]
   member public this.BlacklistCommand (): Task = 
      task {
         let! exactmatchWords = get "exactmatch" [] this.Context.Guild.Id
         let! inexactmatchWords = get "inexactmatch" [] this.Context.Guild.Id
         let! phrases = get "phrases" [] this.Context.Guild.Id
         let! links = get "links" [] this.Context.Guild.Id

         let modal = 
            createModal ()
               |> withTitle "Server Blacklist"
               |> ModalUtils.withCustomId "blacklist_modal"
               |> addTextInput ( createTextInput () 
                  |> withLabel "Exact-match words"
                  |> withStyle TextInputStyle.Paragraph
                  |> TextInputUtils.withCustomId "exactmatch"
                  |> withValue ( bsonValueToBlacklistFormat exactmatchWords )
                  |> withRequired false )
               |> addTextInput ( createTextInput ()
                  |> withLabel "Inexact-match" 
                  |> withStyle TextInputStyle.Paragraph
                  |> TextInputUtils.withCustomId $"inexactmatch"
                  |> withValue (bsonValueToBlacklistFormat inexactmatchWords)
                  |> withRequired false )
               |> addTextInput (createTextInput ()
                  |> withLabel "Phrases"
                  |> withStyle TextInputStyle.Paragraph
                  |> TextInputUtils.withCustomId $"phrases"
                  |> withValue (bsonValueToBlacklistFormat phrases)
                  |> withRequired false )
               |> addTextInput ( createTextInput ()
                  |> withLabel "Links"
                  |> withStyle TextInputStyle.Paragraph
                  |> TextInputUtils.withCustomId $"links"
                  |> withValue (bsonValueToBlacklistFormat links)
                  |> withRequired false )


         do! this.Context.Interaction.RespondWithModalAsync(modal.Build (), null)
      }

   [<SlashCommand("customize", "Customize behavior when a message is blocked")>]
   member public this.Customize (): Task = 
      task {
         try
            let defaultContent, defaultColor =
               getInformationKey "embedDefaults"
               |> pairKeysToTuple "content" "color"
            let defaultValue = (Map [("content", defaultContent); ("color", defaultColor); ("cleanup", "0")]).ToBsonDocument ()
            let! customizationData = get "custom" defaultValue this.Context.Guild.Id
            printfn $"{customizationData}"
            let modal =
               createModal ()
               |> ModalUtils.withCustomId "customizationModal"
               |> withTitle "Customization"
               |> addTextInput (createTextInput ()
                  |> withLabel "Message Content"
                  |> withStyle TextInputStyle.Paragraph
                  |> TextInputUtils.withCustomId "content"
                  |> withValue customizationData["content"].AsString
                  |> withRequired true
                  |> TextInputUtils.withPlaceholder $"e.g. {defaultContent} " )
               |> addTextInput (createTextInput ()
                  |> withLabel "Color (int value)"
                  |> withStyle TextInputStyle.Short
                  |> TextInputUtils.withCustomId "color"
                  |> withValue (string customizationData["color"])
                  |> withRequired true)
               |> addTextInput (createTextInput ()
                  |> withLabel "Delete self after (in seconds)"
                  |> withStyle TextInputStyle.Short
                  |> TextInputUtils.withCustomId "cleanupSeconds"
                  |> withValue (string customizationData["cleanup"])
                  |> TextInputUtils.withPlaceholder "Set to 0 or less to disable" )
            do! this.Context.Interaction.RespondWithModalAsync(modal.Build (), null)
         with
         | _ as e -> printfn $"{e}"
      }

   [<SlashCommand("get", "Get someone's last blocked message")>]
   member this.GetCommand ([<Summary(name = "member"); Optional; DefaultParameterValue(null:IGuildUser)>] targetMember:IGuildUser): Task = 
      task {
         try
            let guildMember = if targetMember = null then (this.Context.User :?> IGuildUser) else targetMember
            let! messageInfo = getMessage guildMember.Id guildMember.Guild.Id
            let hasManageMessages = (this.Context.User :?> IGuildUser).GuildPermissions.ManageMessages
            let embed =
               match messageInfo with
               | Some info ->
                  let contentField = (new EmbedFieldBuilder()).WithName("Content").WithValue(info["content"])
                  let reasonField = (new EmbedFieldBuilder()).WithName("Reason for deletion").WithValue(info["reason"])
                  let timeOfDeletionField = (new EmbedFieldBuilder()).WithName("Time of deletion").WithValue(info["timeOfDeletion"])
                  let fieldList = [contentField; reasonField; timeOfDeletionField]
                  createEmbed "Last Blocked Message" $"The following is info about {guildMember.Mention}'s last blocked message" this.Context.User
                  |> withColor Color.Blue
                  |> withFields fieldList
               | None ->
                     createEmbed "No blocked messages" $"{guildMember.Mention} didn't get any of their messages deleted yet." this.Context.User
                     |> withColor Color.Blue
                     
            match guildMember.Id with
            | memberId ->
               do! this.Context.Interaction |> interactionRespondWithEmbed embed None
            | _ when hasManageMessages ->
               do! this.Context.Interaction |> interactionRespondWithEmbed embed None
            | _ when not hasManageMessages -> 
               let noPermissionEmbed =
                  createEmbed "Missing Permissions" "You need the Manage Messages permission to view other peoples' deleted messages." this.Context.User
                  |> withColor Color.Red
               
               do! this.Context.Interaction |> interactionRespondWithEmbed noPermissionEmbed None
         with
         | _ as e -> printfn $"{e}"         
      }

   [<SlashCommand("help", "Receive help with Bad Word Blocker")>]
   member this.HelpCommand (): Task =
      task {
         let documentationUrl = getInformationKey "documentationLink"
         let supportServerUrl = getInformationKey "serverInviteLink"
         let inviteUrl = getInformationKey "inviteUrl"
         let embed =
            createEmbed "Help" $"
Bad Word Blocker is an advanced Discord bot that helps moderators by automatically filtering messages.

To learn how to use Bad Word Blocker: [press here]({documentationUrl})
To join the support server: [press here]({supportServerUrl})
To invite the bot to your server: [press here]({inviteUrl})" this.Context.User |> withColor Color.Blue
      do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

   [<SlashCommand("servercount", "See how many servers Bad Word Blocker is in")>]
   member this.ServercountCommand (): Task =
      task {

         let serverCount = (this.Context.Client :?> DiscordShardedClient).Guilds.Count
         let embed =
            createEmbed "Servercount" $"Bad Word Blocker is in {serverCount} servers" this.Context.User
            |> withColor Color.Blue
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

[<GroupAttribute("log", "Manages log commands")>]
type LogCommands () = 

   inherit InteractionModuleBase ()

   [<SlashCommand("set", "Set a log channel to get notified when a message is blocked")>]
   member this.LogSetCommand ([<ChannelTypes(ChannelType.Text)>] channel:IChannel): Task =
      task {
         do! set "log" (string channel.Id) this.Context.Guild.Id
         let embed = 
            createEmbed "Log channel set" $"<#{channel.Id}> will receive logs when a message is blocked" this.Context.User
            |> withColor Color.Green
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

   [<SlashCommand("remove", "Remove the set log channel, if there is one")>]
   member this.LogRemoveCommand(): Task = 
      task {
         do! delete "log" this.Context.Guild.Id
         let embed =
            createEmbed "Log channel removed" "Log channel was removed" this.Context.User
            |> withColor Color.Green
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      } 

[<GroupAttribute("bypass", "Manages bypass commands")>]
type BypassCommands () = 

   inherit InteractionModuleBase ()

   [<SlashCommand("channel", "Allow a channel to bypass the bot's filter")>]
   member this.AddChannel ([<ChannelTypes(ChannelType.Text)>] channel:IChannel): Task =
      task {
            let defaultValue = (Map [("roles", []); ("channels", [])]).ToBsonDocument ()
            let! bypassInfo = get "bypasses" defaultValue this.Context.Guild.Id
            let bypassChannels = bypassInfo["channels"].AsBsonArray 
            let desiredChannel = channel
            let minLimit, maxLimit = getLimitPair "bypass"

            let embed =
               createEmbed "Channel added" $"Channel <#{desiredChannel.Id}> will now bypass the bot." this.Context.User
               |> withColor Color.Green
            let errorEmbed =
               createEmbed "Channel already bypassing" "That channel is already bypassing" this.Context.User
               |> withColor Color.Red
            let limitEmbed =
               createEmbed "Limit reached" $"You can only have up to {maxLimit} bypassing channels at one time" this.Context.User
               |> withColor Color.Red


            if bypassChannels.Contains (BsonValue.Create (string desiredChannel.Id)) then
               do! this.Context.Interaction |> interactionRespondWithEmbed errorEmbed None
            else if bypassChannels.ToArray().Length >= maxLimit then
               do! this.Context.Interaction |> interactionRespondWithEmbed limitEmbed None
            else
               let newBypassChannels = bypassChannels.Add (BsonValue.Create (string desiredChannel.Id))
               bypassInfo["channels"] <- newBypassChannels
               do! set "bypasses" bypassInfo this.Context.Guild.Id
               do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }
   
   [<SlashCommand("role", "Allow a role to bypass the bot's filter")>]
   member this.AddRole (role:IRole): Task = 
      task {
            let defaultValue = (Map [("roles", []); ("channels", [])]).ToBsonDocument ()
            let! bypassInfo = get "bypasses" defaultValue this.Context.Guild.Id
            let bypassRoles = bypassInfo["roles"].AsBsonArray 
            let desiredRole = role

            let embed =
               createEmbed "Role added" $"Role <@&{desiredRole.Id}> will now bypass the bot." this.Context.User
               |> withColor Color.Green
            let errorEmbed =
               createEmbed "Role already bypassing" "That role is already bypassing" this.Context.User
               |> withColor Color.Red

            if bypassRoles.Contains (BsonValue.Create (string desiredRole.Id)) then
                  do! this.Context.Interaction |> interactionRespondWithEmbed errorEmbed None
            else
               let newBypassRoles = bypassRoles.Add (BsonValue.Create (string desiredRole.Id))
               bypassInfo["roles"] <- newBypassRoles
               do! set "bypasses" bypassInfo this.Context.Guild.Id
               do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

   [<SlashCommand("manage", "View/remove bypassing channels and roles")>]
   member this.ManageBypass (): Task =
      task {
         let defaultValue = (Map [("roles", []); ("channels", [])]).ToBsonDocument ()
         let! bypassInfo = get "bypasses" defaultValue this.Context.Guild.Id
         let bypassRoles = bypassInfo["roles"].AsBsonArray
         let bypassChannels = bypassInfo["channels"].AsBsonArray
         let bypassRolesFormatted =
            bypassRoles.ToArray()
            |> Array.map (fun roleId -> $"<@&{roleId}>")
            |> String.concat ", "
         let bypassChannelsFormatted = 
            bypassChannels.ToArray()
            |> Array.map (fun channelId -> $"<#{channelId}>")
            |> String.concat ", "
         let emptyBypassesEmbed =
            createEmbed "No bypasses" "No roles or channels are bypassing the bot" this.Context.User
            |> withColor Color.Blue
         
         let bypassEmbedDescription = 
            $"Current roles and channels that are bypassing the bot:
   **Roles**
   {bypassRolesFormatted}
   **Channels**
   {bypassChannelsFormatted}"

         let bypassesEmbed =
            createEmbed "Bypasses" bypassEmbedDescription this.Context.User
            |> withColor Color.Blue

         if bypassRoles.ToArray().Length = 0 && bypassChannels.ToArray().Length = 0 then
            do! this.Context.Interaction |> interactionRespondWithEmbed emptyBypassesEmbed None
         else
            // let idsCombined = bypassRoles.AddRange bypassChannels
            let selectMenu = 
               createSelectMenu ()
               |> withPlaceholder "Select item(s) to remove"
               |> withCustomId "bypassRemove"
               |> withMaxValues(bypassChannels.ToArray().Length + bypassRoles.ToArray().Length)

            bypassChannels.ToArray()
            |> Array.iter (fun channelId ->
                  let guildChannel =
                     (this.Context.Guild.GetChannelAsync (uint64 channelId.AsString)).GetAwaiter().GetResult()
                     |> wrapInOption
                  let optionLabel =
                     match guildChannel with
                     | Some channel -> channel.Name
                     | None -> "(channel unreachable)"
                  selectMenu
                  |> withOption $"#{optionLabel}" $"channel {channelId.AsString}" null 
                  |> ignore  
               )


            bypassRoles.ToArray()
            |> Array.iter (fun roleId ->
                  let guildRole =
                     (this.Context.Guild.GetRole (uint64 roleId.AsString))
                     |> wrapInOption
                  let optionLabel =
                     match guildRole with
                     | Some role -> role.Name
                     | None -> "(deleted role)"
                  selectMenu
                  |> withOption $"@{optionLabel}" $"role {roleId.AsString}" null 
                  |> ignore 
               )

            let componentBuilder =
               createComponentBuilder ()
               |> withSelectMenu selectMenu
            do! this.Context.Interaction |> interactionRespondWithEmbed bypassesEmbed  (Some componentBuilder)
      }

[<GroupAttribute("limits", "Manages the limits commands")>]
type LimitsCommands () = 

   inherit InteractionModuleBase ()
   
   [<SlashCommand("add", "Add a limit on the amount of strikes a member can get")>]
   member this.addLimit ([<Summary(description = "Amount of strikes that should trigger the action")>] amount:int,
         [<Summary(description = "What do to when the specified number of strikes is reached"); Choice("Ban", "ban"); Choice("Kick", "kick"); Choice("Timeout", "timeout")>] action:string,
         [<Summary(description = "How long the action should last. This does NOT work for 'kick' action"); Optional; DefaultParameterValue(0)>] minutes:int): Task = 
      task {
         try
            let minAmountLimit, maxAmountLimit = getLimitPair "limitStrikes"
            let minMinutesLimit, maxMinutesLimit = getLimitPair "limitMinutes"
            let minutesValue =
               if minutes = 0 || action = "kick" then
                  None
               else
                  Some minutes
            let minutesSentenceValue =
               match minutesValue with
               | Some x -> string x
               | None -> "N/A"
            
            let amountLimitEmbed =
               createEmbed "Not within strike limits" $"The minimum allowed strike amount is **{minAmountLimit}**, and the max is **{maxAmountLimit}**" this.Context.User
               |> withColor Color.Red
            
            let minutesLimitEmbed = 
               createEmbed "Not within minute limits" $"The minimum allowed minute amount is **{minAmountLimit}**, and max is **{maxAmountLimit}**" this.Context.User
               |> withColor Color.Red
            
            let embed =
               createEmbed "Limit added" $"When a member reaches **{amount}** strikes, they will receive a **{action}** for **{minutesSentenceValue}** minutes." this.Context.User
               |> withColor Color.Green
            
            if amount > maxAmountLimit || amount < minAmountLimit then
               do! this.Context.Interaction |> interactionRespondWithEmbed amountLimitEmbed None
            
            else if minutesValue.IsSome && (minutes > maxMinutesLimit || minutes < minMinutesLimit) then
               do! this.Context.Interaction |> interactionRespondWithEmbed minutesLimitEmbed None
            
            else
               let limit = {
                  action = action;
                  amount = amount;
                  minutes = minutesValue
               }
               do! addLimit limit this.Context.Guild.Id
               do! this.Context.Interaction |> interactionRespondWithEmbed embed None
         with
         | _ as e -> printfn $"{e}"
      }

   [<SlashCommand("manage", "View and remove exising limits")>]
   member this.ManageLimits (): Task = 
      task {
            try
               let! limitsData = getAllLimits this.Context.Guild.Id

               let limitsFormatted = 
                  limitsData
                  |> List.map (fun data ->
                     let minutes = if data.minutes.IsSome then string data.minutes.Value else "N/A"
                     $"- **{data.amount}** strikes, **{data.action}** action, **{minutes}** minutes")
                  |> String.concat "\n"

               let embed = 
                  createEmbed "Limits" $"These are the current existing limits for this server:
                  
   {limitsFormatted}" this.Context.User
                  |> withColor Color.Blue

               let noLimitsEmbed = 
                  createEmbed "No Limits" "This server has no limits" this.Context.User
                  |> withColor Color.Blue

               let selectMenu =
                  createSelectMenu ()
                  |> withCustomId "limitsSelectMenu"
                  |> withPlaceholder "Select limit(s) to remove"
                  |> withMaxValues limitsData.Length
               limitsData
               |> List.iter (fun data ->
               selectMenu
               |> withOption $"{data.amount} strikes: {data.action}" (string data.amount) null
               |> ignore )
               
               let componentBuilder =
                  createComponentBuilder ()
                  |> withSelectMenu selectMenu

               if limitsData.IsEmpty then
                  do! this.Context.Interaction |> interactionRespondWithEmbed noLimitsEmbed None
               else
                  do! this.Context.Interaction |> interactionRespondWithEmbed embed (Some componentBuilder)
            with
               | _ as e -> printfn $"{e}"
         }

[<GroupAttribute("strikes", "Manages strike commands")>]
type StrikesCommands () = 

   inherit InteractionModuleBase ()

   [<SlashCommand("view", "View someone's strikes")>]
   member this.ViewStrikes ([<Summary(name = "member")>] guildMember:IGuildUser): Task = 
      task {
         let! strikes = getStrikes guildMember
         let embed = 
            createEmbed "Strikes" $"{guildMember.Mention} currently has **{strikes}** strikes" this.Context.User
            |> withColor Color.Blue
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

   [<SlashCommand("set", "Set someone's strikes")>]
   member this.SetStrikes ([<Summary(name = "member")>] guildMember:IGuildUser) (strikes:int): Task = 
      task {
         let minLimit, maxLimit = getLimitPair "strikes"

         let embed = 
            createEmbed "Strikes changed" $"{guildMember.Mention} now has **{strikes}** strikes" this.Context.User
            |> withColor Color.Green
         let notInLimitsEmbed =
            createEmbed "Amount out of limits" $"Strike amount must be between **{minLimit}** and **{maxLimit}**" this.Context.User
            |> withColor Color.Red
         
         if strikes > maxLimit || strikes < minLimit then
            do! this.Context.Interaction |> interactionRespondWithEmbed notInLimitsEmbed None
         else
            do! setStrikes strikes (guildMember :?> SocketGuildUser) :> Task
            do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

[<GroupAttribute("commandchannel", "Manages strike commands")>]
type CommandChannelCommands () = 

   inherit InteractionModuleBase ()

   [<SlashCommand("add", "(extras) Instruct the bot to delete every message sent in a channel that comes from a bot")>]
   member this.AddCommandChannel ([<ChannelTypes(ChannelType.Text)>] channel:IChannel): Task = 
      task {
         let _, maxLimit = getLimitPair "commandChannels" 
         let limitEmbed = 
            createEmbed "Too many channels" $"There can only be up to {maxLimit} channels. Please remove some before adding more" this.Context.User
            |> withColor Color.Red
         let embed = 
            createEmbed "Command channel added" $"All sent messages in <#{channel.Id}> will be deleted unless from a bot" this.Context.User
            |> withColor Color.Green
         let! added = addCommandChannel channel
         match added with
         | IsOverLimit -> do! this.Context.Interaction |> interactionRespondWithEmbed limitEmbed None
         | IsNotOverLimit -> do! this.Context.Interaction |> interactionRespondWithEmbed embed None

      }

   [<SlashCommand("remove", "(extras) Remove an existing command channel")>]
   member this.RemoveCommandChannel ([<ChannelTypes(ChannelType.Text)>] channel:IChannel): Task = 
      task {
         let embed =
            createEmbed "Command channel removed" "Command channel was removed" this.Context.User
            |> withColor Color.Green
         do! removeCommandChannel channel
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }

[<GroupAttribute("moderatedbot", "Manages moderated bot commands")>]
type ModeratedBotCommands () = 
   
   inherit InteractionModuleBase ()

   [<SlashCommand("add", "(extras) Delete a certain bot's messages after a set amount of seconds")>]
   member this.AddModeratedBot ([<Summary(name = "member")>] botMember:IGuildUser) ([<Summary(description = "Amount of seconds to wait before deleting the bot's message")>] seconds:int): Task = 
      task {
         try
            let _, maxBotLimit = getLimitPair "moderatedBots"
            let minSecondsLimit, maxSecondsLimit = getLimitPair "moderatedBotsSeconds"

            let botLimitEmbed = 
               createEmbed "Bot limit reached" $"You can only have up to **{maxBotLimit}** moderated bots" this.Context.User
               |> withColor Color.Red
            let secondsLimitEmbed = 
               createEmbed "Second limit reached" $"Please choose an amount of seconds between **{minSecondsLimit}** and **{maxSecondsLimit}**" this.Context.User
               |> withColor Color.Red
            let notBotEmbed = 
               createEmbed "Not a bot" "They are not a bot..." this.Context.User
               |> withColor Color.Red
            let embed = 
               createEmbed "Moderated bot added" $"All messages from bot {botMember.Mention} will be deleted after **{seconds}** seconds" this.Context.User
               |> withColor Color.Green
            
            if seconds > maxSecondsLimit || seconds < minSecondsLimit then
               do! this.Context.Interaction |> interactionRespondWithEmbed secondsLimitEmbed None

            if not botMember.IsBot then
               do! this.Context.Interaction |> interactionRespondWithEmbed notBotEmbed None

            else
               let! added = addModeratedBot seconds botMember
               match added with
               | IsNotOverLimit -> do! this.Context.Interaction |> interactionRespondWithEmbed embed None
               | IsOverLimit -> do! this.Context.Interaction |> interactionRespondWithEmbed botLimitEmbed None
         with
         | _ as e -> printfn $"{e}"
      }

   [<SlashCommand("remove", "(extras) Remove a moderated bot")>]
   member this.RemoveModeratedBot ([<Summary(name = "member")>] botMember:IGuildUser): Task = 
      task {
         let embed =
            createEmbed "Moderated bot removed" "Moderated bot removed" this.Context.User
            |> withColor Color.Green
         do! removeModeratedBot botMember
         do! this.Context.Interaction |> interactionRespondWithEmbed embed None
      }
