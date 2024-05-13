import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_filter/extensions.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> premiumAddCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final authorId = event.interaction.userAuthor!.id;
  final isPremium = isPremiumUser(authorId);
  final guildName = (await guild.getOrDownload()).name;
  if (isPremium) {
    final premiumizedGuilds = await getPremiumizedGuildsByUser(authorId);
    final guildAlreadyAdded =
        premiumizedGuilds.exists((premiumGuild) => premiumGuild.id == guild.id);

    final guildsLeft = 5 - premiumizedGuilds.length;
    if (guildAlreadyAdded) {
      final embed = EmbedBuilder()
        ..title = "Server Already Added"
        ..description =
            "This server is already part of your premium subscription. If you want to remove it, use the `/premium manage` command."
        ..color = redEmbedColor;
      await event.respond(MessageBuilder.embed(embed), hidden: true);
    } else if (guildsLeft != 0) {
      final embed = EmbedBuilder()
        ..title = "Are you sure?"
        ..description =
            """- You're about to add this server, "$guildName", to your premium subscription. 
- If you continue, this server will get access to all [premium benefits]($patreonPremiumLink), and you will have ${guildsLeft - 1} uses left you can use on other servers.
- You will be able to remove this server from your subscription after 15 days.

**Do you want to continue?**"""
        ..color = blueEmbedColor;
      final messageBuilder = ComponentMessageBuilder()
        ..embeds = [embed]
        ..componentRows = [
          ComponentRowBuilder()
            ..addComponent(ButtonBuilder(
                "Yes, continue", "add_premium_server", ButtonStyle.primary))
            ..addComponent(ButtonBuilder("No", "cancel", ButtonStyle.secondary))
        ];
      await event.respond(messageBuilder, hidden: true);
    } else {
      final embed = EmbedBuilder()
        ..title = "You're out of servers"
        ..description =
            "You've used up all 5 of your premium servers. Please remove one (using `/patreon manage`) and try again."
        ..color = redEmbedColor;
      await event.respond(MessageBuilder.embed(embed), hidden: true);
    }
  } else {
    final embed = EmbedBuilder()
      ..title = "You're not a premium user"
      ..description =
          "Sorry, but you do not have a premium subscription. To purchase one for \$2.49/month, please click [here]($patreonPremiumLink)"
      ..color = redEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
