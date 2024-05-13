import * as functions from "./functions"
const express = require("express")
const { Webhook, Api } = require("@top-gg/sdk")
export const votedUsers = []

const app = express()
const topggWebhook = new Webhook("9^jL?@R$[v,?#D68")
const API = new Api("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1Nzc3NjMxMDQ5MTU0NTYyMCIsImJvdCI6dHJ1ZSwiaWF0IjoxNjMwNzAxMDEyfQ.FaIjvcGvQ6bI_pjosrUliONxYMcasw9m-_C2G8NKB2g")

export function startWebhookListener(client) {


    app.post("/dblwebhook", topggWebhook.listener(async vote => {
        const userID = vote["user"]
        votedUsers.push(userID)
        const guild = await functions.getGuild("722594194513723987", client)
        const member = await functions.getMember(userID, guild)
        if(member) {
            await member.roles.add(functions.getRole(guild, "725942963632472116"))
        }
    }))

    app.listen(4000)

}




export async function addAllVotedUsers() {
    await API.getVotes().then(users => {
        users.forEach(user => {
            if(!votedUsers.includes(user["id"])) {
                votedUsers.push(user["id"])
            }
        })
    })
}

