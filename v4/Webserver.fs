module Webserver

open Suave
open Suave.Filters
open Suave.Operators
open Suave.Successful
open Utils
open Utils.FileUtils


let runWebserver () =
  let server = choose [
      POST >=> choose
        [ path "/dblwebhook" >=> (request (fun c ->
        let getDataValue (keyName:string) =
          c.form
          |> List.map (fun keyValue -> fst keyValue |> parseText)
          |> List.find (fun parsedData ->
            try
              parsedData |> getNestedValue keyName |> ignore
              true
            with
            | _ -> false
          )
          |> getNestedValue keyName
          |> string
        
        if getDataValue "password" = "9^jL?@R$[v,?#D68" then
          let userId = getDataValue "user"
          votes <- userId :: votes
        OK "")) ] ]
    
  server |> startWebServer defaultConfig