import 'dart:async';
import 'dart:convert';

import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_filter/extensions.dart';
import 'package:bad_word_blocker_filter/utils.dart';
import 'package:collection/collection.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database_dataclasses.dart';
import 'package:fpdart/fpdart.dart';
import 'package:more/collection.dart' hide FlattenIterableExtension;
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:bad_word_blocker_filter/types.dart';
import 'package:http/http.dart' as http;

Future<Blacklist> getBlacklist(Snowflake guildId) async {
  final words = InexactMatchDbWrapper(
          guildId, await getDbDocument(InexactMatch(), guildId))
      .words;
  final phrases =
      PhrasesDbWrapper(guildId, await getDbDocument(Phrases(), guildId))
          .phrases;
  final links =
      LinksDbWrapper(guildId, await getDbDocument(Links(), guildId)).links;
  return (words: words, phrases: phrases, links: links);
}

Future<void> saveBlacklist(List<String> words, List<String> phrases,
    List<String> links, Snowflake id) async {
  final wordsWrapper =
      InexactMatchDbWrapper(id, Some({"_id": id, "words": words}));
  final phrasesWrapper =
      PhrasesDbWrapper(id, Some({"_id": id, "phrases": phrases}));
  final linksWrapper = LinksDbWrapper(id, Some({"_id": id, "Links": links}));

  await setDbDocument(InexactMatch(), wordsWrapper, id);
  await setDbDocument(Phrases(), phrasesWrapper, id);
  await setDbDocument(Links(), linksWrapper, id);
}

Future<BypassesDbWrapper> getGuildBypasses(GuildId guildId) async {
  return BypassesDbWrapper(guildId, await getDbDocument(Bypasses(), guildId));
}

Future<CustomMessagesWrapper> getGuildCustomEmbedInfo(GuildId guildId) async {
  return CustomMessagesWrapper(
      guildId, await getDbDocument(CustomMessages(), guildId));
}

Future<List<TimedPunishmentsDBWrapper>> getAllTimedPunishments() async {
  final all = await db
      .collection(getCollectionName(TimedPunishments()))
      .find()
      .toList();
  return all
      .map((e) => TimedPunishmentsDBWrapper(Snowflake(e["_id"]), Some(e)))
      .toList();
}

Future<void> addTimedPunishment(DateTime undoAt, Snowflake guildId,
    Snowflake memberId, String action) async {
  final guildEntries = TimedPunishmentsDBWrapper(
      guildId, await getDbDocument(TimedPunishments(), guildId));
  guildEntries.entries.add(TimedPunishmentEntryDBWrapper(
      guildId.toString(), undoAt.toString(), memberId.toString(), action));
  await setDbDocument(TimedPunishments(), guildEntries, guildId);
}

Future<void> removeTimedPunishment(DateTime undoAt, Snowflake guildId,
    Snowflake memberId, String action) async {
  final guildEntries = TimedPunishmentsDBWrapper(
      guildId, await getDbDocument(TimedPunishments(), guildId));
  guildEntries.entries = guildEntries.entries
      .filter((t) => t.undoAt != undoAt.toString())
      .toList();
  await setDbDocument(TimedPunishments(), guildEntries, guildId);
}

Future<Option<IMember>> fetchMember(
    Snowflake guildId, Snowflake memberId) async {
  try {
    return Some(await client.httpEndpoints
        .fetchGuildMember(Snowflake(guildId), Snowflake(memberId)));
  } catch (e) {
    return None();
  }
}

Future<int> getMemberStrikes(Snowflake memberId, GuildId guildId) async {
  final guildStrikes =
      StrikesDBWrapper(guildId, await getDbDocument(Strikes(), guildId));
  return guildStrikes.strikes.lookup(memberId.toString()).getOrElse(() => 0);
}

Future<void> setMemberStrikes(
    int strikes, Snowflake memberId, GuildId guildId) async {
  final guildStrikes =
      StrikesDBWrapper(guildId, await getDbDocument(Strikes(), guildId));
  guildStrikes.strikes[memberId.toString()] = strikes;
  await setDbDocument(Strikes(), guildStrikes, guildId);
}

Future<int> addOneStrike(Snowflake memberId, GuildId guildId) async {
  final currentStrikes = await getMemberStrikes(memberId, guildId);
  await setMemberStrikes(currentStrikes + 1, memberId, guildId);
  return currentStrikes + 1;
}

Future<void> deleteStrikes(Snowflake memberId, GuildId guildId) async {
  final guildStrikesData =
      StrikesDBWrapper(guildId, await getDbDocument(Strikes(), guildId));
  guildStrikesData.strikes = guildStrikesData.strikes
      .filterWithKey((key, value) => key != guildId.toString());

  await setDbDocument(Strikes(), guildStrikesData, guildId);
}

Future<Option<PunishmentData>> getMemberPunishment(
    int strikes, GuildId guildId) async {
  final punishmentData =
      LimitsDBWrapper(guildId, await getDbDocument(Limits(), guildId));
  if (punishmentData.punishments.isEmpty) {
    return None();
  } else {
    final punishments = punishmentData.punishments;
    final higestLimitAmount = punishments.keys
        .map(int.parse)
        .sortBy(Order.from((a, b) => a - b))
        .toList()
        .last;
    if (strikes > higestLimitAmount) {
      // If they are over the highest
      return Some(punishments[higestLimitAmount.toString()]!);
    } else {
      return punishments.lookup(strikes.toString());
    }
  }
}

Future<void> addPunishment(int strikeAmount, String action, Option<int> minutes,
    GuildId guildId) async {
  final currentPunishments =
      LimitsDBWrapper(guildId, await getDbDocument(Limits(), guildId));
  final newPunishmentData = PunishmentData(action, minutes);
  currentPunishments.punishments[strikeAmount.toString()] = newPunishmentData;
  await setDbDocument(Limits(), currentPunishments, guildId);
}

Future<void> removePunishment(int strikeAmount, GuildId guildId) async {
  final currentPunishments =
      LimitsDBWrapper(guildId, await getDbDocument(Limits(), guildId));
  currentPunishments.punishments = currentPunishments.punishments
      .filterWithKey((amount, _) => amount != strikeAmount.toString());
  await setDbDocument(Limits(), currentPunishments, guildId);
}

Future<void> saveMessage(
    String content,
    DateTime deletedAt,
    List<String> blacklistedItems,
    Snowflake memberId,
    Snowflake guildId) async {
  final currentGuildDeletedMessages = SavedMessagesDBWrapper(
      guildId, await getDbDocument(SavedMessages(), guildId));
  currentGuildDeletedMessages.messages[memberId.toString()] =
      SavedMessagesDBWrapperKeyData({
    "content": content,
    "deletedAt": deletedAt.toString(),
    "blacklistedItems": blacklistedItems
  });
  await setDbDocument(SavedMessages(), currentGuildDeletedMessages, guildId);
}

Future<Option<SavedMessagesDBWrapperKeyData>> getSavedMessage(
    Snowflake memberId, Snowflake guildId) async {
  final currentGuildDeletedMessages = SavedMessagesDBWrapper(
      guildId, await getDbDocument(SavedMessages(), guildId));
  return currentGuildDeletedMessages.messages.lookup(memberId.toString());
}

String actionToVerb(String action) => switch (action) {
      "ban" => "banned",
      "kick" => "kicked",
      "timeout" => "timed out",
      _ => action.split(" ")[0] == "role" ? "muted" : throw "Unknown action"
    };

String minutesToStringMinutes(String action, Option<int> minutes) =>
    action == "kick"
        ? ""
        : " ${minutes.map((t) => "for $t minutes").getOrElse(() => "forever")}";

