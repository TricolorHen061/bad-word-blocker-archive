import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> bypassChannelCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final channelId = getCommandArgument(event.interaction.options, 0);
  final bypasses = await getGuildBypasses(guild.id);
  final isPremium = await isPremiumGuild(guild.id);
  final channelLimit = isPremium ? 50 : 25;
  if (bypasses.channels.length + 1 >= channelLimit) {
    final embed = EmbedBuilder()
      ..title = "Too Many Bypass Channels"
      ..description =
          "You have **${bypasses.channels.length}** channels. You can have a max of 25. Please remove some before trying to add more. Alternatively, you can purchase [premium]($patreonPremiumLink) to have up to 50."
      ..color = redEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else if (bypasses.channels.contains(channelId)) {
    final embed = EmbedBuilder()
      ..title = "Channel"
      ..description = "You already have this channel added"
      ..color = greyEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else {
    final embed = EmbedBuilder()
      ..title = "Channel Added"
      ..description =
          "Channel successfully added to bypass list. Every message sent in that channel will bypass the bot's filter."
      ..color = greenEmbedColor
      ..author = premiumAuthorBuilder;
    bypasses.channels.add(channelId);
    await setDbDocument(Bypasses(), bypasses, guild.id);
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
