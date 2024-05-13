module Handlers.Events.LeftGuild

open Discord.WebSocket
open Discord
open Utils
open System.Threading.Tasks
open Types
open Wrappers.DiscordWrappers
open GlobalVariables

let leftGuild (guild: SocketGuild) : Task =
  task {
    if (nullableToOption guild.Name).IsSome then
      do!
        Task.Run<unit>(fun () ->
          task {
            let badWordBlockerServer = getGuild badWordBlockerServerId |> Option.get
            let logChannel = getChannel badWordBlockerServer botLogChannelId |> Option.get
            let embed = EmbedBuilder()
            embed.WithTitle("Left Guild") |> ignore
            embed.WithDescription("Bad Word Blocker left a guild") |> ignore
            embed.AddField("Name", guild.Name) |> ignore
            embed.AddField("Members", guild.MemberCount) |> ignore
            embed.WithThumbnailUrl(guild.IconUrl) |> ignore
            embed.WithColor(toColorCode Red) |> ignore
            do! (logChannel :?> SocketTextChannel).SendMessageAsync(embed = embed.Build()) :> Task


          (*  do! deleteDocument ExactMatch guild.Id
                        do! deleteDocument InexactMatch guild.Id
                        do! deleteDocument Links guild.Id
                        do! deleteDocument Phrases guild.Id
                        do! deleteDocument Bypasses guild.Id
                        do! deleteDocument Strikes guild.Id
                        do! deleteDocument Limits guild.Id
                        do! deleteDocument TimedPunishments guild.Id
                        do! deleteDocument CustomMessages guild.Id
                        do! deleteDocument Logs guild.Id
                        do! deleteDocument MessageSave guild.Id
                        do! deleteDocument Extras guild.Id *)

          })
  }