Future<void> handlePunishmentAction(PunishmentData punishment, IMember member,
    ITextChannel channel, GuildId guildId) async {
  final action = punishment.action;
  final stringAction =
      action.split(" ")[0] == "role" ? "role add" : action.split(" ")[0];
  final minutes = punishment.minutes;
  final strikes = await getMemberStrikes(member.id, guildId);
  final auditReason = "Reached $strikes strikes";
  try {
    if (action.startsWith("role")) {
      // This means do the mute role
      final roleId = action.split(" ")[1];
      final roleOpt = getGuildRole(Snowflake(roleId));
      if (roleOpt case Some(value: final role)) {
        await member.addRole(role, auditReason: auditReason);
      }
    } else if (action == "ban") {
      await member.ban(reason: auditReason);
    } else if (action == "kick") {
      await member.kick(auditReason: auditReason);
    } else if (action == "timeout") {
      final timeoutMinutes = minutes
          .map((t) => DateTime.now().add(Duration(minutes: t)))
          .getOrElse(() => DateTime.now().add(Duration(days: 28)));
      final builder = MemberBuilder()..timeoutUntil = timeoutMinutes;
      await member.edit(builder: builder, auditReason: auditReason);
    }

    if (minutes case Some(value: final punishmentMinutes)) {
      await addTimedPunishment(
          DateTime.now().add(Duration(minutes: punishmentMinutes)),
          guildId,
          member.id,
          action);
    }
  } catch (e) {
    try {
      await channel.sendMessage(MessageBuilder.embed(EmbedBuilder()
        ..title = "Unable to perform $stringAction"
        ..description = """**An error occurred.**
**This is usually because of a permission error:**
- May be because ${member.mention} has a role that's above Bad Word Blocker's highest role.
- May be because ${member.mention} has the `administrator` permission, or is the owner.
- May be because Bad Word Blocker does not have the `Manage Messages` permission.

**Technical error:** ```$e```"""
        ..color = redEmbedColor));
      return;
    } catch (e) {
      return;
    }
  }

  final verb = actionToVerb(action);
  final stringMinutes = minutesToStringMinutes(action, minutes);
  await channel.sendMessage(MessageBuilder.embed(EmbedBuilder()
    ..title = "Limit Triggered"
    ..description =
        "${member.mention} was $verb$stringMinutes because they got **$strikes** strikes"
    ..color = redEmbedColor));
}

Future<List<LimitData>> getGuildLimits(GuildId guildId) async {
  List<LimitData> limits = [];
  final punishmentData =
      LimitsDBWrapper(guildId, await getDbDocument(Limits(), guildId));
  LimitData toLimitData(String key, PunishmentData value) =>
      (action: value.action, amount: int.parse(key), minutes: value.minutes);
  for (final (entry) in punishmentData.punishments.entries) {
    limits.add(toLimitData(entry.key, entry.value));
  }
  return limits;
}

Future<bool> isCountingLimits(Snowflake guildId) async {
  return (await getGuildLimits(guildId)).isNotEmpty;
}

Future<bool> isBypassing(
    GuildId guildId, Snowflake channelId, List<Role> userRoles) async {
  final bypasses = await getGuildBypasses(guildId);
  final hasMutualRoles = Option.fromNullable(userRoles.firstWhereOrNull(
      (userRole) => bypasses.roles.contains(userRole.id.toString()))).isSome();
  final isInBypassChannel = bypasses.channels.contains(channelId.toString());
  return hasMutualRoles || isInBypassChannel;
}

Future<bool> isEveryoneBypassing(GuildId guildId) async {
  final bypasses = await getGuildBypasses(guildId);
  final everyoneRoleId =
      guildId.toString(); // The @everyone role = the guild's id
  return bypasses.roles.contains(everyoneRoleId);
}

Future<Option<ChannelId>> getGuildLogChannel(GuildId guildId) async {
  final data =
      LogsChannelDBWrapper(guildId, await getDbDocument(Logs(), guildId));
  return data.channelId.map((t) => Snowflake(t));
}

Future<void> setGuildLogChannel(GuildId guildId, ChannelId channelId) async {
  final data =
      LogsChannelDBWrapper(guildId, await getDbDocument(Logs(), guildId));
  data.channelId = Some(channelId.toString());
  await setDbDocument(Logs(), data, guildId);
}

