module Handlers.Commands.Extras

open Utils
open Types
open System.Threading.Tasks
open Discord.WebSocket
open Discord
open System.Collections.Generic
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let extrasCommand (commandInteraction: SocketSlashCommand) =
  task {
    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Types.Embed
              { Title = "Enable extras?"
                Description =
                  "These are extra moderation features that have nothing to do with message filtering. 
                                   
                                   Continuing will add 2 new commands in this server:
                                   `/cleanupbot`- Can automatically deletes other bots' messages after a given amount of seconds
                                   `/commchannel`- Command Channel. Deletes every message in a given channel unless it's from a bot
                                  
                                  **Once added, you can't remove these commands. Do you want to continue?**"
                Footer = None
                Color = Blue }
          Components =
            Some
              { Buttons =
                  Some
                    [| { Label = "Continue"
                         CustomId = Some "extras_enable"
                         Style = ButtonStyle.Primary
                         Url = None } |]
                SelectMenu = None } }
      :> Task
  }

let commChannelAddCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {
    let guildId = commandInteraction.GuildId.Value

    let channel =
      getOption options "channel"
      |> Option.map (fun x -> x.Value :?> SocketChannel)
      |> Option.get

    do! addCommandChannel guildId channel.Id

    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Types.Embed
              { Title = "Command Channel Added"
                Description = "Every channel sent in that channel will be deleted, unless it's from a bot."
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let commChannelManageCommand (commandInteraction: SocketSlashCommand) =
  task {

    let guild = (commandInteraction.User :?> SocketGuildUser).Guild
    let guildId = guild.Id


    let! commandChannels = getCommandChannels guildId

    let commChannels, deletedCommChannelIds =
      commandChannels
      |> Array.partition (fun x -> (getChannel guild <| uint64 x).IsSome)
      |> fun x ->
           let commChannels =
             fst x |> Array.map (fun x -> (getChannel guild <| uint64 x).Value)

           (commChannels, snd x)

    if Array.isEmpty >> not <| deletedCommChannelIds then
      let subtracted = subtractArrays commandChannels deletedCommChannelIds

      do! setCommandChannels guildId <| Array.map uint64 subtracted

    if not << Array.isEmpty <| commChannels then
      let options =
        commChannels
        |> Array.map (fun channel ->
          { CustomId = string channel.Id
            Label = channel.Name
            Description = $"Channel ID: {channel.Id}" })

      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "Command Channels"
                  Description = "The following are the current command channels."
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons = None
                  SelectMenu =
                    Some
                      { CustomId = "comm_channels_remove"
                        Placeholder = "Tap here to view, select some to remove"
                        MinValues = 1
                        MaxValues = length options
                        Options = options } } }
        :> Task

    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "No Command Channels"
                  Description = "You have no command channels set. You can add one with `/commchannel add`."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task

  }

let cleanupBotAddCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {

    let guildId = commandInteraction.GuildId.Value

    let targetUser =
      getOption options "bot"
      |> Option.map (fun x -> x.Value :?> SocketGuildUser)
      |> Option.get

    let seconds =
      getOption options "seconds"
      |> Option.map (fun x -> x.Value :?> double)
      |> Option.get


    if targetUser.IsBot then

      do! addCleanupBot guildId targetUser.Id <| int seconds

      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "Cleanup Bot Added"
                  Description = $"Every message from bot {targetUser.Mention} will be deleted after {seconds} seconds."
                  Footer = None
                  Color = Green }
            Components = None }
        :> Task
    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "Not A Bot"
                  Description = $"{targetUser.Mention} is not a bot. You need to enter a bot."
                  Footer = None
                  Color = Red }
            Components = None }
        :> Task
  }

let cleanupBotManage (commandInteraction: SocketSlashCommand) =
  task {

    let guild = (commandInteraction.User :?> SocketGuildUser).Guild
    let! cleanupBots = getCleanupBots guild.Id

    if Array.isEmpty >> not <| cleanupBots then

      let options =
        cleanupBots
        |> Array.map (fun data ->
          let botId = Array.item 0 data
          let seconds = Array.item 1 data

          let botName =
            getGuildUser (uint64 botId) guild
            |> Option.map (fun x -> $"{x.Username}#{x.Discriminator}")
            |> Option.defaultValue "(removed bot)"

          { CustomId = botId
            Label = $"{botName}, {seconds} seconds"
            Description = "Click to remove" })

      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "Cleanup bots"
                  Description = "This is a list of all the bots whose messages will be cleaned up"
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons = None
                  SelectMenu =
                    Some
                      { CustomId = "cleanup_bots_remove"
                        Placeholder = "Tap to view, select some to remove"
                        MinValues = 1
                        MaxValues = length cleanupBots
                        Options = options } } }
        :> Task
    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Types.Embed
                { Title = "Cleanup bots"
                  Description =
                    "There are currently no cleanup bots. You can add some with the `/cleanupbot add` command."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
  }
