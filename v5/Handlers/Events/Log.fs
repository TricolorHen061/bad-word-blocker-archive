module Handlers.Events.Log

open Discord
open System.Threading.Tasks
open Utils

let logEvent (message: LogMessage) : Task =
  task {
    let m = message.ToString()

    if m |> stringIncludes "Connected to " || m |> stringIncludes "Disconnected from" then
      ()
    else
      printfn $"{m}"
  }