Future<void> removeGuildLogChannel(GuildId guildId) async {
  await deleteDbDocument(Logs(), guildId);
}

Option<IGuildChannel> getGuildChannel(Snowflake channelId) =>
    Option.fromNullable(client.channels
            .filter((channel) => channel.id == channelId)
            .values
            .firstOrNull)
        .map((channel) => channel as IGuildChannel);

Option<IRole> getGuildRole(Snowflake roleId) => client.guilds
    .mapValue((guild) => guild.roles)
    .values
    .map((entry) => entry.values)
    .flatten
    .filter((role) => role.id == roleId)
    .firstOption;

List<T> getItemsAtMultipleIndexes<T>(List<T> inputList, List<int> indexes) {
  if (indexes.isEmpty) return [];
  var counter = 0;
  var itemList = <T>[];
  for (final item in inputList) {
    if (indexes.contains(counter)) {
      itemList.add(item);
    }
    counter = counter + 1;
  }
  return itemList;
}

List<int> range(int start, int end) {
  // Note: the function includes the ending number by adding + 1
  final l = <int>[];
  var counter = start;
  while (!(counter == (end + 1))) {
    l.add(counter);
    counter += 1;
  }
  return l;
}

List<int> fillInIndexGaps(List<int> indexList) {
  if (indexList.isEmpty) {
    throw "fillInIndexGaps function index list can't be empty";
  }
  if (indexList.length == 1) return indexList;
  indexList.sort();
  final lowestIndex = indexList.first;
  final highestIndex = indexList.last;
  return range(lowestIndex, highestIndex);
}

String replaceFirstLetters(String input, int lettersToRemove, String replacement) =>
 replacement + input.skip(lettersToRemove);

  
String getInnerBlacklistItem(BlacklistItem input) =>
  switch(input) {
    Word(:final word) => word,
    Phrase(:final phrase) => phrase,
    Link(:final link) => link
  };


Future<String> replacePlaceholders(String input, IMessage message,
    GuildId guildId, List<FoundBadItemData> blacklistedItemsFound) async {
  final content = message.content;
  final now = DateTime.now();
  final currentStrikes = await getMemberStrikes(message.author.id, guildId);
  final guildLimits = await getGuildLimits(guildId);
  final defaultString = "(no upcoming limit)";
  final nextLimit = Option.fromNullable(
      guildLimits.firstWhereOrNull((limit) => limit.amount > currentStrikes));
  final strikesRemaining = nextLimit
      .map((t) => (t.amount - currentStrikes).toString())
      .getOrElse(() => "(no upcoming limit)");
  final nextLimitAction =
      nextLimit.map((t) => t.action).getOrElse(() => defaultString);
  final nextLimitMinutes = nextLimit
      .flatMap((t) => t.minutes.map((t) => t.toString()))
      .getOrElse(() => "forever");
  final nextLimitAmount =
      nextLimit.map((t) => t.amount.toString()).getOrElse(() => defaultString);

  var finalString = "";

  finalString = input
      .replaceAll("{username}", message.author.username)
      .replaceAll("{mention}", "<@${message.author.id}>")
      .replaceAll("{deleted_message}", content)
      .replaceAll("{content}",
          content) // Two of the same thing; the former is depricated
      .replaceAll("{strikes}", currentStrikes.toString())
      .replaceAll("{strikes_remaining}", strikesRemaining)
      .replaceAll("{blacklisted_items}",
          "`${blacklistedItemsFound.map((item) => item.blacklistItem.getStringItem()).join("`, `")}`")
      .replaceAll("{date}", now.toString())
      //..replaceAll("{blacklisted_item}", replace)
      .replaceAll("{next_limit_action}", nextLimitAction)
      .replaceAll("{next_limit_minutes}", nextLimitMinutes)
      .replaceAll("{next_limit_strikes}", nextLimitAmount);

  // The below code is to replace {content(replacementWord)} instances
  final replacementWords = finalString
      .split("{content(")
      .filter((fragment) => fragment.trim().endsWith(")}"))
      .map((fragment) => fragment.replaceAll(")}", "").trim());
  for (final replacementWord in replacementWords) {
    final instance = "{content($replacementWord)}";

    final modifiedContent = // Replace every instance of every bad word with the replacement word
        (() {
      var contentToChange = content;
      for (final data in blacklistedItemsFound
          ) {
        // Get the words making up the blacklited item (from indexes of bad permutation)
        final ogStringCorrospondingWordsSet = getItemsAtMultipleIndexes(
            content.split(" "), fillInIndexGaps(data.constructingWordIndexes));
        // Reconstruct them
        final ogStringCorrospondingWords =
            ogStringCorrospondingWordsSet.join(" ").trim();
        final replacementString = ogStringCorrospondingWords
          .split(" ").map((word) => replaceFirstLetters(word, getInnerBlacklistItem(data.blacklistItem).length, replacementWord)).join(" ");
        // Replace them
        contentToChange = contentToChange.replaceAll(
            ogStringCorrospondingWords, replacementString);
      }
      return replaceEveryInstance(contentToChange, Set.from(blacklistedItemsFound.map((e) => getInnerBlacklistItem(e.blacklistItem))), replacementWord);
    })();

    finalString = finalString.replaceAll(instance, modifiedContent);
  }

  return finalString;
}

