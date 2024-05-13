import { ClusterClient } from "detritus-client"

const express = require("express")
const { Webhook, Api } = require("@top-gg/sdk")
export const votedUsers:Array<string> = []
import { topgg_token } from "../.././information.json"

const app = express()
const topggWebhook = new Webhook("9^jL?@R$[v,?#D68")
const API = new Api(topgg_token)

export function startWebhookListener(client) {


    app.post("/dblwebhook", topggWebhook.listener(async vote => {
        const userID = vote["user"]
        votedUsers.push(userID)
        console.log(vote)
        const guild = await (client as ClusterClient).rest.fetchGuild("722594194513723987")
        const member = await guild.members?.get(userID)
        if(member) {
            await member.addRole("725942963632472116")
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

