import 'dart:async';
import 'dart:convert';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:http/http.dart' as http;
import 'package:bad_word_blocker_dart/utils/wrappers/database_dataclasses.dart';

import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

final url = Uri.http("0.0.0.0:8080", "/");

var _serverCount = 0;
var _hasAlreadyPrintedAboutTopgg = false;
// I want it to print one time, just to let me know that it's working

void startTimers() {
  Timer.periodic(Duration(minutes: 15), (_) async {
    if (!isFinishedReceivingServers || !isProduction) return;
    await postStatsToTopgg();
    if (!_hasAlreadyPrintedAboutTopgg) {
      print("Posted stats to top.gg. Will repeat every 15 minutes.");
      _hasAlreadyPrintedAboutTopgg = true;
    }
  });
  Timer.periodic(Duration(seconds: 45), (timer) async {
    final url = Uri.parse(
        "https://patreon.com/api/oauth2/v2/campaigns/9498338/members?include=currently_entitled_tiers,user&fields[member]=next_charge_date,patron_status&fields[user]=social_connections");

    final headers = {
      "Authorization": "Bearer Xu1dQ23aeRsxLWdPu5m2t6usuOPyzxjzaSky5g3a1U4"
    };
    //final url = Uri.http("127.0.0.1:8080", "/premiumusers"); :

    final response =
        jsonDecode((await http.get(url, headers: headers)).body) as Map;
    premiumUsers = (response["data"] as List<dynamic>)
        .map((value) => (
              value["attributes"],
              value["relationships"]["user"]["data"]["id"]
            )) // tuple of attributes and id
        .filter((data) {
          final nextChargeDateOpt =
              Option.fromNullable(data.$1["next_charge_date"] as String?)
                  .map(DateTime.parse);
          final patreonStatus = data.$1["patron_status"];
          if (nextChargeDateOpt case Some(value: final nextChargeDate)) {
            return patreonStatus == "active_patron" ||
                DateTime.now().isBefore(nextChargeDate);
          }
          return patreonStatus == "active_patron";
        })
        .map((data) => data.$2) // This is the ids of the applicable users
        .map((patronId) => (response["included"] as List<dynamic>).firstWhere(
            (data) =>
                data["id"] == patronId)) // Now map it to their Discord IDs
        .map((data) =>
            data["attributes"]["social_connections"]["discord"]?["user_id"])
        .filter(
            (data) => data != null) // They may not have their Discord linked
        .map((id) => id.toString())
        .toList()
      ..addAll(permanantPremiumUsers);
  });
  Timer.periodic(Duration(minutes: 5), (timer) async {
    final allPremiumGuilds = await db
        .collection(getCollectionName(PremiumServers()))
        .find()
        .map((e) => PremiumServersDBWrapper(Snowflake(e["_id"]), Some(e)))
        .toList();
    // Change the isUserPremiumActive status to false if their premium ran out
    for (final guildData in allPremiumGuilds) {
      guildData.premiumData = guildData.premiumData
          .map((data) => data..isUserPremiumActive = isPremiumUser(data.userId))
          .toList();
      await setDbDocument(PremiumServers(), guildData, guildData.id);
    }
  });
  Timer.periodic(Duration(seconds: 5), (Timer timer) async {
    if (_serverCount == client.guilds.length) {
      isFinishedReceivingServers = true;
      timer.cancel();
    }
    _serverCount = client.guilds.length;
  });

  Timer.periodic(Duration(seconds: 3), (_) async {
    final timerEntries = await getAllTimedPunishments();
    for (final guildEntry in timerEntries) {
      for (final entry in guildEntry.entries) {
        final action = entry.action;
        final memberId = entry.memberId;
        final guildId = entry.guildId;
        final undoAt = DateTime.parse(entry.undoAt);
        if (DateTime.now().isAfter(undoAt)) {
          try {
            print("---------Timer being run-----------");
            await undoAction(action, memberId, guildId, undoAt);
          } catch (e) {
            // Do nothing
          } finally {
            await removeTimedPunishment(
                undoAt, Snowflake(guildId), Snowflake(memberId), action);
          }
        }
      }
    }
  });
}

Future<void> undoAction(
    String action, String memberId, String guildId, DateTime undoAt) async {
  if (DateTime.now().isAfter(undoAt)) {
    final guildOpt = Option.fromNullable(client.guilds
            .filter((guild) => guild.id.toString() == guildId)
            .entries
            .firstOrNull)
        .map((t) => t.value);
    if (guildOpt case Some(value: final guild)) {
      if (action == "ban") {
        guild.unban(Snowflake(memberId));
      }
      if (action == "timeout") {
        final memberOpt =
            await fetchMember(Snowflake(guildId), Snowflake(memberId));
        if (memberOpt case Some(value: final member)) {
          await member.edit(builder: MemberBuilder()..timeoutUntil = null);
        }
      }
      if (action.startsWith("role")) {
        final memberOpt =
            await fetchMember(Snowflake(guildId), Snowflake(memberId));
        if (memberOpt case Some(value: final member)) {
          await member
              .removeRole(SnowflakeEntity(Snowflake(action.split(" ")[1])));
        }
      }
    }
  }
}