String getCommandArgument(Iterable<IInteractionOption> options, int index) {
  return options.first.options.toList()[index].value.toString();
}

(ModifierData, String) getModifiersAndRemove(String inputString) {
  var returnStr = inputString;
  final hasSkipChecksModifier = inputString.startsWith("_");
  final hasExactMatchModifier = inputString.startsWith("&");
  if (hasSkipChecksModifier) {
    returnStr = inputString.replaceFirst("_", "");
  }
  if (hasExactMatchModifier) {
    returnStr = inputString.replaceAll("&", "");
  }

  return (
    (skipChecks: hasSkipChecksModifier, exactMatch: hasExactMatchModifier),
    returnStr
  );
}

List<BlacklistItem> toBlacklistItems(Blacklist blacklist) {
  final words = blacklist.words.map((word) {
    final (modifiers, newWord) = getModifiersAndRemove(word);
    return Word(newWord, modifiers);
  }).toList();
  List<BlacklistItem> blacklistItems = []
    // ignore: prefer_spread_collections
    ..addAll(words)
    ..addAll(blacklist.phrases.map((phrase) => Phrase(phrase)))
    ..addAll(blacklist.links.map((link) => Link(link)));

  return blacklistItems;
}

Future<void> deleteAllServerData(Snowflake guildId) async {
  await deleteDbDocument(InexactMatch(), guildId);
  await deleteDbDocument(Phrases(), guildId);
  await deleteDbDocument(Links(), guildId);
  await deleteDbDocument(Bypasses(), guildId);
  await deleteDbDocument(CustomMessages(), guildId);
  await deleteDbDocument(Strikes(), guildId);
  await deleteDbDocument(Limits(), guildId);
  await deleteDbDocument(TimedPunishments(), guildId);
  await deleteDbDocument(Logs(), guildId);
  await deleteDbDocument(SavedMessages(), guildId);
}

Future<void> postStatsToTopgg() async {
  print(customGuildCache.length);
  final url = Uri.https("top.gg", "/api/bots/${client.appId}/stats");
  final body = {
    "server_count": client.guilds.length.toString(),
    "shard_count": client.shards.toString()
  };
  final res =
      await http.post(url, body: body, headers: {"Authorization": topggToken});
  print(res.statusCode);
}

Future<bool> hasVoted(Snowflake userId) async {
  final url = Uri.https("top.gg", "/api/bots/${client.appId}/check");
  final response = await http.get(url, headers: {"userId": userId.toString()});
  return jsonDecode(response.body)["voted"] == 1;
}

String limitStringLength(String inputString, int limit) {
  if (inputString.length > limit) {
    return inputString.substring(0, limit);
  } else {
    return inputString;
  }
}

