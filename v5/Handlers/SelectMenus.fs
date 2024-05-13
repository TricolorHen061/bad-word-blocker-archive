module Handlers.SelectMenus

open Discord.WebSocket
open Utils
open Types
open MongoDB.Bson
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let bypassRolesRemove (selectMenuInteraction: SocketMessageComponent) =
  task {
    let guildId = selectMenuInteraction.GuildId.Value
    let bypassRolesToRemove = selectMenuInteraction.Data.Values |> Seq.toArray

    let! oldValue =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    let newValue =
      { channels = oldValue.bypasses.channels
        roles = oldValue.bypasses.roles |> subtractArrays bypassRolesToRemove }

    do! setDocument Bypasses (newValue.ToBsonDocument()) guildId

    do!
      (send
        (Interaction(selectMenuInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Successful"
                Description = "The selected roles have been removed"
                Footer = None
                Color = Green }
          Components = None }
      :> Task)

  }

let bypassChannelsRemove (selectMenuInteraction: SocketMessageComponent) =
  task {
    let guildId = selectMenuInteraction.GuildId.Value
    let bypassChannelsToRemove = selectMenuInteraction.Data.Values |> Seq.toArray

    let! oldValue =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    let newValue =
      { channels = oldValue.bypasses.channels |> subtractArrays bypassChannelsToRemove
        roles = oldValue.bypasses.roles }

    do! setDocument Bypasses (newValue.ToBsonDocument()) guildId

    do!
      (send
        (Interaction(selectMenuInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Successful"
                Description = "The selected channels have been removed"
                Footer = None
                Color = Green }
          Components = None }
      :> Task)

  }



let limitsRemove (selectMenuInteraction: SocketMessageComponent) =
  task {
    let limits = selectMenuInteraction.Data.Values

    for amount in limits do
      do! removeLimit (int amount) selectMenuInteraction.GuildId.Value

    do!
      send
        (Interaction(selectMenuInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Successful"
                Description = $"{limits.Count} limits removed"
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let commChannelsRemove (selectMenuInteraction: SocketMessageComponent) =
  task {
    let guildId = selectMenuInteraction.GuildId.Value
    let channelIds = selectMenuInteraction.Data.Values |> Seq.toArray

    do! removeCommandChannels guildId channelIds

    do!
      send
        (Interaction(selectMenuInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Command Channels Removed"
                Description = "Selected command channels were successfully removed"
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let cleanupBotsRemove (selectMenuInteraction: SocketMessageComponent) =
  task {
    let botIds = selectMenuInteraction.Data.Values |> Seq.toArray

    do! removeCleanupBots selectMenuInteraction.GuildId.Value <| Array.map uint64 botIds

    do!
      send
        (Interaction(selectMenuInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Cleanup Bots Removed"
                Description = "Selected cleanup bots were successfully removed"
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }
