module Handlers.Commands.Log

open Discord.WebSocket
open Discord
open System.Collections.Generic
open Types
open MongoDB.Bson
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let logSetCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {
    let channel =
      getOption options "channel"
      |> Option.map (fun x -> x.Value :?> SocketChannel)
      |> Option.get

    do! setDocument Logs (BsonString <| string channel.Id) commandInteraction.GuildId.Value

    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Log Channel Set"
                Description = "That channel will now receive logs when a message is blocked"
                Footer = None
                Color = Green }
          Components = None }
      :> Task
  }

let logManageCommand (commandInteraction: SocketSlashCommand) =
  task {
    let guildId = commandInteraction.GuildId.Value
    let! logChannelData = getDocument<LogsData> Logs guildId

    if logChannelData.IsSome then
      let logChannelMention =
        getChannel (commandInteraction.User :?> SocketGuildUser).Guild
        <| uint64 logChannelData.Value.Channel
        |> Option.map (fun x -> $"<#{x.Id}>")
        |> Option.get

      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Log Channel Information"
                  Description = $"The current log channel is {logChannelMention}."
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons =
                    Some
                      [| { CustomId = Some "remove_log_channel"
                           Label = "Remove"
                           Style = ButtonStyle.Secondary
                           Url = None } |]
                  SelectMenu = None } }
        :> Task
    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Log Channel Information"
                  Description = "There is no log channel set at this time. Add one with the `/log set` command."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
  }
