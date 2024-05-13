import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';

Future<void> onGuildCreate(IGuildCreateEvent event) async {
  // This gets called at startup and when it joins a new server
  final guild = event.guild;

  customGuildCache.add((
    name: guild.name,
    memberCount: guild.memberCount!,
    iconUrl: guild.iconUrl(animated: true),
    id: guild.id
  ));

  /* if (!isGuildInRoleCache(guildId)) {
    setGuildCacheRoles(guildId, guild.roles);
  }
   
  if (!isGuildInChannelCache(guildId)) {
    setGuildCacheChannels(guildId, guild.channels.toList());
  }
  return; */
  if (!isFinishedReceivingServers) return;
  print("------------Guild create event being run--------");
  final bwbLogChannel = await client.fetchChannel(Snowflake(bwbLogChannelId));
  await (bwbLogChannel as ITextGuildChannel)
      .sendMessage(MessageBuilder.embed(EmbedBuilder()
        ..title = "Joined Guild"
        ..description = "Bad Word Blocker joined a new guild"
        ..addField(name: "Name", content: event.guild.name)
        ..addField(name: "Members", content: event.guild.memberCount.toString())
        ..color = greenEmbedColor
        ..thumbnailUrl = guild.iconUrl(animated: true)));

  await saveBlacklist(defaultBlacklistWords, defaultBlacklistPhrases,
      defaultBlacklistLinks, guild.id);

  // Find the first channel the bot can send messages in, send the welcome message, and then break out the loop
  for (final channel in event.guild.channels) {
    if (channel.channelType.runtimeType != ITextChannel) continue;
    try {
      await (channel as ITextChannel)
          .sendMessage(MessageBuilder.embed(EmbedBuilder()
            ..title = "Thanks For Inviting"
            ..description = """**Thank you for inviting Bad Word Blocker!**
The bot should start filtering your server immediately; you don't need to do anything.

__**If you would like to customize the bot, here are a few commands do get you started:**__
**/blacklist** - Edit the blacklist
**/customize_embed** - Customize what is shown when a message is blocked
**/get**- Gets your last blocked message (if any)
**/bypass** - Allows a role or channel to bypass the bot

- You can find the instruction guide for the bot [here]($docsLink).
- If you have questions/problems, please join the [support server here]($serverInvite).

"""
            ..color = blueEmbedColor
            ..thumbnailUrl = guild.iconUrl(animated: true)));
    } catch (_) {
      // Means the bot can't (no permission?) send the message there.
      continue;
    }
  }
}