// Some people paid to remove the footer, so this function detetmines it
String? getBlockedEmbedFooter(Snowflake guildId) {
  // return "Run /get to get your message back";
  if (guildId.toString() == "737428668816818216") {
    return null;
  } else {
    return "Run /get to get your message back";
  }
}

bool isPremiumUser(UserId userId) => premiumUsers.contains(userId.toString());

/* Future<bool> isPremiumUser(UserId userId) async {
  final url = Uri.parse(
      "https://patreon.com/api/oauth2/v2/campaigns/9498338/members?include=currently_entitled_tiers,user&fields[member]=next_charge_date,patron_status&fields[user]=social_connections");

  final headers = {
    "Authorization": "Bearer Xu1dQ23aeRsxLWdPu5m2t6usuOPyzxjzaSky5g3a1U4"
  };
  //final url = Uri.http("127.0.0.1:8080", "/premiumusers"); :

  final response =
      jsonDecode((await http.get(url, headers: headers)).body) as Map;
  final applicableUsers = (response["data"] as List<dynamic>)
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
          (data) => data["id"] == patronId)) // Now map it to their Discord IDs
      .map((data) =>
          data["attributes"]["social_connections"]["discord"]?["user_id"])
      .filter((data) => data != null) // They may not have their Discord linked
      .map((id) => id.toString());

  return applicableUsers.contains(userId.toString());
}
 */
Future<List<PremiumServersDBWrapper>> getPremiumizedGuildsByUser(
    UserId userId) async {
  final allPremiumGuilds = await db
      .collection(getCollectionName(PremiumServers()))
      .find()
      .map((e) => PremiumServersDBWrapper(Snowflake(e["_id"]), Some(e)))
      .toList();
  final serversPremiumizedByUser = allPremiumGuilds.filter((guildData) =>
      guildData.premiumData
          .exists((premiumData) => premiumData.userId == userId));

  return serversPremiumizedByUser.toList();
}

Future<PremiumServerKeyDataDBWrapper> getUserByPremiumizedGuild(
    UserId userId, GuildId guildId) async {
  final allPremiumGuilds = await db
      .collection(getCollectionName(PremiumServers()))
      .find()
      .map((e) => PremiumServersDBWrapper(Snowflake(e["_id"]), Some(e)))
      .toList();
  for (final premiumGuild in allPremiumGuilds) {
    for (final premiumData in premiumGuild.premiumData) {
      if (premiumGuild.id == guildId && premiumData.userId == userId) {
        return premiumData;
      }
    }
  }
  throw "(from getUserByPremiumizedGuild function) Not found.";
}

// Gets the members who gave the server premium
Future<PremiumServersDBWrapper> getGuildPremiumizers(GuildId guildId) async {
  return PremiumServersDBWrapper(
      guildId, await getDbDocument(PremiumServers(), guildId));
}

// Checks if server is premium
Future<bool> isPremiumGuild(GuildId guildId) async {
  final usersWhoGaveThisGuildPremium =
      (await getGuildPremiumizers(guildId)).premiumData;

  // If any one of the users still have premium
  return usersWhoGaveThisGuildPremium
          .exists((data) => data.isUserPremiumActive) ||
      permantPremiumGuilds.contains(guildId.toString());
}

// Gives a server premium
Future<void> premiumizeGuild(GuildId guildId, UserId userId) async {
  final data = await getGuildPremiumizers(guildId);
  data.premiumData
      .add(PremiumServerKeyDataDBWrapper(DateTime.now(), userId, true));
  await setDbDocument(PremiumServers(), data, guildId);
}

Future<void> removePremium(GuildId guildId, UserId userId) async {
  final data = await getGuildPremiumizers(guildId);
  data.premiumData =
      data.premiumData.filter((data) => data.userId != userId).toList();
  await setDbDocument(PremiumServers(), data, guildId);
}

Option<IGuild> getGuildFromCache(GuildId guildId) =>
    client.guilds.lookup(guildId);
