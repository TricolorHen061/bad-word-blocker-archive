module Handlers.Buttons

open Discord.WebSocket
open Discord
open Types
open Utils
open System.Threading.Tasks
open CommandData
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers
open MongoDB.Bson


let bypassRolesButtonExecuted (buttonInteraction: SocketMessageComponent) =
  task {
    let guildId = buttonInteraction.GuildId.Value
    let guild = (buttonInteraction.User :?> SocketGuildUser).Guild

    let! bypassData =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    if length bypassData.bypasses.roles <> 0 then

      let bypassRoles, deletedRoles =
        bypassData.bypasses.roles
        |> Array.map (fun roleId -> getRole guild <| uint64 roleId)
        |> Array.partition (fun x -> x.IsSome)

      // Remove deleted roles
      (* do!
                setDocument
                    Bypasses
                    ({ channels = bypassData.bypasses.channels
                       roles =
                         bypassData.bypasses.roles
                         |> subtractArrays (Array.map (Option.get >> (fun (x: SocketRole) -> string x.Id)) deletedRoles) }
                        .ToBsonDocument())
                    guildId *)

      let options =
        bypassRoles
        |> Array.map Option.get
        |> Array.map (fun x ->
          { Label = x.Name
            CustomId = string x.Id
            Description = $"ID: {x.Id}" })

      let formattedOptions =
        options
        |> Array.map (fun x -> $"**-** {x.Label} `{x.Description}`")
        |> String.concat "\n"

      do!
        (send
          (Interaction(buttonInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Bypassing Roles"
                  Description = formattedOptions
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons = None
                  SelectMenu =
                    Some
                      { CustomId = "bypass_roles_remove"
                        Placeholder = "Click here to remove roles. Only first 24 shown."
                        MinValues = 1
                        MaxValues = options.Length
                        Options = options } } }
        :> Task)
    else
      do!
        (send
          (Interaction(buttonInteraction, Some true))
          { MessageType =
              Embed
                { Title = "No bypass roles"
                  Description =
                    "You have no roles currently bypassing the bot. You can add more with the `/bypass role` command."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task)
  }

let bypassChannelsButtonExecuted (buttonInteraction: SocketMessageComponent) =
  task {
    let guildId = buttonInteraction.GuildId.Value
    let guild = (buttonInteraction.User :?> SocketGuildUser).Guild

    let! bypassData =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    if length bypassData.bypasses.channels <> 0 then
      let bypassChannels, deletedChannels =
        bypassData.bypasses.channels
        |> Array.map (fun channelId -> getChannel guild <| uint64 channelId)
        |> Array.partition (fun x -> x.IsSome)

      let options =
        bypassChannels
        |> Array.map Option.get
        |> fun channels ->
             let mutable channelOptions = [||]

             for channel in channels do
               channelOptions <-
                 channelOptions
                 |> addToArray
                      { Label = channel.Name
                        CustomId = string channel.Id
                        Description = $"ID: {channel.Id}" }

             channelOptions

      let formattedOptions =
        options
        |> Array.map (fun x -> $"**-** {x.Label} `{x.Description}`")
        |> String.concat "\n"

      // Remove deleted roles
      do!
        setDocument
          Bypasses
          ({ channels =
               bypassData.bypasses.channels
               |> subtractArrays (
                 Array.map (Option.get >> (fun (x: SocketGuildChannel) -> string x.Id)) deletedChannels
               )
             roles = bypassData.bypasses.roles }
            .ToBsonDocument())
          guildId

      do!
        send
          (Interaction(buttonInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Bypassing Channels"
                  Description = formattedOptions
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons = None
                  SelectMenu =
                    Some
                      { CustomId = "bypass_channels_remove"
                        Placeholder = "Click to remove some. Only first 24 shown."
                        MinValues = 1
                        MaxValues = if options.Length > 24 then 24 else options.Length
                        Options =
                          if options.Length > 24 then
                            Array.take 24 options
                          else
                            options } } }
        :> Task
    else
      do!
        send
          (Interaction(buttonInteraction, Some true))
          { MessageType =
              Embed
                { Title = "No bypass channels"
                  Description =
                    "You have no channels currently bypassing the bot. You can add more with the `/bypass channel` command."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
  }

let logChannelRemoveButtonExecuted (buttonInteraction: SocketMessageComponent) =
  task {
    do! deleteDocument Logs buttonInteraction.GuildId.Value

    do!
      send
        (Interaction(buttonInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Log Channel Removed"
                Description =
                  "The log channel was removed. You can now add another one with the `/log set`, if you want."
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let extrasEnableButtonExecuted (buttonInteraction: SocketMessageComponent) =
  task {
    let guild = (buttonInteraction.User :?> SocketGuildUser).Guild
    do! guild.BulkOverwriteApplicationCommandAsync(extrasCommands) :> Task

    do!
      send
        (Interaction(buttonInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Extras enabled"
                Description = "The two commands have been added."
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let updateServer (buttonInteraction: SocketMessageComponent) =
  task {
    let guild = (buttonInteraction.User :?> SocketGuildUser).Guild
    let! exactMatch = getDocument<ExactMatchData> ExactMatch buttonInteraction.GuildId.Value
    let! inexactMatch = getDocument<InexactMatchData> InexactMatch buttonInteraction.GuildId.Value
    do! deleteDocument CustomMessages buttonInteraction.GuildId.Value
    let newValue = inexactMatch.Value.words |> Array.append exactMatch.Value.badwordlist
    do! setDocument InexactMatch (BsonArray newValue) buttonInteraction.GuildId.Value
    do! deleteDocument ExactMatch buttonInteraction.GuildId.Value
    do! guild.DeleteApplicationCommandsAsync()

    do!
      send
        (Interaction(buttonInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Finished"
                Description =
                  "Finished. If you encounter problems, please report them by joining the support server (in bot profile)."
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }
