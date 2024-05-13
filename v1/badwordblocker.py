# Imports a bunch of stuff
import sys
import discord
from discord.ext.commands import *
import logging
from discord.ext import *
import asyncio
from discord import *
from discord.ext.commands import *
import string
import json
from itertools import cycle
from discord.ext import tasks
import socket
import aiohttp
import traceback
try:
    import profanity_check
except ImportError:
    print("Could not import profanity-check")
except TypeError:
    pass
import random
import datetime
import time
import subprocess
import flask
import threading
import requests
import matplotlib.pyplot as graph
import pymongo
from badwordsfile import *
import difflib
from fuzzywuzzy import fuzz
import unidecode
import os

from discordpy_slash.slash import *
import anvil.server

try:
    anvil.server.connect("redacted", url="wss://redacted")

except ConnectionRefusedError as error:
    print(error)

database = pymongo.MongoClient("mongodb://192.168.1.146:27017")["badwordblocker"]

def add(collection, key, value, ID):
    collection.insert_one({"_id" : str(ID), key : value})

def remove(collection, key, value, ID):
    collection.update_one({"_id" : str(ID)}, {"$pull" : {key : value}})

def find(collection, ID):
    return collection.find_one({"_id" : str(ID)})

def update(collection, key, value, ID):
    collection.update_one({"_id" : str(ID)}, {"$push" : {key : value}})

def delete(collection, ID):
    collection.delete_one({"_id" : str(ID)})

def modify(collection, key, value, ID):
    collection.update_one({"_id" : str(ID)}, {"$set" : {key : value}})


dm_log = {}

votes = []

guild_count = 0

votes_leaderboard = {}

logchannels = database["logchannels"]

voted_users = []

strikes = database["strikes"]

when_to_delete_bad_word_blocked_message = database["when_to_delete_the_bad_word_blocked_message"]

bugs = database["bugs"]

amount_of_strikes = database["amount_of_strikes"]

custom_bad_words = database["custom_bad_words"]

timed_member_mutes = database["timed_member_mutes"]

logs = database["logs"]

custom_bad_links = database["custom_bad_links"]

login = {}

passwords = database["passwords"]

messages = database["messages"]

advertising = database["advertising"]

actions = database["actions"]

sensitivities = database["sensitivities"]

bypasses = database["bypasses"]

suggestions = database["suggestions"]

ignores = database["ignores"]

muted_member_times = database["muted_member_times"]

embeds = database["embeds"]

prefixes = database["prefixes"]


verification_channels = database["verification_channels"]

muted_roles = database["muted_roles"]

server_analytics = database["server_analytics"]


punishments = database["punishments"]

security_codes = {}

months = {1 : "January", 2 : "Feburary", 3 : "March", 4 : "April", 5 : "May", 6 : "June", 7 : "July", 8 : "August", 9 : "September", 10 : "October", 11 : "November", 12 : "December"}

similar_characters = {
    "!" : "i",
    "1" : "i",
    "@" : "a",
    "$" : "s",

}



bypass_characters = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "{", "[", "}", "]", "\\", "|", ":", ";", "\"", "'", "<", ",", ">", ".", "?", "/"]


overlapping_characters = ["!", "@", "$", "?"]

started = False




def sanatize_restructure(string):
    string = string.lower()
    sanatized_string = []
    check = []

    for x in string:
        if x in bypass_characters:
            continue
        sanatized_string.append(x)
    
    sanatized_string = "".join(sanatized_string)
    sanatized_string = sanatized_string.split(" ")
    for w in sanatized_string:
        check.append(w)

    replace_string = []
   

    for x in string:
        if x in bypass_characters and x not in overlapping_characters:
            continue
        replace_string.append(x)

    

    for n, t in enumerate(replace_string):
        for k, v in similar_characters.items():
            if k == t:
                replace_string[n] = v
    
    replace_string = "".join(replace_string)
    replace_string = replace_string.split(" ")
    for x in replace_string:
        check.append(x)
    
    


    for n in string.split(" "):
        check.append(n)

    return check



def check_if_message_is_bad_or_not(message, badwordlist):
    global sensitivities
    bad_message = False
    bad_word = None
    if find(sensitivities, message.guild.id) == None:
        sanatized = sanatize_restructure(message.content)
        for x in badwordlist:
            if x in sanatized:
                bad_message = True
                bad_word = x
                if find(messages, message.author.id) == None:
                    add(messages, "last_blocked_message", "", message.author.id)
                clean_message = []
                for w in message.content:
                    if w == ",":
                        continue
                    clean_message.append(w)
                clean_message = "".join(clean_message)
                modify(messages, "last_blocked_message", f"{clean_message},{x},m,{message.created_at}", message.author.id)

    if find(sensitivities, message.guild.id) != None:
        for x in badwordlist:
            if fuzz.ratio(x, message.content) > find(sensitivities, message.guild.id)["the_servers_sensitivity"]:
                bad_message = True
                bad_word = x
                if find(messages, message.author.id) == None:
                    add(messages, "last_blocked_message", "", message.author.id)
                clean_message = []
                for w in message.content:
                    if w == ",":
                        continue
                    clean_message.append(w)
                clean_message = "".join(clean_message)
                modify(messages, "last_blocked_message", f"{clean_message},{x},m,{message.created_at}", message.author.id)
    
    if bad_message:
        try:
            todays_date = datetime.date.today()
            today_in_existing_data = False
            if find(server_analytics, message.guild.id) == None:
                add(server_analytics, "analytics", {"messages_deleted" : 0, "most_blocked_word" : {}, "day_by_day_analytics" : [], "words_blocked_channel_ids" : {}}, message.guild.id)
            existing_analytics = find(server_analytics, message.guild.id)["analytics"]
            existing_analytics["messages_deleted"] += 1
            try:
                existing_analytics["most_blocked_word"][bad_word] += 1
            except KeyError:
                existing_analytics["most_blocked_word"][bad_word] = 1
            try:
                existing_analytics["words_blocked_channel_ids"][str(message.channel.id)] += 1
            except KeyError:
                existing_analytics["words_blocked_channel_ids"][str(message.channel.id)] = 1
            for x in existing_analytics["day_by_day_analytics"]:
                if x["date"] == f"{months[todays_date.month]} {todays_date.day}, {todays_date.year}":
                    x["blocked_messages"] += 1
                    today_in_existing_data = True
            
            if today_in_existing_data == False:
                todays_data = {"date" : f"{months[todays_date.month]} {todays_date.day}, {todays_date.year}", "blocked_messages" : 0}
                todays_data["blocked_messages"] += 1
                existing_analytics["day_by_day_analytics"].append(todays_data)


            modify(server_analytics, "analytics", existing_analytics, message.guild.id)


        except Exception as error:
            if message.guild.id == 722594194513723987:
                raise error

    return bad_message


async def mute_member(member, muted_role, channel, dm=None, hours=None):
    global timed_member_mutes
    global muted_roles
    success = False
    try:
        muted_role = client.get_guild(member.guild.id).get_role(int(muted_role["role_id"]))
        muted_role.name
    except (TypeError, AttributeError):
        if channel.permissions_for(member).manage_roles:
            await channel.send("There is no muted role setup. If you have an existing role you use for mutes, please @mention it. If you don't have an existing muted role, you can say `create` and the bot will create one for you. Please respond in 30 seconds.")
            def check(m):
                if channel.id == m.channel.id:
                    if m.channel.permissions_for(m.author).manage_roles:
                        if len(m.role_mentions) == 1 or m.content.lower() == "create":
                            return True
            try:
                response = await client.wait_for("message", check=check, timeout=30.0)
            except asyncio.TimeoutError:
                await channel.send("You did not respond in 30 seconds, canceled.")
                return
            if response.content.lower() == "create":
                await channel.send("Please wait, this can take a while depending on how many channels you have.")
                muted_role = await member.guild.create_role(name="muted")
                send_messages_overwrite = discord.PermissionOverwrite()
                send_messages_overwrite.send_messages = False
                for channels in muted_role.guild.channels:
                    await channels.set_permissions(muted_role, overwrite=send_messages_overwrite)
            if len(response.role_mentions) == 1:
                muted_role = response.role_mentions[0]
            
            if find(muted_roles, channel.guild.id) != None:
                delete(muted_roles, channel.guild.id)
            add(muted_roles, "role_id", muted_role.id, muted_role.guild.id)

            await channel.send("Role set!")
        
    if find(muted_member_times, channel.guild.id) == None:
        def mute_time_amount_check(m):
            if channel.id == m.channel.id:
                if m.channel.permissions_for(m.author).manage_roles:
                    try:
                        int(m.content)
                        return True
                    except:
                        pass
        if channel.permissions_for(member).manage_roles:
            await channel.send("You do not have a mute timer set. If you want a muted member to be unmuted after a certain amount of time, please say the amount of hours the bot should wait before unmuting. If you want a muted member to be muted until someone manually unmutes them, say `-1`. Please respond in 30 seconds.")
            try:
                response = await client.wait_for("message", check=mute_time_amount_check, timeout=30.0)
            except asyncio.TimeoutError:
                await channel.send("You did not respond in 30 seconds, canceled.")
                return
            add(muted_member_times, "time_of_mute", response.content, channel.guild.id)
            await channel.send("Set!")
    try:
        if muted_role == None:
            await channel.send("Please set up a muted role with `bwb-mutedrole`, then try again.")
            return
        await member.add_roles(muted_role)
        success = True
    except Exception as error:
        raise error
    if dm != None:
        try:
            member.send(dm)
        except:
            pass
    
    if hours != None:
        try:
            hours = hours["time_of_mute"]
        except TypeError:
            pass
        
        if find(timed_member_mutes, muted_role.guild.id) == None:
            add(timed_member_mutes, "Muted", [], muted_role.guild.id)

        update(timed_member_mutes, "Mutes", (datetime.datetime.now() + datetime.timedelta(hours=int(hours))).strftime("%y:%B:%a:%I") + f" {member.id}", muted_role.guild.id)

    return success


def get_strikes(the_member, guild):
    global strikes
    try:
        return find(strikes, guild.id)["strikes"][str(the_member.id)]
    except (KeyError, TypeError):
        if find(strikes, guild.id) == None:
            add(strikes, "strikes", {}, guild.id)
        return None

def add_strikes(member, guild, amount):
    global strikes
    try:
        guild_dict = find(strikes, guild.id)["strikes"]
    except TypeError:
        add(strikes, "strikes", {}, guild.id)
        guild_dict = find(strikes, guild.id)["strikes"]
    try:
        guild_dict[str(member.id)] += amount
        modify(strikes, "strikes", guild_dict, guild.id)
    except KeyError:
        guild_dict[str(member.id)] = amount
        modify(strikes, "strikes", guild_dict, guild.id)


def delete_strikes(member, guild):
    global strikes
    try:
        t = find(strikes, guild.id)["strikes"]
    except TypeError:
        return
    try:
        del t[str(member.id)]
    except:
        return
    modify(strikes, "strikes", t, guild.id)



def get_guild_strikes(guild):
    global amount_of_strikes
    try:
        return find(amount_of_strikes, guild.id)["Amount"]
    except TypeError:
        return None


def add_punishment(guild, name, amount):
    global punishments
    if find(punishments, guild.id) == None:
        add(punishments, "punishments", {}, guild.id)
    guild_punishments = find(punishments, guild.id)
    if guild_punishments == None:
        return
    the_punishments = guild_punishments["punishments"]
    the_punishments[amount] = name
    modify(punishments, "punishments", the_punishments, guild.id)


def remove_punishment(guild, action, amount):
    remove_items = []
    global punishments
    guild_punishments = find(punishments, guild.id)
    removed_item = False
    if guild_punishments == None:
        return
    punishments_before = guild_punishments["punishments"]
    punishments_after = guild_punishments["punishments"]
    for k, v in punishments_before.items():
        if v == action and k == str(amount):
            remove_items.append(k)
            removed_item = True
    for x in remove_items:
        del punishments_after[x]
    modify(punishments, "punishments", punishments_after, guild.id)
    return removed_item
                

def get_punishment(member, guild):
    global punishments
    guild_punishments = find(punishments, guild.id)
    if guild_punishments == None:
        return
    for k, v in guild_punishments["punishments"].items():
        if int(k) <= get_strikes(member, guild):
            return v
    

async def voted(ctx):
    global voted_users
    if ctx.author.id not in voted_users:
        await ctx.send(":x: You need to vote to use this command! Please run `bwb-vote` and vote using the link supplied.")
        return False
    return True


@anvil.server.callable()
def get_user_guilds(user_id):
    
    guild_list = []
    for x in client.get_all_members():
        if x.id == int(user_id):
            if x.guild_permissions.manage_messages == True:
                guild_list.append({"guild_name" : x.guild.name, "guild_icon" : str(x.guild.icon_url), "guild_id" : x.guild.id})
    return guild_list




@anvil.server.callable()
def get_the_guild_info(guild_id):
    global strikes
    global when_to_delete_bad_word_blocked_message
    global amount_of_strikes
    global custom_bad_words
    global actions
    global bypasses
    global ignores
    global prefixes
    global sensitivities
    global muted_roles
    global logchannels
    global guild_count
    global embeds
    the_guild = client.get_guild(int(guild_id))
    
    channel_info = []
    role_info = []
    ignores_info = []
    if the_guild == None:
        return None
    for x in the_guild.channels:
        if isinstance(x, discord.TextChannel):
            channel_info.append((x.name, x.id))
    for t in the_guild.roles:
        role_info.append((t.name, t.id))
    try:
        for n in find(ignores, the_guild.id)["channels"]:
            ignores_info.append((client.get_channel(int(n)).name, int(n)))
    except TypeError:
        pass
    



    guild_bypasses = find(bypasses, guild_id)

    guild_strikes = find(strikes, guild_id)

    bypass_list = []

    strikes_list = []

    

    if guild_bypasses != None:
        for t in guild_bypasses["users"]:
            user = client.get_user(int(t))
            if user == None:
                continue
            bypass_list.append((f"{user.name}#{user.discriminator}", int(t)))
    if guild_strikes != None:
        for n in guild_strikes["strikes"]:
            print(n)
            guild = client.get_guild(int(guild_id))
            member = guild.get_member(int(n))
            if member == None:
                continue
            strikes_list.append((f"{member.name}#{member.discriminator}", get_strikes(member, guild), n))
        

    
    
    return {"strikes" : strikes_list, "when_to_delete_bad_word_blocked_message" : find(when_to_delete_bad_word_blocked_message, the_guild.id), "punishments" : find(punishments, the_guild.id), "badwordlist" : find(custom_bad_words, the_guild.id), "bypasses" : bypass_list, "ignores" : ignores_info, "prefix" : find(prefixes, the_guild.id), "sensitivity" : find(sensitivities, the_guild.id), "muted_role" : find(muted_roles, the_guild.id), "logchannel" : find(logchannels, the_guild.id), "channels" : channel_info, "roles" : role_info, "embed" : find(embeds, the_guild.id)}
    

@anvil.server.callable()
def update_badwordlist(guild_id, badwordlist):
    global custom_bad_words
    modify(custom_bad_words, "badwordlist", badwordlist, int(guild_id))








@anvil.server.callable()
def update_the_server_settings(guild_info):
    global strikes
    global when_to_delete_bad_word_blocked_message
    global amount_of_strikes
    global custom_bad_words
    global actions
    global bypasses
    global ignores
    global prefixes
    global sensitivities
    global muted_roles
    global logchannels
    global embeds
    global guild_count

    the_prefix = str(guild_info["prefix"]["prefix"])
    logchannel = guild_info["logchannel"]["Channel"]
    deleteafter = guild_info["when_to_delete_bad_word_blocked_message"]["Seconds"]
    the_limit = guild_info["amount_of_strikes"]["Amount"]
    the_sensitivity = guild_info["sensitivity"]["the_servers_sensitivity"]
    action = guild_info["action"]["what_to_do"]
    if the_limit != None:
        the_limit = int(the_limit)
    if the_sensitivity != None:
        the_sensitivity = int(the_sensitivity)
    muted_role = guild_info["muted_role"]["role_id"]
    the_ignores = guild_info["ignores"]["channels"]
    the_embed = guild_info["embed"]["the_server_option"]
    guild_id = int(guild_info["id"])
    if find(prefixes, guild_id) == None:
        add(prefixes, "prefix", "", guild_id)
    modify(prefixes, "prefix", the_prefix, guild_id)
    
    if logchannel == None:
        delete(logchannels, guild_id)
    if logchannel != None:
        if find(logchannels, guild_id) == None:
            add(logchannels, "Channel", "", guild_id)
        modify(logchannels, "Channel", logchannel, guild_id)
    
    if deleteafter == None:
        delete(when_to_delete_bad_word_blocked_message, guild_id)
    if deleteafter != None:
        if find(when_to_delete_bad_word_blocked_message, guild_id) == None:
            add(when_to_delete_bad_word_blocked_message, "Seconds", "", guild_id)
        modify(when_to_delete_bad_word_blocked_message, "Seconds", deleteafter, guild_id)
    
    if the_limit == None:
        delete(amount_of_strikes, guild_id)
    if the_limit != None:
        if find(amount_of_strikes, guild_id) == None:
            add(amount_of_strikes, "Amount", "", guild_id)
        modify(amount_of_strikes, "Amount", the_limit, guild_id)

    if action == None:
        delete(actions, guild_id)
    if action != None:
        if find(actions, guild_id) == None:
            add(actions, "what_to_do", "", guild_id)
        modify(actions, "what_to_do", action, guild_id)
    
    if the_sensitivity == None:
        delete(sensitivities, guild_id)
    if the_sensitivity != None:
        if find(sensitivities, guild_id) == None:
            add(sensitivities, "the_servers_sensitivity", "", guild_id)
        modify(sensitivities, "the_servers_sensitivity", the_sensitivity, guild_id)

    if muted_role == None:
        delete(muted_roles, guild_id)
    if muted_role != None:
        if find(muted_roles, guild_id) == None:
            add(muted_roles, "role_id", "", guild_id)
        modify(muted_roles, "role_id", muted_role, guild_id)
    if find(prefixes, guild_id) == None:
        add(prefixes, "prefix", "", guild_id)
    if find(ignores, guild_id) == None:
        add(ignores, "channels", "", guild_id)
    modify(ignores, "channels", the_ignores, guild_id)
    print(the_embed)

    if the_embed == None:
        delete(embeds, guild_id)
    if the_embed != None:
        if find(embeds, guild_id) == None:
            add(embeds, "the_server_option", "", guild_id)
        modify(embeds, "the_server_option", the_embed.lower(), guild_id)

    
@anvil.server.callable()
def get_default_word_list():
    return badwords


@anvil.server.callable()
def update_user_management_info(info):
    global strikes
    global bypasses

    guild_id = int(info["id"])
    user_strikes = info["strikes"]
    user_bypasses = info["bypasses"]


    bypassing_users = []
    strike_users = []
    guild_strikes = find(strikes, guild_id)["strikes"]
    guild_strikes.clear()
    for x in user_bypasses:
        bypassing_users.append(int(x[1]))
    for n in user_strikes:
        guild_strikes[str(n[2])] = int(n[1])
    modify(strikes, "strikes", guild_strikes, guild_id)
    modify(bypasses, "users", bypassing_users, guild_id)

@anvil.server.callable()
def get_member_info(guild_info, member_info):
    the_guild = client.get_guild(int(guild_info["id"]))
    if the_guild == None:
        return None
    for x in the_guild.members:
        if f"{x.name}#{x.discriminator}" == member_info:
            return (member_info, x.id)
    return None

@anvil.server.callable()
def code_info(user_id, code, t):
    global security_codes
    if t == "check":
        try:
            return security_codes[str(user_id)] == code
        except KeyError:
            return False
       
    if t == "add":
        security_codes[str(user_id)] = code
        

@tasks.loop()
async def s():
    await client.logout()



def start_web_dashboard():
    global login
    app = flask.Flask(__name__)

    user = None

    allowed_guilds = []

    @app.route("/", methods=["GET"])
    def hi():
        admin = False
        global user
        global allowed_guilds
        if len(flask.request.args) == 0:
            return flask.render_template("page.html")
        try:
            response = requests.post(f"redacted", data={"client_id" : "redacted", "client_secret" : "redacted", "grant_type" : "refresh_token", "refresh_token" : login[flask.request.remote_addr], "redirect_uri" : "http://badwordblocker.systems/", "scope" : "identify"}).json()
        except KeyError:
            response = requests.post(f"https://discord.com/api/oauth2/token", data={"client_id" : "redacted", "client_secret" : "redacted", "grant_type" : "authorization_code", "code" : flask.request.args["code"], "redirect_uri" : "http://badwordblocker.systems/", "scope" : "identify"}).json()
        print(response)
        try:
            login[flask.request.remote_addr] = response["refresh_token"]
        except KeyError:
            return flask.redirect("redacted")
        user = requests.get(f"https://discord.com/api/users/@me", headers={"Authorization" : f"Bearer {response['access_token']}"}).json()
        return flask.render_template("start.html", admin=admin, user=user["id"])


    @app.route("/step1", methods=["GET", "POST"])
    def step1():
        admin = False
        if int(flask.request.form["user"]) == 639261959694319626 or int(flask.request.form["user"]) == 722731755261526016 or int(flask.request.form["user"]) == 527658121959571466 or int(flask.request.form["user"]) == 581965693130506263 or int(flask.request.form["user"]) == 724968125359063061:
            admin = True 
        return flask.render_template("step1.html", admin=admin, user=flask.request.form["user"])


    @app.route("/step2", methods=["GET", "POST"])
    def step2():
        if "action" not in flask.request.form:
            return ""
        manage_messages_needed = False
        manage_roles_needed = False
        guilds = []
        if flask.request.form["action"] == "addbadword":
            manage_messages_needed = True
        if flask.request.form["action"] == "removebadword":
            manage_messages_needed = True
        if flask.request.form["action"] == "setloggingchannel":
            manage_messages_needed = True
        if flask.request.form["action"] == "removeloggingchannel":
            manage_messages_needed = True
        if flask.request.form["action"] == "enabledeletemessages":
            manage_messages_needed = True
        if flask.request.form["action"] == "disabledeletemessages":
            manage_messages_needed = True
        if flask.request.form["action"] == "setstrikeamount":
            manage_roles_needed = True
        if flask.request.form["action"] == "addbadlink":
            manage_messages_needed = True
        if flask.request.form["action"] == "removebadlink":
            manage_messages_needed = True
        if flask.request.form["action"] == "logout":
            return flask.redirect("http://badwordblocker.systems/logout")
        if flask.request.form["action"] == "joindiscordserver":
            return flask.redirect("https://discord.gg/hzrauvY")

        for x in client.guilds:
            for m in x.members:
                if m.bot == True:
                    continue
                try:
                    if m.id == int(flask.request.form["user"]):
                        if manage_messages_needed == True:
                            if m.guild_permissions.manage_messages == True:
                                guilds.append(x)
                        if manage_roles_needed == True:
                            if m.guild_permissions.manage_roles == True:
                                guilds.append(x)
                except Exception as e:
                    continue

        return flask.render_template("step2.html", user=flask.request.form["user"], guilds=guilds, action=flask.request.form["action"])

    @app.route("/step3", methods=["GET", "POST"])
    def step3():
        form = flask.request.form
        if "action" not in form.keys() or "user" not in form.keys():
            return ""
        return flask.render_template("step3.html", action=form["action"], user=form["user"], server=form["server"])

    @app.route("/verify", methods=["GET", "POST"])
    def verify():
        global user
        global custom_bad_words
        global custom_bad_links
        global when_to_delete_bad_word_blocked_message
        global amount_of_strikes
        form = flask.request.form
        if "server" not in flask.request.form or "action" not in flask.request.form or "text" not in flask.request.form:
            return ""
        member = client.get_guild(int(flask.request.form["server"])).get_member(int(flask.request.form["user"]))
        if flask.request.form["action"] == "addbadword":
            if flask.request.form["text"].strip(" ") == "":
                return "You need to give a bad word you want to add! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            update(custom_bad_words, "badwordlist", form["text"], int(form["server"]))
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "removebadword":
            if flask.request.form["text"].strip(" ") == "":
                return "Please give a bad word you want to remove!"
            remove(custom_bad_words, "badwordlist", form["text"], int(form["server"]))
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "setloggingchannel":
            if flask.request.form["text"].strip(" ") == "":
                return "You need to give a the name of the channel you want the bot to send logs in! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            for x in client.guilds:
                if x.id == int(form["server"]):
                    for c in x.channels:
                        if c.name == form["text"].strip(" "):
                            add(logchannels, "Channel", c.id, int(form["server"]))
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "removeloggingchannel":
            if flask.request.form["text"].strip(" ") == "":
                return "You need to give a bad word you want to add! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            for x in client.guilds:
                if x.id == int(form["server"]):
                    for c in x.channels:
                        try:
                            delete(logchannels, int(form["server"]))
                        except KeyError:
                            return "It looks like you didn't already have a logging channel set. To go back, press the back button on your browser. Using bot commands are more reliable than this interface."
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "enabledeletemessages":
            if flask.request.form["text"].strip(" ") == "":
                return "You need to give the number of seconds you want the bot to delete its messages after! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            try:
                add(when_to_delete_bad_word_blocked_message, "Seconds", float(form["text"].strip(" ")), int(form["server"]))
            except ValueError:
                return "Thats not a number, go back by pressing the back button on your browser."
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "disabledeletemessages":
            try:
                delete(when_to_delete_bad_word_blocked_message, int(form["server"]))
            except KeyError:
                return "You did not already set a logging channel, go back by pressing the back button on your browser."
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "setstrikeamount":
            if flask.request.form["text"].strip(" ") == "":
                return "You need to give a number of strikes until a member gets muted on your server! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            try:
                if find(amount_of_strikes, int(form["server"])) != None:
                    delete(amount_of_strikes, int(form["server"]))
                if int(form["text"].strip(" ")) == 0:
                    delete(amount_of_strikes, int(form["server"]))
                    return flask.render_template("successful.html", user=form["user"])

                add(amount_of_strikes, "Amount", int(form["text"].strip(" ")), int(form["server"]))

            except ValueError:
                return "Thats not a number, to go back, press the back button on your browser."
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "addbadlink":
            if flask.request.form["text"] == "":
                return "You need to give a link! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            if find(custom_bad_links, int(form["server"])) == None:
                add(custom_bad_links, "Links", [], int(form["server"]))
                update(custom_bad_links, "Links", form["text"], int(form["server"]))
            return flask.render_template("successful.html", user=form["user"])
        if flask.request.form["action"] == "removebadlink":
            if flask.request.form["text"] == "":
                return "You need to give a bad link you want to remove! You can go back by pressing the back button on your browser. Using bot commands are more reliable than this interface."
            if find(custom_bad_links, int(form["server"])) == None:
                add(custom_bad_links, "Links", [], int(form["server"]))
            remove(custom_bad_links, "Links", form["text"], int(form["server"]))
            return flask.render_template("successful.html", user=form["user"])

    @app.route("/badwordlist", methods=["GET", "POST"])
    def badwordlist():
        global custom_bad_words
        if "password" not in flask.request.args.keys() or "guild" not in flask.request.args.keys():
            return "Get the link from running the command 'bwb-badwordlist' please."
        global passwords
        password = find(passwords, flask.request.args["guild"])
        if password == None:
            return "Please get a link by running the 'bwb-badwordlist' command."
        if password["the_servers_password"] != flask.request.args["password"]:
            return "That is not the correct password."
        try:
            return flask.render_template("badwordlist.html", name=client.get_guild(int(flask.request.args["guild"])).name, words=find(custom_bad_words, int(flask.request.args["guild"]))["badwordlist"])
        except KeyError as error:
            return flask.render_template("badwordlist.html", name=client.get_guild(int(flask.request.args["guild"])).name, words=[])

    @app.route("/logout")
    def logout():
        global login
        try:
            del login[flask.request.remote_addr]
        except KeyError:
            pass
        return "You were logged out. You can login again by going to http://badwordblocker.systems. Thanks for using Bad Word Blocker!"
    
    @app.route("/shutdown", methods=["GET", "POST"])
    def shutdown():
        global s
        if "Gm~Aw][6cZ*T/S$a`DYXA>nv;P[Jx{e)atGE'g}m(g3@bAf,X6H`4sv&3SLr6[6'-Ekwc9U6KzF:3rb," in flask.request.form.values():
            print("An admin shut the bot down.")
            s.start()
            return "Bad Word Blocker was turned off."

    @app.route("/invite")
    def invite_for_bot():
        return flask.redirect("https://discord.com/api/oauth2/authorize?client_id=657776310491545620&permissions=8&redirect_uri=http%3A%2F%2Fbadwordblocker.systems%2F&scope=bot")

    @app.route("/dashboard")
    def dashboard():
        return flask.redirect("https://discord.com/api/oauth2/authorize?client_id=657776310491545620&redirect_uri=http%3A%2F%2Fbadwordblocker.systems%2F&response_type=code&scope=identify")

    app.run(host="0.0.0.0", port="80")


