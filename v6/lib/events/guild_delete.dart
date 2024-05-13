import 'package:bad_word_blocker_dart/globals.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

Future<void> onGuildDelete(IGuildDeleteEvent event) async {
  if (!isFinishedReceivingServers) return;
  // await deleteAllServerData(event.guild.id);
  print("----------Guild delete event being run----------");
  final bwbLogChannel = await client.fetchChannel(Snowflake(bwbLogChannelId));
  final cachedGuild = customGuildCache
      .filter((guildData) => guildData.id == event.guild.id)
      .first;
  await (bwbLogChannel as ITextGuildChannel)
      .sendMessage(MessageBuilder.embed(EmbedBuilder()
        ..title = "Left Guild"
        ..description = "Bad Word Blocker left a guild"
        ..addField(name: "Name", content: cachedGuild.name)
        ..addField(name: "Members", content: cachedGuild.memberCount.toString())
        ..color = redEmbedColor
        ..thumbnailUrl = cachedGuild.iconUrl));

  // Finally, delete it from the cache
  customGuildCache.removeWhere((guildData) => guildData.id == event.guild.id);
}
