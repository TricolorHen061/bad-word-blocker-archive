module Handlers.Commands.Limits

open Discord.WebSocket
open System.Collections.Generic
open Utils
open Types
open System.Threading.Tasks
open GlobalVariables
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let limitsAddCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {
    let guildId = commandInteraction.GuildId.Value

    let amount =
      getOption options "amount"
      |> Option.map (fun x -> x.Value :?> double)
      |> Option.get

    let action =
      getOption options "action"
      |> Option.map (fun x -> x.Value :?> string)
      |> Option.get

    let minutes =
      getOption options "minutes"
      |> Option.map (fun x -> x.Value :?> double)
      |> Option.defaultValue -1


    match action with
    | "role" ->
      pendingMuteRoles[string commandInteraction.User.Id] <- $"{guildId} {action} {amount} {minutes}"

      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Mute role"
                  Description = $"You have chosen to use a mute role. Please @mention the role you want to add."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
    | _ ->
      let! res = addLimit (int amount) action (int minutes) guildId
      let descEnding = if minutes <> -1 then $" for {minutes} minutes." else "."

      let messageTask =
        match res with
        | Ok _ ->
          task {
            return!
              send
                (Interaction(commandInteraction, Some true))
                { MessageType =
                    Embed
                      { Title = "Successfully added"
                        Description =
                          $"When someone reaches `{amount}` strikes, they will be {getPastTenseAction action}"
                          + descEnding
                        Footer = None
                        Color = Green }
                  Components = None }
          }
        | Error errorMessage ->
          task {
            return!
              send
                (Interaction(commandInteraction, None))
                { MessageType =
                    Embed
                      { Title = "Error"
                        Description = errorMessage
                        Footer = None
                        Color = Red }
                  Components = None }
          }

      do! messageTask :> Task
  }

let limitsManageCommand (commandInteraction: SocketSlashCommand) =
  task {
    let guildId = commandInteraction.GuildId.Value
    let! allLimits = getLimits guildId
    let guild = (commandInteraction.User :?> SocketGuildUser).Guild

    let options =
      allLimits
      |> Array.map (fun x ->

        if x.Action |> startsWith "role" then
          { x with
              Action =
                "role " + x.Action
                |> toWords
                |> Array.item 2
                |> uint64
                |> getRole guild
                |> Option.map (fun x -> $"Add role \"{x.Name}\"")
                |> Option.defaultValue "(Deleted role)" }
        else
          x)
      |> Array.map (fun x ->
        let minutesLabel = if x.Minutes = -1 then "forever" else $"{x.Minutes} minutes"

        { CustomId = string x.Amount
          Label = $"{x.Amount} strikes"
          Description = $"{x.Action}, {minutesLabel}" })


    if length options > 0 then
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "Limits"
                  Description = "These are the limits for this server."
                  Footer = None
                  Color = Blue }
            Components =
              Some
                { Buttons = None
                  SelectMenu =
                    Some
                      { CustomId = "limits_remove"
                        Placeholder = "Select any to remove"
                        MinValues = 1
                        MaxValues = length options
                        Options = options } } }
        :> Task
    else
      do!
        send
          (Interaction(commandInteraction, Some true))
          { MessageType =
              Embed
                { Title = "No Limits"
                  Description = "This server currently has no limits. Add some with the `/limits add` command."
                  Footer = None
                  Color = Blue }
            Components = None }
        :> Task
  }
