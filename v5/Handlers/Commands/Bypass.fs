module Handlers.Commands.Bypass

open Discord.WebSocket
open Utils
open Types
open System.Collections.Generic
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers
open MongoDB.Bson

let bypassChannelCommand
  (interaction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {
    // TODO: Handle deleted channels
    let guildId = interaction.GuildId.Value

    let channel =
      getOption options "channel"
      |> Option.map (fun x -> x.Value :?> SocketChannel)
      |> Option.get

    let! existingData =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    let newValue =
      { channels =
          existingData.bypasses.channels
          |> addToArray (string channel.Id)
          |> Array.distinct
        roles = existingData.bypasses.roles }

    do! setDocument Bypasses (newValue.ToBsonDocument()) guildId

    do!
      (send
        (Interaction(interaction, Some true))
        { MessageType =
            Embed
              { Title = "Channel added"
                Description = "Every message sent in that channel will now be extempt from the bot's filter."
                Footer = None
                Color = Green }
          Components = None })
      :> Task

  }

let bypassRoleCommand (interaction: SocketSlashCommand) (options: IReadOnlyCollection<SocketSlashCommandDataOption>) =
  task {
    // TODO: Handle deleted roles
    let guildId = interaction.GuildId.Value

    let role =
      getOption options "role" |> Option.get |> (fun x -> x.Value :?> SocketRole)

    let! existingData =
      getDocument<BypassData> Bypasses guildId
      |> taskDefaultValue
           { _id = string guildId
             bypasses = { channels = [||]; roles = [||] } }

    let newValue =
      { channels = existingData.bypasses.channels
        roles = existingData.bypasses.roles |> addToArray (string role.Id) |> Array.distinct }

    do! setDocument Bypasses (newValue.ToBsonDocument()) guildId

    do!
      (send
        (Interaction(interaction, Some true))
        { MessageType =
            (Embed
              { Title = "Role added"
                Description = "Everyone with that role will now be extempt from the bot's filter"
                Footer = None
                Color = Green })
          Components = None }
      :> Task)


  }


let bypassManageCommand
  (interaction: SocketSlashCommand)
  (_: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {
    do!
      (send
        (Interaction(interaction, Some true))
        { MessageType =
            Embed
              { Title = "Select"
                Description = "Would you like to view/remove bypass roles or bypass channels?"
                Footer = None
                Color = Blue }
          Components =
            Some
              { Buttons =
                  Some
                    [| { Label = "Roles"
                         CustomId = Some "bypass_roles_button"
                         Style = Discord.ButtonStyle.Primary
                         Url = None }
                       { Label = "Channels"
                         CustomId = Some "bypass_channels_button"
                         Style = Discord.ButtonStyle.Primary
                         Url = None } |]
                SelectMenu = None } }
      :> Task)

  }
