import 'package:bad_word_blocker_dart/commands/fix.dart';
import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_filter/english_filter.dart';
import 'package:bad_word_blocker_filter/types.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

Future<void> blockMessage(
    IMessage message,
    GuildId guildId,
    bool isLimitTriggered,
    bool isLimits,
    int strikes,
    List<FoundBadItemData> blacklistItems) async {
  final isPremium = await isPremiumGuild(guildId);
  final embedData = await getGuildCustomEmbedInfo(guildId);
  final embedTitle = isPremium ? embedData.title : "Message Blocked";
  final embedColor = isPremium ? embedData.color : redEmbedColor.value;
  final isCustomContent = embedData.content != defaultEmbedValue;
  final isEveryoneBypass = await isEveryoneBypassing(guildId);

  final content = isLimits && !isCustomContent
      ? "${embedData.content} They now have **$strikes** strikes"
      // This adds on to the default embed content ^
      : embedData.content;

  final logChannelOpt = await getGuildLogChannel(guildId);

  if (!isEveryoneBypass) {
    try {
      await message.delete();
    } catch (e) {
      try {
        if (!e.toString().contains("Unknown")) {
          await message.channel.sendMessage(
              MessageBuilder.content(":x: Unable to delete message: ```$e```"));
        }
      } catch (_) {
        // Do nothing. If it gets here, it means the bot can't even send messages
      }
    }
  }
  if (!isLimitTriggered) {
    // Only do this if no limit was triggered. We don't want two messages.
    final embed = EmbedBuilder()
      ..title = embedTitle
      ..description =
          await replacePlaceholders(content, message, guildId, blacklistItems)
      ..color = DiscordColor.fromInt(embedColor)
      ..footer = EmbedFooterBuilder(text: getBlockedEmbedFooter(guildId))
      ..author = EmbedAuthorBuilder(
          iconUrl: message.author.avatarUrl(animated: true),
          name: message.author.username);

    final secondsToWait = embedData.cleanupSecondsAmount;

    if (secondsToWait != -1) {
      final blockMessage =
          await message.channel.sendMessage(MessageBuilder.embed(embed));
      if (secondsToWait != 0) {
        await Future.delayed(Duration(seconds: secondsToWait));
        try {
          await blockMessage.delete();
        } catch (_) {
          // Do nothing
        }
      }
    }
  }

  if (logChannelOpt case Some(value: final logChannelId)) {
    final logChannelOpt = getGuildChannel(logChannelId);
    if (logChannelOpt case Some(value: final logChannel)) {
      try {
        await (logChannel as ITextGuildChannel).sendMessage(
            MessageBuilder.embed(EmbedBuilder()
              ..title = "Message Blocked"
              ..addField(name: "Channel", content: "<#${message.channel}>")
              ..addField(
                  name: "Content",
                  content: limitStringLength("`${message.content}`", 1024))
              // ignore: prefer_interpolation_to_compose_strings
              ..addField(
                name: "Blacklisted Item(s) Found",
                content: blacklistItems
                    .map((e) => e.blacklistItem.getStringItem())
                    .join(", "),
              )
              ..color = redEmbedColor
              ..author = EmbedAuthorBuilder(
                  name: message.author.username,
                  iconUrl: message.author.avatarUrl())));
      } catch (_) {
        // Means the bot can't send in the log channel. Do nothing.
      }
    }
  }
}

bool isMuteRoleMessage(IMessage message) =>
    pendingMuteRoleAdditions.values
        .map((e) => e.userId)
        .contains(message.author.id) &&
    message.roleMentions.isNotEmpty;

Future<void> handleAddMuteRole(
    IMessage message, GuildId guildId, IMember member) async {
  final role = message.roleMentions.first;
  final information = pendingMuteRoleAdditions[guildId]!;
  final descMinutes = information.minutes
      .map((t) => "for $t minutes")
      .getOrElse(() => "forever");
  await addPunishment(
      information.amount, "role ${role.id}", information.minutes, guildId);
  final embed = EmbedBuilder()
    ..title = "Limit added"
    ..description =
        "When a member gets **${information.amount}** strikes, then they will receive role <@${role.id}> **$descMinutes**"
    ..color = greenEmbedColor;
  await message.channel.sendMessage(MessageBuilder.embed(embed));
  pendingMuteRoleAdditions =
      pendingMuteRoleAdditions.filterWithKey((key, value) => key != guildId);
}

Future<void> handleGuildMessage(
    IMessage message, GuildId guildId, IMember member) async {
  if (message.content == "!ispremuser" &&
      member.id.toString() == ownerId.toString()) {
    await message.channel.sendMessage(
        MessageBuilder.content((isPremiumUser(member.id)).toString()));
  }
  if (isMuteRoleMessage(message)) {
    await handleAddMuteRole(message, guildId, member);
    return;
  }
  final isBypass =
      await isBypassing(guildId, message.channel.id, member.roles.toList());

  if (message.author.bot || isBypass) {
    return;
  }
  final blacklist = await getBlacklist(guildId);
  /* print("------------Going in-------------");
  print(blacklist);
  print(message.content); */
  final badItems =
      englishFilter(message.content.toLowerCase(), toBlacklistItems(blacklist));
  if (badItems.isNotEmpty) {
    /* print("--------Blocked following message------------");
    print(message.content);
    print("For blacklisted items:");
    print(badItems.map((e) => e.blacklistItem.getStringItem()).join(", "));
    print(blacklist); */
  }
  if(message.content == "!fixit") {
    await message.channel.sendMessage(MessageBuilder.content("Ok"));
    await fixStuff();
    await message.channel.sendMessage(MessageBuilder.content("Done"));
  }
  if (badItems.isNotEmpty) {
    final isLimits = await isCountingLimits(guildId);
    final newStrikes = isLimits // The new amount of strikes
        ? await addOneStrike(message.author.id, guildId)
        : await getMemberStrikes(message.author.id, guildId);
    final punishmentOpt = await getMemberPunishment(newStrikes, guildId);
    if (punishmentOpt case Some(value: final punishment)) {
      await handlePunishmentAction(
          punishment, member, message.channel, guildId);
    }

    await blockMessage(message, guildId, punishmentOpt.isSome(), isLimits,
        newStrikes, badItems);

    final stringBlacklistItems =
        badItems.map((e) => e.blacklistItem.getStringItem()).toList();
    await saveMessage(message.content, DateTime.now(), stringBlacklistItems,
        member.id, guildId);
    if (getGuildChannel(Snowflake("1161843996600041553"))
        case Some(value: final channel)) {
      if (!message.content.contains("@everyone") &&
          !message.content.contains("@here")) {
        await (channel as ITextChannel).sendMessage(MessageBuilder.content(
            "Blocked \"${message.content}\" for word ${stringBlacklistItems.first} in guild ${(await message.guild?.getOrDownload())?.name}"));
      }
    }
  }
}
