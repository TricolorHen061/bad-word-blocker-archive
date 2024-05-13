module Handlers.Commands.Strikes

open Discord.WebSocket
open Utils
open Types
open System.Threading.Tasks
open System.Collections.Generic
open Wrappers.DiscordWrappers
open Wrappers.DatabaseWrappers

let strikesViewCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {

    let targetUser =
      getOption options "user"
      |> Option.map (fun x -> x.Value :?> SocketUser)
      |> Option.defaultValue commandInteraction.User


    let! targetUserStrikes = getStrikes commandInteraction.GuildId.Value targetUser.Id

    let! footer =
      getLimits commandInteraction.GuildId.Value
      |> mapTask (fun x -> length x > 0)
      |> mapTask (fun x ->
        if not x then
          Some "Strikes do not matter unless there are limits set"
        else
          None)


    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Strikes"
                Description =
                  if targetUserStrikes > 0 then
                    $"{targetUser.Mention} has `{targetUserStrikes}` strike(s)"
                  else
                    $"{targetUser.Mention} has no strikes. Their parents raised them well!"
                Footer = footer
                Color = Blue }
          Components = None }
      :> Task
  }

let strikesEditCommand
  (commandInteraction: SocketSlashCommand)
  (options: IReadOnlyCollection<SocketSlashCommandDataOption>)
  =
  task {

    let targetUser =
      getOption options "user"
      |> Option.map (fun x -> x.Value :?> SocketUser)
      |> Option.get

    let amount =
      getOption options "amount"
      |> Option.map (fun x -> x.Value :?> double)
      |> Option.get

    let! footer =
      getLimits commandInteraction.GuildId.Value
      |> mapTask (fun x -> length x > 0)
      |> mapTask (fun x ->
        if not x then
          Some "Strikes do not matter unless there are 1+ limits set"
        else
          None)

    let targetSocketGuildUser = targetUser :?> SocketGuildUser
    do! setStrikes commandInteraction.GuildId.Value (int amount) targetUser.Id
    let! punishmentData = getPunishment targetUser.Id targetSocketGuildUser.Guild.Id

    if punishmentData.IsSome then
      let! res = doPunishment punishmentData.Value targetSocketGuildUser

      match res with
      | Error e -> printfn $"{e}"
      | Ok _ -> printfn "What"

    do!
      send
        (Interaction(commandInteraction, Some true))
        { MessageType =
            Embed
              { Title = "Success"
                Description = $"{targetUser.Mention} now has `{amount}` strike(s)."
                Footer = footer
                Color = Green }
          Components = None }
      :> Task
  }