website = threading.Thread(target=start_web_dashboard, daemon=True)





@tasks.loop(minutes=1)
async def get_voters():
    global votes_leaderboard
    global voters
    global voted_users
    try:
        async with aiohttp.ClientSession() as client_session:
            async with client_session.get("https://top.gg/api/bots/657776310491545620/votes", headers={"Authorization" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1Nzc3NjMxMDQ5MTU0NTYyMCIsImJvdCI6dHJ1ZSwiaWF0IjoxNTkzMTk2MjE3fQ.xpO1VHsReVPoKiSjwzb5_NpnA9YvJI9f9BK6CoIvmLQ"}) as response:
                voted_users.clear()
                for voter in json.loads(await response.text()):
                    member_id = int(voter["id"])
                    
                    voted_users.append(member_id)
                    
                    try:
                        role = client.get_guild(722594194513723987).get_role(725942963632472116)
                    except AttributeError:
                        return
                    
                    guild = await client.fetch_guild(722594194513723987)

                    try:
                        await guild.get_member(member_id).add_roles(role)
                    except:
                        pass
    


    except Exception as error:
        if not isinstance(error, json.decoder.JSONDecodeError):
            traceback.print_exc()

@tasks.loop(minutes=10)
async def post_bot_guild_count():
    global guild_count
    guild_count = 0
    for x in client.guilds:
        guild_count += 1
    x = []
    y = []
    async with aiohttp.ClientSession() as client_session:
        async with client_session.post("https://top.gg/api/bots/657776310491545620/stats", json={"server_count" : guild_count}, headers={"Authorization" : "redactedA9YvJI9f9BK6CoIvmLQ"}) as response:
            if response.status == 200:
                print("Posted server count to top.gg")
            if response.status != 200:
                print("Could not post server count to top.gg")

def get_the_guild_prefix(client, message):
    global prefixes
    the_prefixes = []
    the_prefixes.append("bwb-")
    the_prefix = find(prefixes, message.guild.id)
    if the_prefix != None:
        the_prefixes.append(the_prefix["prefix"])
    return the_prefixes


@tasks.loop(seconds=1)
async def check_muted_members():
    global timed_member_mutes
    global muted_roles
    try:
        for x in timed_member_mutes.find({}):
            for m in x["Mutes"]:
                has_role = False
                if m.split(" ")[0] == datetime.datetime.now().strftime("%y:%B:%a:%I"):
                    guild = await client.fetch_guild(int(x["_id"]))
                    try:
                        member = await guild.fetch_member(int(m.split(" ")[1]))
                    except AttributeError:
                        remove(timed_member_mutes, "Mutes", m, x["_id"])
                        continue
                    if not member:
                        remove(timed_member_mutes, "Mutes", m, x["_id"])
                        continue
                    roles = await guild.fetch_roles()
                    muted_role = find(muted_roles, guild.id)
                    if muted_role == None:
                        remove(timed_member_mutes, "Mutes", m, x["_id"])
                        continue
                    for m in roles:
                        if m.id == int(muted_role["role_id"]):
                            has_role = True
                            break
                    if has_role == False:
                        remove(timed_member_mutes, "Mutes", m, x["_id"])
                        continue
                    await member.remove_roles(discord.utils.get(roles, id=int(muted_role["role_id"])))
                    embed = discord.Embed(title="Unmuted", description=f"You've been unmuted", color=3066993)
                    embed.add_field(name="Moderator", value="Bad Word Blocker")
                    embed.add_field(name="Time of Unmute", value=datetime.datetime.now())
                    embed.add_field(name="Reason", value="Time finished!")
                    await member.send(embed=embed)
                    remove(timed_member_mutes, "Mutes", m, x["_id"])
                    if find(verification_channels, guild.id) == None:
                        continue
                    try:
                        member.add_roles(discord.utils.get(guild.roles, name="Verified"))
                    except:
                        pass

            break

    except Exception as error:
        await client.get_channel(732308010248044725).send(f"{error}")


intents = discord.Intents.default()
intents.members = True


client = commands.AutoShardedBot(command_prefix = get_the_guild_prefix, intents=intents)

number_of_bad_words_blocked = 0

guild_count = 0

status = None

client.remove_command("help")





@client.event
async def on_ready():
    for x in client.get_all_members(): 
        for t in x.roles:
            if t.id in [784963936445399091, 846174565931417660, 821182947888463912]:
                if find(bypasses, x.guild.id) == None:
                    add(bypasses, "users", [], x.guild.id)
                update(bypasses, "users", x.id, x.guild.id)
    print("Done")
    post_bot_guild_count.start()
    status = cycle(["Blocking Bad Words", "Please use the 'bwb-vote' command if you would like to support this bot", f"in {guild_count} servers"])
    change_status.start()


async def slash_error(context, error):
    global prefixes
    if isinstance(error, discord.errors.Forbidden):
        await context.send(str(error))
    if not isinstance(error, discord.errors.Forbidden):
        await context.send(f"Please use the `bwb-` prefix to use this command")
        raise error

@client.event
async def on_command_error(ctx, error):

    if isinstance(error, CheckFailure):
        return

    if isinstance(error, CommandNotFound):
        commands = []
        for x in client.commands:
            commands.append(x.name)

            for t in x.aliases:
                commands.append(t)

        matches = difflib.get_close_matches(ctx.message.content.strip(get_the_guild_prefix(client, ctx.message)), commands)
        try:
            await ctx.send(f":x: Thats not a command! You can find all commands at <https://top.gg/bot/657776310491545620>. Did you mean `bwb-{matches[0]}`? The current prefix for this server is `{get_the_guild_prefix(client, ctx.message)}`.")
        except IndexError:
            await ctx.send(f":x: Thats not a command! You can find all commands at <https://top.gg/bot/657776310491545620>. The command you ran isn't similar to any commands the bot already has. The current prefix for this server is `{get_the_guild_prefix(client, ctx.message)}`.")
    if not isinstance(error, (CommandNotFound, Forbidden)):
        channel = client.get_channel(845094995895255081)
        await channel.send(f"Error in command {ctx.command.name}: {error}")
        await ctx.send(f"Full error: {error}")
        raise error


@tasks.loop(seconds=60)
async def change_status():
    global status
    await client.change_presence(status=discord.Status.online, activity=discord.Game(next(status)))

@client.event
async def on_command(ctx):
    global logs
    update(logs, "Logs", f"{ctx.command.name}#{ctx.author.discriminator} {ctx.args}", ctx.guild.id)

@check_muted_members.error
async def check_muted_members_error():
    global check_muted_members
    check_muted_members.start()

@client.event
async def on_guild_remove(guild):
    global logs
    global custom_bad_words
    delete(custom_bad_words, guild.id)
    await client.get_channel(735259395134586982).send(f"Left server '{guild.name}'")


@client.event
async def on_disconnect():
    global logchannels
    global strikes
    global when_to_delete_bad_word_blocked_message
    global bugs
    global amount_of_strikes
    global custom_bad_words
    global timed_member_mutes
    get_voters.stop()
    post_bot_guild_count.stop()
    change_status.stop()
    check_muted_members.stop()


@client.event
async def on_guild_join(guild):
    global custom_bad_words
    embed = discord.Embed(title="Thanks for inviting me!", description="Bad Word Blocker keeps your server clean by deleting messages that contain bad words in them.", color=3447003)
    embed.add_field(name="Commands", value="Commands can be found at https://top.gg/bot/657776310491545620", inline=False)
    embed.add_field(name="Review", value="You can leave a review for the bot at https://top.gg/bot/657776310491545620#reviews", inline=False)
    embed.add_field(name="Server", value="Please join the Bad Word Blocker server with the link above!", inline=False)
    for channels in guild.text_channels:
        try:
            await channels.send("https://discord.gg/hzrauvY", embed=embed)
            break
        except discord.errors.Forbidden:
            continue



    add(custom_bad_words, "badwordlist", [], guild.id)

    for x in badwords:
        update(custom_bad_words, "badwordlist", x, guild.id)

    await client.get_channel(735259395134586982).send(f"Joined server '{guild.name}'")

@client.event
async def on_raw_reaction_add(payload):
    if payload.member.bot == True:
        return
    if find(verification_channels, payload.guild_id) != None:
        if payload.emoji.name == "✅":
            t = "abcdefghijklmnopqrstuvwqyz".upper()
            l = []
            for x in t:
                l.append(x)
            code = random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l)
            def check(m):
                return code in m.content and m.author.id == payload.member.id and payload.member.bot == False
            role = discord.utils.get(client.get_guild(payload.guild_id).roles, name="Verified")
            message = await client.get_channel(payload.channel_id).send(f"Hey there {payload.member.mention}! Please send this code in this channel: **{code}**. You have 5 minutes to do this before you are kicked.")
            m = await client.get_channel(payload.channel_id).fetch_message(payload.message_id)
            try:
                c = await client.wait_for("message", check=check, timeout=300.0)
            except asyncio.TimeoutError:
                await payload.member.kick()
                await message.delete()
                await m.remove_reaction("✅", payload.member)

                await m.delete()
                return

            await payload.member.add_roles(role)
            await message.delete()
            await c.delete()
            await m.remove_reaction("✅", payload.member)

            await m.delete()
            
@client.event
async def on_member_join(member):
    try:
        message = await discord.utils.get(member.guild.channels, id=int(find(verification_channels, member.guild.id)["channel_id"])).send(f"{member.mention}, please press the checkmark reaction below this message to begin verifying.")
        await message.add_reaction("✅")
    except TypeError:
        pass
    
    if member.guild.id == 722594194513723987:
        if str(member.created_at)[:9] == str(datetime.datetime.now())[:9]:
            await member.add_roles(member.guild.get_role(732370111595544627))
            embed = discord.Embed(title="Muted", description="Bad Word Blocker has detected that your account was created less than 24 hours ago. To protect against alts, your account is muted. You should be unmuted in 3 hours.", color=15844367)
            try:
                await member.send(embed=embed)
            except discord.errors.ClientException:
                pass
            await asyncio.sleep(10800)
            await member.remove_roles(member.guild.get_role(732370111595544627))

@client.event
async def on_member_update(before, after):
    global custom_bad_words
    if before.nick != after.nick:
        try:
            nickname_but_lower = after.nick.lower()
        except AttributeError:
            return
        filtered_text = sanatize_restructure(after.nick)
        for x in find(custom_bad_words, after.guild.id)["badwordlist"]:
            if x in filtered_text:
                await after.edit(nick=None)

@client.event
async def on_message_edit(before, after):
    global strikes
    global when_to_delete_bad_word_blocked_message
    global amount_of_strikes
    global timed_member_mutes
    global custom_bad_links
    global bypasses
    global ignores


    if after.guild == None:
        return

    try:
        for x in find(bypasses, after.guild.id)["users"]:
            if after.author.id == int(x):
                v = after
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass

    global ignores
    try:
        for x in find(ignores, after.guild.id)["channels"]:
            if x == after.channel.id:
                v = after
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass

    except KeyError:
        pass


    random_after_list = [f"{client.get_emoji(749378128396419123)} {after.author.name} made an oopsie.", f"{client.get_emoji(749376859300561056)} {after.author.name} didn't know this was an SFW server.", f"{client.get_emoji(749411285505933373)} {after.author.name} ran out of robux and said a bad word.", f"{client.get_emoji(749413348218634390)} {after.author.name} lost their house in Minecraft and said a bad word.", f"{client.get_emoji(749411896205115515)} {after.author.name} got sad because their mom said they couldn't have anymore V bucks and said a bad word.", f"{client.get_emoji(749413810137333821)} {after.author.name} was vibing to Baby Shark so much that they acccidently pressed the wrong keys and make a bad word.", f"{client.get_emoji(749414619843395654)} {after.author.name} found out they had the right answer on a test but changed it to the wrong answer and said a bad word.", f"{client.get_emoji(749385048527994942)} {after.author.name} lost their Kahoot streak and said a bad word.", f"{client.get_emoji(762357786788888627)} {after.author.name} accidentally vented in front of crewmate and said a bad word", f"{client.get_emoji(762357733663047680)} {after.author.name} was too suspicious and got voted off and said a bad word.", f"{client.get_emoji(762357846196617296)} {after.author.name} could not get a sucessful card swipe and said a bad word."]
    after_content = after.content

    if after.guild != None:
        if after.content.startswith("bwb-checkword"):
            await after.delete()
            await after.channel.send("This command can only be used in DMs.")
            return
    global custom_bad_words  
    global logchannels
    delete_bad_word_blocker_after = False
    try:
        for x in find(bypasses, after.guild.id)["users"]:
            if after.author.id == x:
                v = after
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass


    try:
        for x in find(ignores, after.guild.id)["users"]:
            if x == after.channel.id:
                v = after
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass

    except KeyError:
        pass
   
    if after.content.startswith("badwordblocker-") == True:
        await after.channel.send("Bad Word Blocker's prefix has been changed to `bwb-`!")
    try:
        if after.channel.guild.name == "Discord Bot List":
            return
    except AttributeError:
        pass
    global number_of_bad_words_blocked
    if after.author.bot == True:
        if after.channel.id == 735259395134586982:
            action = after.content.split(" ")[0]
            try:
                word = after.content.split(" ")[1]
                guild = after.content.split(" ")[2:]

                guild = " ".join(guild)
                for x in client.guilds:
                    if x.name == guild:
                        guild = x.id
            except IndexError:
                pass
            except UnboundLocalError:
                pass
            if action == "AddBadWord":
                try:
                    custom_bad_words[str(guild)].append(word)
                except KeyError:
                    custom_bad_words[str(guild)] = []
                    custom_bad_words[str(guild)].append(word)
            if action == "RemoveBadWord":
                try:
                    del custom_bad_words[str(guild)]
                except KeyError:
                    pass
            if action == "SetLoggingChannel":
                for x in client.get_guild(int(guild)).channels:
                    if x.name == word:
                        logchannels[str(guild)] = x.id
            if action == "RemoveLoggingChannel":
                del logchannels[str(guild)]
            if action == "EnableDeleteMessages":
                when_to_delete_bad_word_blocked_after[str(guild)] = float(word)
            if action == "DisableDeleteMessages":
                del when_to_delete_bad_word_blocked_after[str(guild)]
            if action == "SetStrikeAmount":
                amount_of_strikes[str(guild)] = int(word)
            if action == "AddBadLink":
                try:
                    custom_bad_links[str(guild)].append(word)
                except KeyError:
                    custom_bad_links[str(guild)] = []
                    custom_bad_links[str(guild)].append(word)

            if action == "RemoveBadLink":
                try:
                    amount_of_strikes[str(guild)].remove(word)
                except KeyError:
                    custom_bad_links[str(guild)] = []
                    custom_bad_links[str(guild)].remove(word)
            if action == "PushGitInfo":
                subprocess.call("cd .. && sudo git add * && sudo git commit -m \"Updated files\" && sudo git push", shell=True)


        return
    v = after
    v.content = v.content.lower()
    await client.process_commands(v)

    if v.content.startswith("bwb-add") and after.channel.permissions_for(after.author).manage_messages == True:
        return 

    try:
        for t in find(custom_bad_links, after.guild.id)["Links"]:
            if t in after.content:
                await after.delete()
                await after.channel.send(f"{after.author.mention} Please don't send that link!", delete_after=5)
    except TypeError:
        pass

    try:
        find(custom_bad_words, after.guild.id)["badwordlist"]
    except TypeError:
        add(custom_bad_words, "badwordlist", [], after.guild.id)
        for x in badwords:
            update(custom_bad_words, "badwordlist", x, after.guild.id)

    global sensitivities
    if check_if_message_is_bad_or_not(after, find(custom_bad_words, after.guild.id)["badwordlist"]) == True:     

        try:
            await after.delete()
            number_of_bad_words_blocked = number_of_bad_words_blocked + 1
        except Exception as err:
            if "Missing Permissions" in f"{err}":
                await after.channel.send(":warning: I do not have permission to delete bad words. I need the `Manage Messages` permission!")
                return
            if "DM channel" in f"{err}":
                await after.channel.send("I can't delete messages in a DM... Wait, why are you even DMing me bad words? :thinking:")
                return    
        
        if find(strikes, after.guild.id) == None:
            add(strikes, "strikes", {}, after.guild.id)
        add_strikes(after.author, after.guild, 1)
        
        new_strikes = get_strikes(after.author, after.guild)


        global embeds
        try:
            if find(embeds, after.guild.id)["the_server_option"] == "maximal":
                embed = discord.Embed(title="Message Deleted", description=random.choice(random_after_list), color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.set_thumbnail(url=after.author.avatar_url)
                embed.add_field(name="Strikes", value=new_strikes)
            
            if find(embeds, after.guild.id)["the_server_option"] == "balance":
                embed = discord.Embed(title="Message Deleted", description=random.choice(random_after_list), color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.add_field(name="Strikes", value=new_strikes)
            
            if find(embeds, after.guild.id)["the_server_option"] == "minimal":
                embed = discord.Embed(title="Message Deleted", color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.add_field(name="Strikes", value=new_strikes)
               
        except TypeError:
            embed = discord.Embed(title="Message Deleted", description=random.choice(random_after_list), color=15158332)
            embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
            embed.set_thumbnail(url=after.author.avatar_url)
            embed.add_field(name="Strikes", value=new_strikes)
            
            

        member_punishment = get_punishment(after.author, after.guild)
        
        if member_punishment != None:
            if new_strikes >= find(amount_of_strikes, after.guild.id)["Amount"]:
                if member_punishment == "Mute":
                    delete_strikes(after.author, after.guild)
                    await mute_member(after.author, find(muted_roles, after.guild.id), after.channel, hours=find(muted_member_times, message.guild.id))
                    muted_embed = discord.Embed(title="Member Muted", description=f"{after.author.name} has been muted", color=16776960)
                    muted_embed.add_field(name="Time of Mute", value=str(after.created_at))
                    muted_embed.add_field(name="Moderator", value="Bad Word Blocker")
                    muted_embed.add_field(name="Reason", value=f"Member received {new_strikes} strikes")
                    await after.channel.send(embed=muted_embed)
                    v = after
                    v.content = v.content.lower()
                    await client.process_commands(after)
                    return
                if member_punishment == "Kick":
                    try:
                        await after.author.kick()
                    except discord.errors.Forbidden:
                        await after.channel.send(":x: I don't have permission to kick members!")
                        return
                    embed = discord.Embed(title="Member kicked", description=f"{after.author.name} was kicked", color=1752220)
                    embed.add_field(name="Time", value=str(after.created_at))
                    embed.add_field(name="Moderator", value="Bad Word Blocker")
                    embed.add_field(name="Reason", value=f"Member received {new_strikes}")
                    await after.channel.send(embed=embed)
                    return
                
                if member_punishment == "Ban":
                    try:
                        await after.author.ban(reason="Received strike limit")
                    except discord.errors.Forbidden:
                        await after.channel.send(":x: I do not have permission to ban members!")
                        return
                    embed = discord.Embed(title="Member banned", description=f"{after.author.name} was banned", color=15158332)
                    embed.add_field(name="Moderator", value="Bad Word Blocker")
                    embed.add_field(name="Reason", value=f"Member received {new_strikes} strikes")
                    embed.add_field(name="Time of Ban", value=str(after.created_at))
                    await after.channel.send(embed=embed)
                    return


        if find(amount_of_strikes, after.guild.id) == None:
            try:
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
            except UnboundLocalError:
                pass
                    

        
        try:
            guild_logging_channel = client.get_channel(find(logchannels, after.guild.id)["Channel"])
            logging_embed_to_send = discord.Embed(title="Bad Word Blocked", description=f"{after.author.name} sent a bad word", color=15158332)
            logging_embed_to_send.add_field(name="Message", value=after.content)
            logging_embed_to_send.add_field(name="Strikes", value=str(get_strikes(after.author, after.guild)))
            logging_embed_to_send.add_field(name="Channel", value=after.channel)
            await guild_logging_channel.send(embed=logging_embed_to_send)
        except TypeError:
            pass
        except AttributeError:
            pass
        except discord.errors.HTTPException:
            pass

        try:
            await after.channel.send(embed=embed, delete_after=(find(when_to_delete_bad_word_blocked_message, after.guild.id)["Seconds"]))
        except TypeError:
            await after.channel.send(embed=embed)
        
        except UnboundLocalError:
            pass

        except Exception as er:
            if "Missing Permissions" in f"{er}":
                pass
            elif "Missing Permissions" not in f"{er}":
                print(f"{er}")



@client.event
async def on_message(message):
    global strikes
    global when_to_delete_bad_word_blocked_message
    global amount_of_strikes
    global timed_member_mutes
    global custom_bad_links
    global get_voters
    global post_bot_guild_count
    global check_muted_members
    global change_status
    global started
    global say_hi
    global prefixes
    global actions

    if not started:
        started = True
        def open_json_file(v):
            return json.load(open(f"{v}.json", "r"))
        print("Bot is online and ready to go!")
        guild_count = 0
        guilds = client.guilds
        for guild in guilds:
            print(guild.name)
            guild_count += 1
        check_muted_members.start()
        get_voters.start()
        await sync_all_commands(client, case_sensitive=False, send_hidden=False, error_function=slash_error)

    if client.user in message.mentions and "prefix" in message.content.lower():            
        try:
            await message.channel.send(f"The prefix is: `{find(prefixes, message.guild.id)['prefix']}`!")
        except TypeError:
            await message.channel.send("The prefix is: `bwb-`!")

    if message.guild == None:
        return

    random_message_list = [f"{client.get_emoji(749378128396419123)} {message.author.name} made an oopsie.", f"{client.get_emoji(749376859300561056)} {message.author.name} didn't know this was an SFW server.", f"{client.get_emoji(749411285505933373)} {message.author.name} ran out of robux and said a bad word.", f"{client.get_emoji(749413348218634390)} {message.author.name} lost their house in Minecraft and said a bad word.", f"{client.get_emoji(749411896205115515)} {message.author.name} got sad because their mom said they couldn't have anymore V bucks and said a bad word.", f"{client.get_emoji(749413810137333821)} {message.author.name} was vibing to Baby Shark so much that they acccidently pressed the wrong keys and make a bad word.", f"{client.get_emoji(749414619843395654)} {message.author.name} found out they had the right answer on a test but changed it to the wrong answer and said a bad word.", f"{client.get_emoji(749385048527994942)} {message.author.name} lost their Kahoot streak and said a bad word.", f"{client.get_emoji(762357786788888627)} {message.author.name} accidentally vented in front of crewmate and said a bad word", f"{client.get_emoji(762357733663047680)} {message.author.name} was too suspicious and got voted off and said a bad word.", f"{client.get_emoji(762357846196617296)} {message.author.name} could not get a sucessful card swipe and said a bad word."]
    message_content = message.content

    if message.guild != None:
        if message.content.startswith("bwb-checkword"):
            await message.delete()
            await message.channel.send("This command can only be used in DMs.")
            return

    global custom_bad_words  
    global logchannels
    delete_bad_word_blocker_message = False
    global bypasses
    try:
        for x in find(bypasses, message.guild.id)["users"]:
            if message.author.id == int(x):
                v = message
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass

    global ignores
    try:
        for x in find(ignores, message.guild.id)["channels"]:
            if x == message.channel.id:
                v = message
                v.content = v.content.lower()
                await client.process_commands(v)
                return
    except TypeError:
        pass

    except KeyError:
        pass

    if message.content.startswith("badwordblocker-") == True:
        await message.channel.send("Bad Word Blocker's prefix has been changed to `bwb-`!")
    try:
        if message.channel.guild.name == "Discord Bot List":
            return
    except AttributeError:
        pass
    global number_of_bad_words_blocked
    if message.author.bot == True:
        if message.channel.id == 735259395134586982:
            action = message.content.split(" ")[0]
            try:
                word = message.content.split(" ")[1]
                guild = message.content.split(" ")[2:]

                guild = " ".join(guild)
                for x in client.guilds:
                    if x.name == guild:
                        guild = x.id
            except IndexError:
                pass
            except UnboundLocalError:
                pass
            if action == "AddBadWord":
                try:
                    custom_bad_words[str(guild)].append(word)
                except KeyError:
                    custom_bad_words[str(guild)] = []
                    custom_bad_words[str(guild)].append(word)
            if action == "RemoveBadWord":
                try:
                    del custom_bad_words[str(guild)]
                except KeyError:
                    pass
            if action == "SetLoggingChannel":
                for x in client.get_guild(int(guild)).channels:
                    if x.name == word:
                        logchannels[str(guild)] = x.id
            if action == "RemoveLoggingChannel":
                del logchannels[str(guild)]
            if action == "EnableDeleteMessages":
                when_to_delete_bad_word_blocked_message[str(guild)] = float(word)
            if action == "DisableDeleteMessages":
                del when_to_delete_bad_word_blocked_message[str(guild)]
            if action == "SetStrikeAmount":
                amount_of_strikes[str(guild)] = int(word)
            if action == "AddBadLink":
                try:
                    custom_bad_links[str(guild)].append(word)
                except KeyError:
                    custom_bad_links[str(guild)] = []
                    custom_bad_links[str(guild)].append(word)

            if action == "RemoveBadLink":
                try:
                    amount_of_strikes[str(guild)].remove(word)
                except KeyError:
                    custom_bad_links[str(guild)] = []
                    custom_bad_links[str(guild)].remove(word)
            if action == "PushGitInfo":
                subprocess.call("cd .. && sudo git add * && sudo git commit -m \"Updated files\" && sudo git push", shell=True)


        return
    v = message
    v.content = v.content.lower()
    await client.process_commands(v)

    if v.content.startswith("bwb-add") and message.channel.permissions_for(message.author).manage_messages == True:
        return 

    
    try:
        for t in find(custom_bad_links, message.guild.id)["Links"]:
            if t in message.content:
                await message.delete()
                await message.channel.send(f"{message.author.mention} Please don't send that link!", delete_after=5)
    except TypeError:
        pass

    try:
        find(custom_bad_words, message.guild.id)["badwordlist"]
    except TypeError:
        add(custom_bad_words, "badwordlist", [], message.guild.id)
        for x in badwords:
            update(custom_bad_words, "badwordlist", x, message.guild.id)
    global sensitivities
    if check_if_message_is_bad_or_not(message, find(custom_bad_words, message.guild.id)["badwordlist"]) == True:
        try:
            await message.delete()
            number_of_bad_words_blocked = number_of_bad_words_blocked + 1
        except Exception as err:
            if "Missing Permissions" in f"{err}":
                await message.channel.send(":warning: I do not have permission to delete bad words. I need the `Manage Messages` permission!")
                return
            if "DM channel" in f"{err}":
                await message.channel.send("I can't delete messages in a DM... Wait, why are you even DMing me bad words? :thinking:")
                return
        
        if find(strikes, message.guild.id) == None:
            add(strikes, "strikes", {}, message.guild.id)

        add_strikes(message.author, message.guild, 1)

        new_strikes = get_strikes(message.author, message.guild)

        member_punishment = get_punishment(message.author, message.guild)

        global embeds
        try:
            if find(embeds, message.guild.id)["the_server_option"] == "maximal":
                embed = discord.Embed(title="Message Deleted", description=random.choice(random_message_list), color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.set_thumbnail(url=message.author.avatar_url)
                embed.add_field(name="Strikes", value=new_strikes)
            
            if find(embeds, message.guild.id)["the_server_option"] == "balance":
                embed = discord.Embed(title="Message Deleted", description=random.choice(random_message_list), color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.add_field(name="Strikes", value=new_strikes)
            
            if find(embeds, message.guild.id)["the_server_option"] == "minimal":
                embed = discord.Embed(title="Message Deleted", color=15158332)
                embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                embed.add_field(name="Strikes", value=new_strikes)
               
        except TypeError:
            embed = discord.Embed(title="Message Deleted", description=random.choice(random_message_list), color=15158332)
            embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
            embed.set_thumbnail(url=message.author.avatar_url)
            embed.add_field(name="Strikes", value=new_strikes)
            
            

           
        
        if member_punishment != None:

            if member_punishment != None:
                if member_punishment == "Mute":
                    delete_strikes(message.author, message.guild)
                    await mute_member(message.author, find(muted_roles, message.guild.id), message.channel, hours=find(muted_member_times, message.guild.id))
                    muted_embed = discord.Embed(title="Member Muted", description=f"{message.author.name} has been muted", color=16776960)
                    muted_embed.add_field(name="Time of Mute", value=str(message.created_at))
                    muted_embed.add_field(name="Moderator", value="Bad Word Blocker")
                    muted_embed.add_field(name="Reason", value=f"Member received {new_strikes} strikes")
                    await message.channel.send(embed=muted_embed)
                    v = message
                    v.content = v.content.lower()
                    await client.process_commands(message)
                    return
                if member_punishment == "Kick":
                    try:
                        await message.author.kick()
                    except discord.errors.Forbidden:
                        await message.channel.send(":x: I don't have permission to kick members!")
                        return
                    embed = discord.Embed(title="Member kicked", description=f"{message.author.name} was kicked", color=1752220)
                    embed.add_field(name="Time", value=str(message.created_at))
                    embed.add_field(name="Moderator", value="Bad Word Blocker")
                    embed.add_field(name="Reason", value=f"Member received {new_strikes} strikes")
                    await message.channel.send(embed=embed)
                    return
                
                if member_punishment == "Ban":
                    try:
                        await message.author.ban(reason="Received strike limit")
                    except discord.errors.Forbidden:
                        await message.channel.send(":x: I do not have permission to ban members!")
                        return
                    embed = discord.Embed(title="Member banned", description=f"{message.author.name} was banned", color=15158332)
                    embed.add_field(name="Moderator", value="Bad Word Blocker")
                    embed.add_field(name="Reason", value=f"Member received {new_strikes} strikes")
                    embed.add_field(name="Time of Ban", value=str(message.created_at))
                    await message.channel.send(embed=embed)
                    return


        if member_punishment == None:
            if find(amount_of_strikes, message.guild.id) == None:
                try:
                    embed.set_footer(text="Use 'bwb-get' to know why this message was deleted")
                except UnboundLocalError: 
                    pass
            

        try:
            guild_logging_channel = client.get_channel(find(logchannels, message.guild.id)["Channel"])
            logging_embed_to_send = discord.Embed(title="Bad Word Blocked", description=f"{message.author.name} sent a bad word", color=15158332)
            logging_embed_to_send.add_field(name="Message", value=message.content)
            logging_embed_to_send.add_field(name="Strikes", value=str(new_strikes))
            logging_embed_to_send.add_field(name="Channel", value=message.channel)
            await guild_logging_channel.send(embed=logging_embed_to_send)
        except TypeError:
            pass
        except AttributeError:
            pass
        except discord.errors.HTTPException:
            pass
       


        try:
            await message.channel.send(embed=embed, delete_after=int(find(when_to_delete_bad_word_blocked_message, message.guild.id)["Seconds"]))
        except TypeError:
            await message.channel.send(embed=embed)

        except UnboundLocalError:
            pass

        except Exception as er:
            if "Missing Permissions" in f"{er}":
                pass
            elif "Missing Permissions" not in f"{er}":
                print(f"{er}")


@client.command(description="This command is outdated")
async def enabledms(ctx):
    await ctx.send("This feature has been removed. Bad Word Blocker does not send DMs anymore.")


@client.command(description="This command is outdated")
async def disabledms(ctx):
    await ctx.send("This feature has been removed. Bad Word Blocker does not send DMs anymore.")



@client.command(description="Sends a link to vote for the bot")
async def vote(ctx):
    await ctx.send("Thank you for wanting to vote for Bad Word Blocker! Every time you vote, you make the bot rank higher on top.gg, which increases the chances of it becoming more popular. Here is the link:")
    await ctx.send("https://top.gg/bot/657776310491545620/vote")

@client.command(description="Shows how many server Bad Word Blocker is in")
async def servercount(ctx):
    global voters
    guild_list = []
    guilds = client.guilds
    for guild in guilds:
        guild_list.append(guild)
    await ctx.send(f"Bad Word Blocker is in {len(guild_list)} guilds.")



@client.command(aliases=["add"], description="Adds a word to the bad word list for this server")
@has_permissions(manage_messages = True)
async def addbadword(ctx, *, word):
    global custom_bad_words
    embed = discord.Embed(title=None, description=None, color=3066993)
    word_list = word.split(" ")
    for x in word_list:
        if x.startswith("http"):
            await ctx.send(f"To add a link, use the `bwb-addbadlink` command.")
            continue
        if find(custom_bad_words, ctx.guild.id) == None:
            add(custom_bad_words, "badwordlist", badwords, ctx.guild.id)
        if x in find(custom_bad_words, ctx.guild.id)["badwordlist"]:
            await ctx.send(":x: One or more of the words you tried to add is already in the bad word list for this server!")
            return
        update(custom_bad_words, "badwordlist", x, ctx.guild.id)
    if len(word_list) == 1:
        embed.title = "Added one word"
        embed.description = f"{ctx.author.mention} added {len(word_list)} word to the server's bad word list"
        embed.add_field(name="Word added", value=f"`{word_list[0]}`")
    if len(word_list) > 1:
        embed.title = "Added multiple words"
        embed.description = f"{ctx.author.mention} added {len(word_list)} words to the server's bad word list"
        embed.add_field(name="Words added", value=f"`{'` `'.join(word_list)}`")
    await ctx.send(embed=embed)




@addbadword.error
async def addbadword_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a bad word you want to add! Usage: ```bwb-add word```")

@client.command(aliases=["remove"], description="Removes a word from the bad word list for this server")
@has_permissions(manage_messages = True)
async def removebadword(ctx, *, word):
    global custom_bad_words
    word_list = word.split(" ")
    embed = discord.Embed(title=None, description=None, color=3066993)
    for x in word_list:
        if x not in find(custom_bad_words, ctx.guild.id)["badwordlist"]:
            await ctx.send(":x: One or more of the words you tried to remove was not already in this server's bad word list!")
            return
        if x in find(custom_bad_words, ctx.guild.id)["badwordlist"]:
            remove(custom_bad_words, "badwordlist", x, ctx.guild.id)
    if len(word.split(" ")) == 1:
        embed.title = "Word Removed"
        embed.description = f"{ctx.author.mention} removed {len(word_list)} word from the bad word list for this server"
        embed.add_field(name="Word", value=f"`{word_list[0]}`")
    if len(word.split(" ")) > 1:
        embed.title = "Words Removed"
        embed.description = f"{ctx.author.mention} removed {len(word_list)} words from the bad word list for this server"
        embed.add_field(name="Word", value=f"`{'` `'.join(word_list)}`")
    await ctx.send(embed=embed)

@removebadword.error
async def removebadword_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a bad word you already added that you want to be removed! Usage: ```bwb-remove word```")


@client.command(description="Makes the bot delete its own messages when it blocks a word")
@has_permissions(manage_messages = True)
async def autodeleteafter(ctx, seconds : float):
    global when_to_delete_bad_word_blocked_message
    if find(when_to_delete_bad_word_blocked_message, ctx.guild.id) == None:
        add(when_to_delete_bad_word_blocked_message, "Seconds", seconds, ctx.guild.id)
        await ctx.send(f":white_check_mark: Bad Word Blocker's messages will delete after {seconds} seconds!")        
        return
    await ctx.send(":x: You already set a time, use `bwb-dontdeleteafter` first and then rerun this command!")



@autodeleteafter.error
async def enabledeletedmessages_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(f":x: You need to give an amount of time in seconds! Usage: ```bwb-autodeleteafter seconds```")
    if isinstance(error, BadArgument):
        await ctx.send(":x: Please give me a number!")


@client.command(description="Makes the bot keep its own messages if it doesn't already")
@has_permissions(manage_messages = True)
async def dontdeleteafter(ctx):
    global when_to_delete_bad_word_blocked_message
    if find(when_to_delete_bad_word_blocked_message, ctx.guild.id) != None:
        delete(when_to_delete_bad_word_blocked_message, ctx.guild.id)
        await ctx.send(":white_check_mark: Bad Word Blocker's messages will no longer delete!")
        return
    await ctx.send(":x: You haven't already set a time, please use `bwb-autodeleteafter` first and then rerun this command!")


@removebadword.error
async def removebadword(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a bad word you already added that you want to be removed! Usage: ```bwb-dontdeleteafter```")


@client.command(description="This is a broken command")
async def leaderboard(ctx):
    global votes_leaderboard
    s = None
    t = {}
    l = []
    for m, v in votes_leaderboard.items():
        t[v] = m
        l.append(v)
        voters.append(m)
    l.sort(reverse=True)
    embed = discord.Embed(title="Vote Leaderboard", color=10181046)
    for u in l:
        if u == 0:
            continue
        if s == u:
            continue
        s = u
        embed.add_field(name=client.get_user(t[u]).name, value=f"Voted {u} times!", inline=False)
    await ctx.send(embed=embed)

@client.command(aliases=["set"], description="Set a log channel")
@has_permissions(manage_messages = True)
async def log(ctx, option, channel : discord.TextChannel):
    global logchannels
    if option.lower() == "add":
        if find(logchannels, ctx.guild.id) == None:
            add(logchannels, "Channel", channel.id, ctx.guild.id)
            await ctx.send(f":white_check_mark: {channel.name} channel will now receive logs when a person says a bad word!")
            return
        if find(logchannels, ctx.guild.id) != None:
            await ctx.send(":x: You already have a channel that receives logs! To remove it, run `bwb-log remove #channel`.")
    if option.lower() == "remove":
        if find(logchannels, ctx.guild.id) == None:
            await ctx.send(":x: There is not already a log channel to remove!")
        
        if find(logchannels, ctx.guild.id) != None:
            delete(logchannels, ctx.guild.id)
            await ctx.send(":white_check_mark: Log channel removed!")
@log.error
async def log_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command.")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify eiter `add` or `remove`, then mention a channel. Usage: ```bwb-log add/remove #channel```")

@client.command(description="Gets you help with Bad Word Blocker bot")
async def help(ctx):
    await ctx.send("A full list of commands can be found at <https://top.gg/bot/657776310491545620>. Please consider joining the Bad Word Blocker Community if you need help. https://discord.gg/hzrauvY")

@client.command(description="This is an outdated command")
async def checkword(ctx, *, word):
    checked_word = profanity_check.predict([word])[0]
    if checked_word == 1:
        await ctx.send("Bad Word Blocker would block this word and machine learning returned a 100% chance of this word being bad.")
        return
    await ctx.send(f"Bad Word Blocker would not block this word and machine learning returned a {checked_word}% chance of this word being bad.")

@client.command(description="Mutes a member")
@has_permissions(manage_roles=True)
async def mute(ctx, member : discord.Member, *, reason=None):
    global timed_member_mutes
    global strikes
    try:
        hours = int(reason.split(" ")[-1])
    except:
        hours = None
    if member == ctx.guild.get_member(client.user.id):
        await ctx.send("I work 24/7 for free to try to keep your server clean and this is how you treat me? You try to mute me? My disappointment is immeasurable and my day is ruined.")
        return
    muted_embed = discord.Embed(title="Member Muted", description=f"{member.name} has been muted", color=16776960)
    muted_embed.add_field(name="Moderator", value=ctx.author.name)
    muted_embed.add_field(name="Reason", value=str(reason))
    muted_embed.add_field(name="Time of Mute", value=str(ctx.message.created_at))
    muted_embed.add_field(name="Time limit", value=str(hours))
    delete_strikes(member, ctx.guild)
    if await mute_member(member, find(muted_roles, ctx.guild.id), ctx.channel, hours=hours) == True:
        await ctx.send(embed=muted_embed)

@mute.error
async def mute_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give a person to mute! Usage: ```bwb-mute @user reason hours```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Roles permission to use this!")

@client.command(description="Unmutes a person if they have already been muted")
@has_permissions(manage_roles = True)
async def unmute(ctx, member : discord.Member, *, reason=None):
    global strikes
    global timed_member_mutes
    global muted_roles
    if member == ctx.guild.get_member(client.user.id):
        await ctx.send("Why are you trying to make me unmute myself?")
        return
    roles = find(muted_roles, ctx.guild.id)
    if roles == None:
        await ctx.send(":x: No muted role set!")
    if roles != None:
        role = ctx.guild.get_role(int(roles["role_id"]))
        await member.remove_roles(role)
        embed = discord.Embed(title="User Unmuted", description=f"{member.name} has been unmuted", color=3066993)
        embed.add_field(name="Moderator", value=ctx.author.name)
        embed.add_field(name="Time of Unmute", value=ctx.message.created_at)
        embed.add_field(name="Reason", value=str(reason))
        await ctx.send(embed=embed)
        delete_strikes(ctx.author, ctx.guild)
        remove(timed_member_mutes, "Mutes", member.id, ctx.guild.id)
        return
    
    await ctx.send(":x: That member is not muted!")

@unmute.error
async def unmute_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give a person to unmute! Usage: ```bwb-unmute @user reason```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need to have the Manage Roles permission to use this!")

@client.command(description="Sends bot invite")
async def invite(ctx):
    await ctx.send("https://top.gg/bot/657776310491545620/invite")

@client.command(description="Submits a bug")
async def bug(ctx, *, bug_to_submit):
    global bugs
    add(bugs, "Bug", bug_to_submit, ctx.author.id)
    await ctx.send(":white_check_mark: Thank you for submitting a bug!")

@bug.error
async def bug_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please say a bug you want to submit!")



async def set_mute(context, component_info, parameters):

    if int(parameters["author_id"]) != context.author.id:
        await context.send(f"{context.author.mention}, only {client.get_user(int(parameters['author_id'])).mention} can use this command since they are the ones who ran it.")

    if find(actions, context.guild.id) == None:
        add(actions, "what_to_do", "Nothing", context.guild.id)
    await context.send(":white_check_mark: How many hours do you want a member to get muted for? Please respond within the next 1 minute or this will be cancelled.")
    def w(m):
        if m.channel.id == context.channel.id and context.author.id == m.author.id:
            try:
                int(m.content)
                return True
            except:
                pass
    try:
        t = await client.wait_for("message", check=w, timeout=60.0)
    except asyncio.TimeoutError:
        await context.send(":x: Canceled because you did not type a response.")
        return  
    global muted_member_times
    if find(muted_member_times, context.guild.id) == None:
        add(muted_member_times, "time_of_mute", "", context.guild.id)
    modify(actions, "what_to_do", "Mute", context.guild.id)
    modify(muted_member_times, "time_of_mute", t.content.lower(), context.guild.id)


    mute_role = find(muted_roles, context.guild.id)
    if mute_role == None:
        await context.send(f":white_check_mark: They will get muted for {t.content.lower()} hours! **To finish, please tell the bot which role to mute with using the `bwb-mutedrole` command.**")
    if mute_role != None:
        await context.send(f":white_check_mark: They will get muted for {t.content.lower()} hours!")



    for x in component_info:
        x.disabled = True
    

    
    return component_info

    

async def set_kick(context, component_info, parameters):

    if int(parameters["author_id"]) != context.author.id:
        await context.send(f"{context.author.mention}, only {client.get_user(int(parameters['author_id'])).mention} can use this command since they are the ones who ran it.")


    if find(actions, context.guild.id) == None:
        add(actions, "what_to_do", "Nothing", context.guild.id)
    modify(actions, "what_to_do", "Kick", context.guild.id)
    await context.send(f":white_check_mark: Member will get kicked!")


    for x in component_info:
        x.disabled = True

    return component_info


async def set_ban(context, component_info, parameters):

    if int(parameters["author_id"]) != context.author.id:
        await context.send(f"{context.author.mention}, only {client.get_user(int(parameters['author_id'])).mention} can use this command since they are the ones who ran it.")


    if find(actions, context.guild.id) == None:
        add(actions, "what_to_do", "Nothing", context.guild.id)
    modify(actions, "what_to_do", "Ban", context.guild.id)
    await context.send(f":white_check_mark: Member will get banned!")


    for x in component_info:
        x.disabled = True

    return component_info


@client.command(description="Sets amount and punishment after a certain amount of strikes is reached")
@has_permissions(manage_roles=True)
async def limit(ctx, option, amount : int, action, hours=None):
    global amount_of_strikes
    valid_options = ["mute", "kick", "ban"]
    lowercase_action = []
    if action not in valid_options:
        await ctx.send(f"For action, please only select from mute, kick, or ban. \"{action}\" is not an action.")
        return
    if action != "mute" and hours != None:
        await ctx.send(":x: A time limit in hours is only supported for mutes. Please remove it from the command and try again.")
    for x in action:
        lowercase_action.append(x)
    lowercase_action[0] = lowercase_action[0].upper()
    action = "".join(lowercase_action)
    if amount == 0:
        delete(amount_of_strikes, ctx.guild.id)
        await ctx.send(":white_check_mark: The strike limit was removed!")
        return
    if option == "add":
        add_punishment(ctx.guild, action, str(amount))
        if hours != None:
            if find(muted_member_times, ctx.guild.id) == None:
                add(muted_member_times, "time_of_mute", "", ctx.guild.id)
            modify(muted_member_times, "time_of_mute", int(hours), ctx.guild.id)
        await ctx.send(f":white_check_mark: When a member gets {amount} strikes, they will get a {action}!")

    if option == "remove":
        t = remove_punishment(ctx.guild, action, str(amount))
        if t == True:
            await ctx.send(":white_check_mark: Removed punishment!")
        if t != True:
            await ctx.send(":x: Punishment not found")


 


@limit.error
async def setstrikeamount(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(""":x: Please specify add or remove, and amount of strikes, then the punishemt! Usage: ```bwb-limit option amount action hours```
 where:
option = add or remove
amount = Number of strikes a person gets before it triggers the bot
action = mute, kick, or ban
hours = How long to mute them for, if you choose mute ```""")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")

@client.command(description="Sets up Bad Word Blocker's verification system for new members")
@has_permissions(manage_roles=True)
async def verification(ctx, option):
    if option.lower() == "setup":
        new_verify_channel = await ctx.guild.create_text_channel(name="Verify")
        everyone_permissions = PermissionOverwrite()
        everyone_permissions.view_channel = False
        everyone = discord.utils.get(ctx.guild.roles, name="@everyone")
        verified_permissions = PermissionOverwrite()
        verified_permissions.view_channel = True
        verified_member_role = await ctx.guild.create_role(name="Verified")
        for x in ctx.guild.categories:                
            await x.set_permissions(everyone, overwrite=everyone_permissions)
            await x.set_permissions(verified_member_role, overwrite=verified_permissions)
        verified_permissions.send_messages = True
        await new_verify_channel.set_permissions(everyone, overwrite=verified_permissions)
        await new_verify_channel.set_permissions(verified_member_role, overwrite=everyone_permissions)
        await ctx.send("Verification system setup, giving all members the `Verified` role...")
        async for x in ctx.guild.fetch_members():
            if verified_member_role not in x.roles:
                await x.add_roles(verified_member_role)
        if find(verification_channels, ctx.guild.id) != None:
            delete(verification_channels, ctx.guild.id)
        add(verification_channels, "channel_id", new_verify_channel.id, ctx.guild.id)
        await ctx.send(f''':white_check_mark: Verification system is set up, here are a few things to note:
        **1.** When a user joins, Bad Word Blocker sends a message in the verify channel and the user will be able to verify by clicking a reaction and entering in a code. 
        **2.** New members may still be able to see channels without verifying if they have another role with channel overrides that allow them to view channels.
        **3** Run `bwb-undoverificationsystem` to undo the verififcation system ''')
    
    if option.lower() == "undo":
        try:
            verify_channel = find(verification_channels, ctx.guild.id)
        except TypeError:
            await ctx.send(":x: You haven't set up the verification system yet!")
            return
        try:
            await verify_channel.delete()
        except AttributeError:
            pass
        everyone_permissions = PermissionOverwrite()
        everyone_permissions.view_channel = True
        everyone = discord.utils.get(ctx.guild.roles, name="@everyone")
        verified_permissions = PermissionOverwrite()
        verified_permissions.view_channel = False
        verified_member_role = discord.utils.get(ctx.guild.roles, name="Verified")
        await verified_member_role.delete()
        for x in ctx.guild.categories:                
            await x.set_permissions(everyone, overwrite=everyone_permissions)
        delete(verification_channels, ctx.guild.id)
        await ctx.send(":white_check_mark: Verification system removed!")



@verification.error
async def verification_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify `setup` or `undo`. Usage: ```bwb-verifiction setup/undo```")

@client.command(description="This command can only be run by the owner of Bad Word Blocker")
async def runpythoncode(ctx, code_to_run):
    if ctx.author.id == 581965693130506263:
        await ctx.send(exec(code_to_run))

@client.command(description="This command can only be run by the owner of Bad Word Blocker")
async def disconnect(ctx):
    if ctx.author.id == 581965693130506263:
        await ctx.send("Shutting off bot.")
        await client.logout()

@client.command(description="Sends a link to view the bad word list for this server")
@has_permissions(manage_messages=True)
async def badwordlist(ctx):
    global passwords
    global security_codes
    t = "abcdefghijklmnopqrstuvwqyz".upper()
    l = []
    if find(passwords, ctx.guild.id) == None:
        for x in t:
            l.append(x)
        password = random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) + random.choice(l) 
        add(passwords, "the_servers_password", password, ctx.guild.id)

    new_code = random.randint(1, 100000000000000000000000000000000)
    security_codes[str(ctx.author.id)] = str(new_code)
    try:
        await ctx.author.send(f"To view the bad word list for server {ctx.guild.name}, please go to http://badwordblocker.systems/_/api/login?logged_in=true&user_id={ctx.author.id}&security_code={new_code}&go_to_bad_word_list=true&guild_id={ctx.guild.id}.")
        await ctx.send(":white_check_mark: Please check your DMs!")
    except discord.errors.Forbidden:    
        await ctx.send(":x: Please enable your DMs!")



@badwordlist.error
async def badwordlist_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission for this!")

@client.command(description="Adds a link that the bot will remove")
@has_permissions(manage_messages=True)
async def addbadlink(ctx, link):
    global custom_bad_links
    if "." not in link:
        await ctx.send(":x: Thats not a link!")
        return
    if find(custom_bad_links, ctx.guild.id) == None:
        add(custom_bad_links, "Links", [], ctx.guild.id)

    for x in find(custom_bad_links, ctx.guild.id)["Links"]:
        if link.lower() == x:
            await ctx.send(":x: That link is already in in your bad links!")
            return

    update(custom_bad_links, "Links", link.lower(), ctx.guild.id)
    await ctx.send(":white_check_mark: Bad link added!")

@addbadlink.error
async def addbadlink_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a link you want to add! Usage: bwb-addbadlink link")

@client.command(description="Removes a link the bot will filter")
@has_permissions(manage_messages=True)
async def removebadlink(ctx, link):
    global custom_bad_links
    if "." not in link:
        await ctx.send(":x: Thats not a link!")
        return
    if find(custom_bad_links, ctx.guild.id) == None:
        add(custom_bad_links, "Links", [], ctx.guild.id)

    for x in find(custom_bad_links, ctx.guild.id)["Links"]:
        if link.lower() == x:
            remove(custom_bad_links, "Links", link.lower(), ctx.guild.id)
            await ctx.send(":white_check_mark: Bad link removed!")
            return


@removebadlink.error
async def removebadlink_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a link you want to add! Usage: ```bwb-removebadlink link```")

@client.command(description="Changes the amount of strikes a user has")
@has_permissions(manage_messages = True)
async def change(ctx, member : discord.Member, amount : int):
    global strikes
    delete_strikes(member, ctx.guild)
    add_strikes(member, ctx.guild, amount)
    await ctx.send(f":white_check_mark: {member.name} now has {amount} strikes!")

@change.error
async def changememberstrikes_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a member and a number to set their strikes too! Usage: ```bwb-change @user amount```")
    if isinstance(error, BadArgument):
        await ctx.send(":x: Please give a number!")


@client.command(description="Bans a member")
@has_permissions(ban_members=True)
async def ban(ctx, member : discord.Member, *, reason=None):
    if member == ctx.guild.get_member(client.user.id):
        await ctx.send("No thanks, I'm not banning myself.")
        return
    try:
        embed = discord.Embed(title="Member Banned", description=f"{member.name} has been banned", color=10038562)
        embed.add_field(name="Moderator", value=ctx.author.name)
        embed.add_field(name="Reason", value=str(reason))
        embed.add_field(name="Time of Ban", value=str(ctx.message.created_at))
        try:
            await member.send(embed=embed)
        except discord.errors.HTTPException:
            pass
        
        await member.ban(reason=reason)
        await ctx.send(embed=embed)
    except discord.errors.Forbidden:
        await ctx.send(":x: I am missing the Ban Members permission!")

@ban.error
async def ban_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a person to ban and the reason! Usage: ```bwb-ban @user reason```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Ban Members permission to use this command!")

@client.command(description="Unbans a member if they have already been banned")
@has_permissions(ban_members=True)
async def unban(ctx, user, *, reason=None):
    try:
        user_name = user.split("#")[0]
        user_tag = user.split("#")[1]
    except IndexError:
        await ctx.send(":x: Please send a user's username and tag like: bob#1234")
        return
    if user == client.user:
        await ctx.send("Why are you trying to ban me when I'm not banned?")
        return
    for x in await ctx.guild.bans():
        print(x)
        if f"{x.user.name}#{x.user.discriminator}" == f"{user_name}#{user_tag}":
            try:
                await ctx.guild.unban(x.user)
                embed = discord.Embed(title="Member Unbanned", description=f"{user} has been unbanned", color=2067276)
                embed.add_field(name="Moderator", value=ctx.author.name)
                embed.add_field(name="Reason", value=str(reason))
                embed.add_field(name="Time of Unban", value=str(ctx.message.created_at))
                await ctx.send(embed=embed)

            except discord.errors.Forbidden:
                await ctx.send(":x: I do not have the Ban Members permission!")

@unban.error
async def unban_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Ban Members permission to use this command!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give me either the user's username and tag or their ID!")
    if isinstance(error, BadArgument):
        await ctx.send(":x: You need to give their username and tag, for example bob#5678! Usage: ````bwb-unban username#tag```")

@client.command(description="Only the owner can use this command")
async def restart(ctx):
    if ctx.author.id == 581965693130506263:
        await ctx.send("Bot is restarting.")
        subprocess.call("./restart.sh", shell=True)
        await client.logout()

@client.command(description="Run this command in your server to get it advertised in the Bad Word Blocker Discord server")
@has_permissions(manage_messages=True)
async def advertise(ctx):
    global advertising
    if find(advertising, ctx.guild.id) == None:
        invite = await ctx.channel.create_invite()
        for x in invite.guild.channels:
            try:
                if x.nsfw == True:
                    await ctx.send(":x: That server can't be NSFW!")
                    return
            except AttributeError:
                pass
        channel = client.get_channel(752401548226855004)
        async for x in channel.history():
            if x.content == invite.url:
                await ctx.send(":x: You already advertised that server!")
                return
        await channel.send(invite.url)
        await ctx.send(":white_check_mark: Your server has been advertised in the Bad Word Blocker Community!")
        add(advertising, "Status", "This server has already advertised", ctx.guild.id)
        return
    await ctx.send(":x: You can only advertise your server once!")

@advertise.error
async def advertise_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give me the link you want to advertise!")
    if isinstance(error, BadArgument):
        await ctx.send(":x: I need an invite!")
    if isinstance(error, MissingPermissions):
        await ctx.send("You need the `Manage Messages` permission to use this command!")

@client.command(descrpition="Shows how many strikes a user has")
async def see(ctx, member: discord.Member):
    global strikes
    member_strikes = get_strikes(member, ctx.guild)
    if member_strikes == None:
        await ctx.send(f":white_check_mark: {member.name} currently has has 0 strikes!")
        return
    await ctx.send(f":white_check_mark: {member.name} currently has {get_strikes(member, ctx.guild)} strikes!")

@see.error
async def strikes_error(ctx, error):
    global strikes
    if isinstance(error, MissingRequiredArgument):
        member_strikes = get_strikes(member, ctx.guild)
        if member_strikes != None:
            await ctx.send(f":white_check_mark: You currenty have {member_strikes} strikes!")
        if member_strikes == None:
            await ctx.send(f":white_check_mark: You currently have 0 strikes!")

@client.command(description="Deletes an amount of messages from a channel")
@has_permissions(manage_messages=True)
async def clear(ctx, amount : int):
    await ctx.channel.purge(limit=amount)
    embed = discord.Embed(title="Messages Cleared", description="Messages in this channel have been cleared.", color=10181046)
    embed.add_field(name="Time of clear", value=str(ctx.message.created_at))
    embed.add_field(name="Moderator", value=ctx.author.name)
    embed.add_field(name="Amount", value=str(amount))
    await ctx.send(embed=embed, delete_after=30.0)

@clear.error
async def clear_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give me an amount of messages to clear!")
    if isinstance(error, BadArgument):
        await ctx.send(":x: Please give a number!")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission!")

@client.command(description="Warns and adds one strike to a user")
@has_permissions(manage_roles=True)
async def warn(ctx, member : discord.Member, *, reason=None):
    global strikes
    embed = discord.Embed(title="Member Warned", description=f"One strike has been added to {member.name}", color=15105570)
    add_strikes(member, ctx.guild, 1)
    embed.add_field(name="Reason", value=str(reason))
    embed.add_field(name="Moderator", value=ctx.author.name)
    embed.add_field(name="Time", value=str(ctx.message.created_at))
    await ctx.send(embed=embed)

@warn.error
async def warn_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give a member and an optional reason! Usage: ```bwb-warn @member reason```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Roles permission to use this command!")
    if isinstance(error, BadArgument):
        await ctx.send("Please mention a member!")

@client.command(descritpion="Kicks a user")
@has_permissions(kick_members=True)
async def kick(ctx, member : discord.Member, *, reason=None):
    embed = discord.Embed(title="Member Kicked", description=f"{member.name} was kicked", color=11027200)
    embed.add_field(name="Time", value=str(ctx.message.created_at))
    embed.add_field(name="Moderator", value=ctx.author.name)
    embed.add_field(name="Reason", value=str(reason))
    try:
        await member.send(embed=embed)
    except discord.errors.Forbidden:
        pass
    await member.kick(reason=reason)
    await ctx.send(embed=embed) 

    delete_strikes(member, ctx.guild)

@kick.error
async def kick_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: You need to give a member and an optional reason! Usage: ```bwb-kick @user reason```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Kick Members permission to use the command!")
    if isinstance(error, BadArgument):
        await ctx.send(":x: Please mention a member!")
    


async def say_hi(context, component_info, parameters):
    for x in component_info:
        if x.label == "Say Hi":
            x.disabled = True
    await context.send("Hi!")
    return component_info

@client.command(description="Pings the bot")
async def ping(ctx):
    print(type(ctx))
    if isinstance(ctx, SlashContext):
        await ctx.send("Pong! Here is a test button you can press", buttons=[Button(label="Say Hi", click_function=say_hi)])
        return
    await ctx.send("Pong!")

@client.command(description="This command can only be used by the owner")
async def query(ctx, c, the_things_id):
    global database
    if client.get_guild(722594194513723987).get_role(739323165716774912) in ctx.author.roles:
        await ctx.send(f"`{find(database[c], the_things_id)}`")


@client.command(description="Gets last deleted messages back")
async def get(ctx):
    global messages
    if find(messages, ctx.author.id) == None:
        await ctx.send(":x: You have not gotten any of your messages blocked yet!")
        return
    try:
        await ctx.author.send(f'''
Time message was deleted: {find(messages, ctx.author.id)['last_blocked_message'].split(',')[3]}
Reason for deletion: Contained bad word "{find(messages, ctx.author.id)['last_blocked_message'].split(',')[1]}"
Message: {find(messages, ctx.author.id)['last_blocked_message'].split(',')[0]}''')
        await ctx.send(":white_check_mark: I sent you your last blocked message in DMs!")
    except discord.errors.Forbidden:
        await ctx.send(":x: Please enable your DMs!")


@client.command(description="This command can only be run by the owner of Bad Word Blocker")
async def adddefaultword(ctx, word):
    if client.get_guild(722594194513723987).get_role(744366228612710462) in ctx.author.roles:
        update(database["badwords"], "words", word, "1")
        await ctx.send(":white_check_mark: Word added to default list!")

@client.command(description="This command can only be run by the owner of Bad Word Blocker")
async def removedefaultword(ctx, word):
    if client.get_guild(722594194513723987).get_role(744366228612710462) in ctx.author.roles:
        remove(database["badwords"], "words", word, "1")
        await ctx.send(":white_check_mark: Word removed from default list!")

@client.command(description="Sets the sensitivity for this server, higher the number is lower the sensitivity")
@has_permissions(manage_messages=True)
async def sensitivity(ctx, sensitivity : int):
    global sensitivities
    if find(sensitivities, ctx.guild.id) == None:
        add(sensitivities, "the_servers_sensitivity", sensitivity, ctx.guild.id)
    if sensitivity < 30:
        await ctx.send(":x: Number can't be below 30!")
        return
    if sensitivity > 100:
        await ctx.send(":x: Number can't be above 100!")
        return
    if sensitivity == 100:
        delete(sensitivities, ctx.guild.id)
        await ctx.send(":white_check_mark: Sensitivity set to 100!")
        return
    modify(sensitivities, "the_servers_sensitivity", sensitivity, ctx.guild.id)
    await ctx.send(f":white_check_mark: Sensitivity has been set to {sensitivity}! If you put the number too low, the bot may block messages that are not bad. Run the command `bwb-sensitivity 100` to get it back to normal.")

@sensitivity.error
async def sensitivity_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give a number between 30 and 100! The lower you go, the more sensitive the bot gets. The higher you go, the less sensitive it gets. Usage: ```bwb-sensitivity number```")
    if isinstance(error, BadArgument):
        await ctx.send(":x: Please give a number!")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!") 

@client.command(description="Allows a user to bypass the bot")
@has_permissions(manage_messages = True)
async def bypass(ctx, option, member : discord.Member):
    global bypasses
    if option.lower() == "add":
        try:
            if member.id in find(bypasses, ctx.guild.id)["users"]:
                await ctx.send(":x: That member can already bypass the bot. If you'd like to remove them, run `bwb-bypass remove @member`")
                return
        except TypeError:
            pass
        if find(bypasses, ctx.guild.id) == None:
            add(bypasses, "users", [], ctx.guild.id)
        update(bypasses, "users", member.id, ctx.guild.id)
        
        await ctx.send(f":white_check_mark: {member.name} can now bypass the bot!")
    
    if option.lower() == "remove":
        if find(bypasses, ctx.guild.id) == None:
            await ctx.send(":x: To add someone to the bypass list, use the `add` option.")
            return
        if member.id not in find(bypasses, ctx.guild.id)["users"]:
            await ctx.send(":x: That member isn't already bypassing the bot!")
            return
        remove(bypasses, "users", member.id, ctx.guild.id)
        await ctx.send(":white_check_mark: Member can't bypass the bot anymore!")
                


@bypass.error
async def bypass_error(ctx, error):
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission!")
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify either `add` or `remove`, then mention a user to apply the action to. Usage: ```bwb-bypass add/remove @user```")

@client.command(description="Submits a suggestion")
async def suggestion(ctx, *, s):
    global suggestions
    if find(suggestions, ctx.author.id) == None:
        add(suggestions, "the_users_suggestions", [], ctx.author.id)
    
    update(suggestions, "the_users_suggestions", s, ctx.author.id)
    
    await ctx.send(":white_check_mark: Your suggestion will be read by the staff team!")

@suggestion.error
async def suggestion_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please give a suggestion! Usage: bwb-suggestion suggestion")

@client.command(description="Makes bot ignore a channel")
@has_permissions(manage_messages = True)
async def ignore(ctx, option, channel : discord.TextChannel):
    global ignores

    if option.lower() == "add":

        if find(ignores, ctx.guild.id) == None:
            add(ignores, "channels", [], ctx.guild.id)
        
        if channel.id in find(ignores, ctx.guild.id)["channels"]:
            await ctx.send(":x: The bot is already ignoring that channel. If you want to remove a channel from being ignored, run `bwb-ignore remove #channel`")
            return
        update(ignores, "channels", channel.id, ctx.guild.id)
        await ctx.send(f":white_check_mark: {channel.mention} will now be ignored!")
    
    if option.lower() == "remove":
        try:
            if channel.id not in find(ignores, ctx.guild.id)["channels"]:
                await ctx.send(":x: That channel isn't already ignored!")
                return
        except TypeError:
            pass
        remove(ignores, "channels", channel.id, ctx.guild.id)
        await ctx.send(f":white_check_mark: The bot won't ignore {channel.mention} anymore!")


@ignore.error
async def ignore_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify either `add` or `remove`, then mention a channel. Usage: ```bwb-ignore add/remove #channel```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")


@client.command(description="Sends a link to leave a review of the bot")
async def review(ctx):
    await ctx.send("Please leave a review here: https://top.gg/bot/657776310491545620#reviews")

@client.command(description="Sets embed setting")
@has_permissions(manage_messages=True)
async def embed(ctx, option):
    global embeds
    if find(embeds, ctx.guild.id) != None:
        delete(embeds, ctx.guild.id)
    if option.lower() == "maximal":
        add(embeds, "the_server_option", "maximal", ctx.guild.id)
        await ctx.send(":white_check_mark: Your embed setting has been set to maximal")
    if option.lower() == "balance":
        add(embeds, "the_server_option", "balance", ctx.guild.id)
        await ctx.send(":white_check_mark: Your embed setting has been set to balance!")
    if option.lower() == "minimal":
        add(embeds, "the_server_option", "minimal", ctx.guild.id)
        await ctx.send(":white_check_mark: Your embed setting has been set to minimal!")
    if option.lower() == "none":
        add(embeds, "the_server_option", "none", ctx.guild.id)
        await ctx.send(":white_check_mark: Your embed setting has been set to none!")



@embed.error
async def embed_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(""":x: Please give either `none`, `minimal`, `balance`, or `maximal` as a choice. 
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed
Usage: ```bwb-embed none/minimal/balance/maximal```
""")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the Manage Messages permission to use this command!")
    
@client.command(description="Walks you through setting up basics settings for your server")
@has_permissions(manage_messages=True)
async def intro(ctx):
    global custom_bad_words
    global amount_of_strikes
    global muted_member_times
    global actions
    global embeds
    global prefixes
    await ctx.send("Welcome to Bad Word Blocker! This command will guide you through setting up some settings for your server, if you haven't already. Please say `y` if you'd like to continue.")
    try:
        def check(m):
            return m.author == ctx.author and m.content.lower() == "y"
        await client.wait_for("message", check=check, timeout=30.0)
    except asyncio.TimeoutError:
        await ctx.send("Canceled.")
        return
    await ctx.send("Firstly, would you like to have the default bad word list, or would you like to provide your own words?  The default list has hundreds of the most common offensive words people use. Please respond with `y` if you would like to have the default word list, or don't respond if you want to have an empty list.")
    try:
        await client.wait_for("message", check=check, timeout=30.0)
        if find(custom_bad_words, ctx.guild.id)["badwordlist"] != None:
            delete(custom_bad_words, ctx.guild.id)
        add(custom_bad_words, "badwordlist", [], ctx.guild.id)
        for x in badwords:
            update(custom_bad_words, "badwordlist", x, ctx.guild.id)
        await ctx.send(f":white_check_mark: You have the default word list! You can always add or remove some with `bwb-add` and `bwb-remove`. How many strikes should a user be able to get before they receive a punishment? Please say a number. If you don't respond, there will be no limit on the amount of strikes a user can get for this server.")

    except asyncio.TimeoutError:
        if find(custom_bad_words, ctx.guild.id)["badwordlist"] != None:
            delete(custom_bad_words, ctx.guild.id)
        add(custom_bad_words, "badwordlist", [], ctx.guild.id)
        await ctx.send(":white_check_mark: There are 0 words in the bad word list for this server. You can always add and remove some with `bwb-add`, and `bwb-remove`. How many strikes should a user be able to get before they receive a punishment? Please say a number. If you don't respond, there will be no limit on the amount of strikes a user can get for this server.")
    try:
        def check(m):
            if ctx.author.id == m.author.id:
                try:
                    int(m.content)
                    return True
                except ValueError:
                    return False
        number = await client.wait_for("message", check=check, timeout=30.0)
        try:
            add(amount_of_strikes, "Amount", int(number.content), ctx.guild.id)
        except pymongo.errors.DuplicateKeyError:
            delete(amount_of_strikes, ctx.guild.id)
            add(amount_of_strikes, "Amount", int(number.content), ctx.guild.id)
        await ctx.send(f":white_check_mark: When a person receives {number.content} strikes, they will get a punishment. What do you want that punishment to be? Please say either `mute`, `kick`, or `ban`. If you don't respond, this part will be skipped.")
        def check(m):
            if m.author.id == ctx.author.id:
                return m.content.lower() == "mute" or m.content.lower() == "kick" or m.content.lower() == "ban"
        try:
            action = await client.wait_for("message", check=check, timeout=30.0)
            if action.content.lower() == "mute":
                await ctx.send(":white_check_mark: How long do you want a member to get muted for? Please respond with the number of hours.")
                def check(m):
                    if m.channel.id == ctx.channel.id:
                        return "w" in m.content.lower() or "d" in m.content.lower() or "h" in m.content.lower() or "m" in m.content.lower()
                try:
                    t = await client.wait_for("message", check=check, timeout=30.0)
                    global muted_member_times
                    if find(muted_member_times, ctx.guild.id) == None:
                        add(muted_member_times, "time_of_mute", "", ctx.guild.id)
                    modify(muted_member_times, "time_of_mute", t.content.lower(), ctx.guild.id)
                    if find(actions, ctx.guild.id) == None:
                        add(actions, "what_to_do", "Nothing", ctx.guild.id)
                    modify(actions, "what_to_do", "Mute", ctx.guild.id)
                    await ctx.send(f"""They will receive a mute for {t.content}! When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")
                except asyncio.TimeoutError:
                    await ctx.send(""":x: Canceled because you did not type a response. When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")  
               
            if action.content.lower() == "kick":
                if find(actions, ctx.guild.id) == None:
                    add(actions, "what_to_do", "Nothing", ctx.guild.id)
                modify(actions, "what_to_do", "Kick", ctx.guild.id)
                await ctx.send(f""":white_check_mark: They will receive a kick! When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")
            if action.content.lower() == "ban":
                if find(actions, ctx.guild.id) == None:
                    add(actions, "what_to_do", "Nothing", ctx.guild.id)
                modify(actions, "what_to_do", "Ban", ctx.guild.id)
                await ctx.send(f""":white_check_mark: They will receive a ban! When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")
        except asyncio.TimeoutError:
            await ctx.send("""Skipped because you didn't respond. When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")
    except asyncio.TimeoutError:
        await ctx.send("""There is no limit. When Bad Word Blocker deletes a message, it sends a embed. What features do you want that embed to have? Please respond with one of the following options.
**maximal:** Joke, strikes, and user profile picture on embed
**balance**: Joke and strikes on embed
**minimal**: Strikes on embed
**none**: Bot will send no embed""")
    def check(m):
        return m.content.lower() == "maximal" or m.content.lower() == "balance" or m.content.lower() == "minimal" or m.content.lower() == "none"
    try:
        option = await client.wait_for("message", check=check, timeout=30.0)
        if find(embeds, ctx.guild.id) == None:
            add(embeds, "the_server_option", "", ctx.guild.id)
        modify(embeds, "the_server_option", option.content.lower(), ctx.guild.id)
        await ctx.send(f":white_check_mark: Embed option has been set to {option.content.lower()}! What do you want Bad Word Blocker's prefix for this server to be? Please respond with one.")
    except asyncio.TimeoutError:
        if find(embeds, ctx.guild.id) == None:
            add(embeds, "the_server_option", "", ctx.guild.id)
        modify(embeds, "the_server_option", "maximal", ctx.guild.id)
        await ctx.send(f":white_check_mark: Embed option has been set to maximal since you didn't respond! What do you want Bad Word Blocker's prefix for this server to be? Please respond with one.")
    def check(m):
        if ctx.author.id == m.author.id:
            return m.author.id == ctx.author.id
    try:
        guild_prefix = await client.wait_for("message", check=check, timeout=30.0)
        await ctx.send(f"The prefix for this guild is now `{guild_prefix.content}`! That should be all you need to get started with Bad Word Blocker. If you need help, feel free to join the server! https://discord.gg/hzrauvY")
        if find(prefixes, ctx.guild.id) == None:
            add(prefixes, "prefix", "", ctx.guild.id)
        modify(prefixes, "prefix", guild_prefix.content, ctx.guild.id)
    except asyncio.TimeoutError:
        await ctx.send("This server's prefix is the default `bwb-`, since you did not respond. That should be all you need to get started with Bad Word Blocker. If you need help, feel free to join the server! https://discord.gg/hzrauvY")


        
@client.command(description="Changes the bot's prefix for this server")
@has_permissions(manage_messages=True)
async def prefix(ctx, prefix):
    global prefixes
    if find(prefixes, ctx.guild.id) == None:
        add(prefixes, "prefix", "", ctx.guild.id)
    modify(prefixes, "prefix", prefix, ctx.guild.id)
    await ctx.send(f":white_check_mark: This server's prefix has been set to {prefix}!")


@prefix.error
async def prefix_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please say a prefix! Usage: ```bwb-prefix prefix```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the `Manage Messages` permission to use this command!")

@client.command()
async def join(ctx):
    await on_member_join(ctx.author)

@client.command(description="Use bwb-analytics instead")
@has_permissions(manage_messages=True)
@commands.check(voted)
async def analytics(ctx):
    global server_anaytics
    channel_names = []
    channel_numbers = []
    try:
        analytics = find(server_analytics, ctx.guild.id)["analytics"]
    except TypeError:
        await ctx.send("There are no analytics to show because no words have been blocked in this server.")
        return
    reverse_words = {}
    total_numbers = []
    for k, v in analytics["most_blocked_word"].items():
        reverse_words[v] = k
        total_numbers.append(v)
    total_numbers.sort(reverse=True)

    reverse_channels = {}
    total_channels = []
    for k, v in analytics["words_blocked_channel_ids"].items():
        reverse_channels[v] = k
        total_channels.append(v)
        channel_names.append(client.get_channel(int(k)))
        channel_numbers.append(v)
    total_channels.sort(reverse=True)
    
    x_graph = []
    y_graph = []

    for x in analytics["day_by_day_analytics"]:
        x_graph.append(x["date"])
        y_graph.append(x["blocked_messages"])

    bar_number = random.randint(1, 1000)

    graph.plot(x_graph, y_graph)
    graph.xlabel("Dates")
    graph.ylabel("Words blocked")
    graph.title("Words blocked per day")
    graph.savefig(f"{bar_number}")
    graph.clf()

    pie_number = random.randint(1, 1000)

    graph.pie(channel_numbers, labels=channel_names)
    graph.title("Words blocked per channel")
    graph.savefig(f"{pie_number}")
    graph.clf()

    await ctx.send(f"""
    Messages deleted: {analytics["messages_deleted"]}
Most blocked word: ||{reverse_words[total_numbers[0]]}||
""", files=[discord.File(f"{bar_number}.png"), discord.File(f"{pie_number}.png")])
    os.remove(f"{bar_number}.png")
    os.remove(f"{pie_number}.png")

@client.command()
@has_permissions(manage_messages=True)
async def wordlist(ctx, option):
    global custom_bad_words
    if option.lower() == "reset":
        delete(custom_bad_words, ctx.guild.id)
        add(custom_bad_words, "badwordlist", [], ctx.guild.id)
        for x in badwords:
            update(custom_bad_words, "badwordlist", x, ctx.guild.id)

        await ctx.send(":white_check_mark: The Bad Word list for this server has been reset!")
    if option.lower() == "clear":
        for x in find(custom_bad_words, ctx.guild.id)["badwordlist"]:
            remove(custom_bad_words, "badwordlist", x, ctx.guild.id)

        await ctx.send(":white_check_mark: All words in this server's bad word list have been removed!")

@wordlist.error
async def wordlist_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify either `reset` or `clear`. Usage: ```bwb-wordlist reset/clear```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the `Manage Messages` permission to use this command!")

@client.command()
@has_permissions(manage_messages=True)
async def mutedrole(ctx, option, role : discord.Role):
    if option.lower() == "add":
        if find(muted_roles, ctx.guild.id) != None:
            delete(muted_roles, ctx.guild.id)
        add(muted_roles, "role_id", role.id, ctx.guild.id)
        await ctx.send(":white_check_mark: Mute role added!")
    if option.lower() == "remove":
        if find(muted_roles, ctx.guild.id) != None:
            delete(muted_roles, ctx.guild.id)
            await ctx.send("Muted role removed!")
            return
        await ctx.send(":x: There not already a muted role to remove!")

@mutedrole.error
async def mutedrole_error(ctx, error):
    if isinstance(error, MissingRequiredArgument):
        await ctx.send(":x: Please specify either `add` or `remove`, then mention a role. Usage: ```add/remove @role```")
    if isinstance(error, MissingPermissions):
        await ctx.send(":x: You need the `Manage Messages` permission to use this command")

@client.command()
async def vc(ctx):
    await ctx.send("""**This feature is experamental.** With this feature, Bad Word Blocker can join a voice chat and listen for bad words.
**How it works**
Bad Word Blocker will join a voice chat and record everyone's voices. When everyone leaves the VC, the bot will scan the recording for bad words, and hand out strikes accordingly.
**Your data**
After Bad Word Blocker is done scanning the recording, the recording is immediately deleted. We respect your privacy.

Respond with "y" if you'd like to continue, or type "n" to cancel. Please respond in the next 30 seconds.
""")


    def check(m):
        return m.author.id == ctx.author.id

    response = client.wait_for("message", timeout=30.0, check=check)
    if response == "y":
        channel = ctx.author.voice.channel
        if channel == None:
            await ctx.send(":x: Please get in a voice channel and try again!")
    if response == "n":
        await ctx.send("Canceled.")
        return

# Runs the bot
client.run("redacted")
