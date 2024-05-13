module Handlers.PunishmentTimer

open GlobalVariables
open MongoDB.Driver
open MongoDB.Bson
open Types
open System
open Utils
open System.Threading.Tasks
open Wrappers.DatabaseWrappers
open Wrappers.DiscordWrappers

let checkPunishments () =
  task {
    let runSynchronously (task: Task<'a>) =
      task |> Async.AwaitTask |> Async.RunSynchronously |> ignore

    let actionNegate =
      function
      | "ban" -> "unban"
      | "timeout" -> "remove_timeout"
      | roleString when toWords roleString |> Array.item 0 = "role" -> "undo_role " + Array.item 1 (toWords roleString)
      | _ -> raise <| Exception("Invalid action given to negate")


    let! allDocuments =
      db
        .GetCollection("timed_punishments")
        .FindSync(Builders<BsonDocument>.Filter.Empty)
        .ToListAsync<TimedPunishmentsData>()
      |> mapTask Seq.toArray

    let mutable entriesToRemove = [||]

    allDocuments
    |> Array.iter (fun document ->
      document.entries
      |> Array.iter (fun entry ->
        let negatedAction = actionNegate entry.action
        let now = DateTime.Now
        let undoTime = DateTime.Parse(entry.undoAt)

        if now > undoTime then
          let guild = getGuild <| uint64 entry.guildId

          if guild.IsSome then
            let guildValue = guild.Value
            let guildUser = getGuildUser (uint64 entry.memberId) guildValue

            if guildUser.IsSome then
              let guildUserValue = guildUser.Value

              undoPunishment guildUserValue negatedAction |> runSynchronously

          entriesToRemove <- addToArray entry entriesToRemove)

      let newValue =
        document.entries
        |> subtractArrays entriesToRemove
        |> Array.map (fun x -> x.ToBsonDocument())

      setDocument TimedPunishments (BsonArray newValue) (uint64 document._id)
      |> runSynchronously)


  }
  |> Async.AwaitTask
  |> Async.Start
