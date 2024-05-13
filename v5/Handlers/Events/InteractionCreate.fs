module Handlers.Events.InteractionCreate

open Discord.WebSocket
open System.Threading.Tasks
open Discord
open Handlers.Events.SlashCommandExecuted


let interactionCreate (interaction: SocketInteraction) : Task =
  task {
    let isSlashCommand = interaction.Type = InteractionType.ApplicationCommand

    if isSlashCommand then
      let commandInteraction = interaction :?> SocketSlashCommand
      let subCommandData = commandInteraction.Data.Options |> Seq.tryHead
      let guild = (interaction.User :?> SocketGuildUser).Guild

      do! slashCommandExecuted commandInteraction subCommandData guild

    return Task.CompletedTask

  }
