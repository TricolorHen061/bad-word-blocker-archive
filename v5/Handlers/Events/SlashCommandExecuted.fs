module Handlers.Events.SlashCommandExecuted

open Wrappers.DatabaseWrappers
open Utils
open Types
open Discord.WebSocket
open System.Threading.Tasks
open GlobalVariables
open Handlers.Commands.Ping
open Handlers.Commands.Blacklist
open Handlers.Commands.Bypass
open Handlers.Commands.Strikes
open Handlers.Commands.Limits
open Handlers.Commands.CustomEmbed
open Handlers.Commands.Log
open Handlers.Commands.Get
open Handlers.Commands.Serverc
open Handlers.Commands.Extras
open Handlers.Commands.Update
open Handlers.Commands.CustomCommands.SetWord
open Wrappers.DiscordWrappers


let slashCommandExecuted
  (interaction: SocketSlashCommand)
  (subCommandData: option<SocketSlashCommandDataOption>)
  (guild: SocketGuild)
  =

  task {
    let isVoted = true // Temp fix because top.gg would not respond

    let! isUpdated =
      getDocument<ExactMatchData> ExactMatch interaction.GuildId.Value
      |> mapTask Option.isNone

    if not isUpdated then
      do! updateServer guild

    match interaction.Data.Name, subCommandData with
    | "ping", None -> do! pingCommand interaction
    | "blacklist", None -> do! blacklistCommand interaction
    | "bypass", Some subCommand when subCommand.Name = "channel" && isVoted ->
      do! bypassChannelCommand interaction subCommand.Options
    | "bypass", Some subCommand when subCommand.Name = "role" && isVoted ->
      do! bypassRoleCommand interaction subCommand.Options
    | "bypass", Some subCommand when subCommand.Name = "manage" && isVoted ->
      do! bypassManageCommand interaction subCommand.Options
    | "strikes", Some subCommand when subCommand.Name = "view" -> do! strikesViewCommand interaction subCommand.Options
    | "strikes", Some subCommand when subCommand.Name = "edit" -> do! strikesEditCommand interaction subCommand.Options
    | "limits", Some subCommand when subCommand.Name = "add" && isVoted ->
      do! limitsAddCommand interaction subCommand.Options
    | "limits", Some subCommand when subCommand.Name = "manage" && isVoted -> do! limitsManageCommand interaction
    | "custom_embed", None when isVoted -> do! customEmbedCommand interaction
    | "log", Some subCommand when subCommand.Name = "set" -> do! logSetCommand interaction subCommand.Options
    | "log", Some subCommand when subCommand.Name = "manage" -> do! logManageCommand interaction
    | "get", None -> do! getCommand interaction
    | "serverc", None when isVoted -> do! servercCommand interaction
    | "extras", None when isVoted -> do! extrasCommand interaction
    | "commchannel", Some subCommand when subCommand.Name = "add" && isVoted ->
      do! commChannelAddCommand interaction subCommand.Options
    | "commchannel", Some subCommand when subCommand.Name = "manage" && isVoted ->
      do! commChannelManageCommand interaction
    | "cleanupbot", Some subCommand when subCommand.Name = "add" && isVoted ->
      do! cleanupBotAddCommand interaction subCommand.Options
    | "cleanupbot", Some subCommand when subCommand.Name = "manage" && isVoted -> do! cleanupBotManage interaction
    | "update", None -> do! updateCommand interaction
    | "setword", Some subCommandData -> do! setWordCommand interaction subCommandData
    | _ ->
      do!
        send
          (Interaction(interaction, Some true))
          { MessageType =
              Embed
                { Title = "Please Vote First"
                  Description =
                    "In order to use this command, you need to vote for the bot.
                                    It's free and you won't have to vote for the next 24 hours.
                                    Press the button below, and when you've voted, run this command again."
                  Footer = None
                  Color = Red }
            Components =
              Some
                { Buttons =
                    Some
                      [| { Label = "Vote"
                           CustomId = None
                           Style = Discord.ButtonStyle.Link
                           Url = Some voteLink } |]
                  SelectMenu = None } }
        :> Task


    if environmentVariables.isProduction then
      let badWordBlockerServer = getGuild badWordBlockerServerId |> Option.get
      let logChannel = getChannel badWordBlockerServer commandLogChannelId |> Option.get

      do!
        (logChannel :?> SocketTextChannel)
          .SendMessageAsync(
            $"User {interaction.User.Username}#{interaction.User.Discriminator} ran command {interaction.Data.Name} in guild {guild.Name}"
          )
        :> Task

  }
