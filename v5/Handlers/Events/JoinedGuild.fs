module Handlers.Events.JoinedGuild

open Discord.WebSocket
open Discord
open Utils
open GlobalVariables
open System.Threading.Tasks
open Types
open MongoDB.Bson
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let joinedGuild (guild: SocketGuild) : Task =
  task {
    if (nullableToOption guild.Name).IsSome then
      do!
        Task.Run<unit>(fun () ->
          task {
            let badWordBlockerServer = getGuild badWordBlockerServerId |> Option.get
            let logChannel = getChannel badWordBlockerServer botLogChannelId |> Option.get
            let embed = EmbedBuilder()
            embed.WithTitle("Joined Guild") |> ignore
            embed.WithDescription("Bad Word Blocker joined a new guild") |> ignore
            embed.AddField("Name", guild.Name) |> ignore
            embed.AddField("Members", guild.MemberCount) |> ignore
            embed.WithThumbnailUrl(guild.IconUrl) |> ignore
            embed.WithColor(toColorCode Green) |> ignore
            do! setDocument InexactMatch (BsonArray jsonInfo.defaultBlacklist.en.inexactmatch) guild.Id

            do! (logChannel :?> SocketTextChannel).SendMessageAsync(embed = embed.Build()) :> Task
            let mutable sentEmbed = false

            for channel in guild.Channels do
              if (channel.GetChannelType()).HasValue && not sentEmbed then
                try
                  let welcomeEmbed =
                    toEmbed
                      { Title = "Thanks for Inviting"
                        Description =
                          $"Thank you for inviting Bad Word Blocker. You don't need to do anything further- the bot will automatically block words.
                                    **To edit the blacklist-** `/blacklist`
                                    **To customize embeds-** `/custom_embed`
                                    **Set limits-** `/limits add` and `/limits manage`
                                    *For more documentation:* {documentationLink}
                                    
                                    Bad Word Blocker is a 100 percent free bot that relies only on donations. If you would like to donate, please click here: https://www.patreon.com/user?u=82005627"
                        Footer = None
                        Color = Blue }

                  do! (channel :?> SocketTextChannel).SendMessageAsync(embed = welcomeEmbed) :> Task
                  sentEmbed <- true
                with _ ->
                  ()
          })

  }
