import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> premiumManageCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final authorId = event.interaction.userAuthor!.id;
  final isPremium = isPremiumUser(authorId);
  if (isPremium) {
    final premiumizedGuilds = await getPremiumizedGuildsByUser(authorId);
    final premiumizedGuildsLeft = 5 - premiumizedGuilds.length;
    final premiumGuildsData = premiumizedGuilds
        .map((premiumGuild) => premiumGuild.id)
        .map((premiumGuildId) =>
            (premiumGuildId, getGuildFromCache(premiumGuildId)));

    //.map((guildData) => guildData.$2.getOrElse(() => "<Unknown. ID of server is ${guildData.$1}>"));
    final premiumServersNames = premiumGuildsData
        .map((guildData) => (
              guildData.$1,
              guildData.$2.map(
                  (guild) => "**${guild.name}** (Server ID: ${guildData.$1})")
            ))
        .map((guildData) => guildData.$2
            .getOrElse(() => "Unknown Server. (Server ID: ${guildData.$1})"))
        .join("\n- ");

    final secondInfoPoint = premiumizedGuildsLeft != 5
        ? "**__Servers part of your subscription__** (${premiumizedGuilds.length} servers added, $premiumizedGuildsLeft remaining):\n - $premiumServersNames"
        : "\n You have not added any servers to your premium subscription. To give premium to a server, use the `/premium add` command.";

    final embed = EmbedBuilder()
      ..title = "Your Premium Subscription"
      ..description = """
**__Premium Status:__** *Is Premium* :white_check_mark: 
$secondInfoPoint
"""
      ..color = premiumGoldEmbedColor;
    final componentMessageBuilder = ComponentMessageBuilder()
      ..embeds = [embed]
      ..componentRows = [
        if (premiumGuildsData.isNotEmpty)
          ComponentRowBuilder()
            ..addComponent(ButtonBuilder("Select servers to remove",
                "select_servers_to_remove", ButtonStyle.secondary))
      ];

    await event.respond(componentMessageBuilder, hidden: true);
  } else {
    final embed = EmbedBuilder()
      ..title = "You're not a premium user"
      ..description =
          """You don't have a premium subscription. You can subscribe [here]($patreonPremiumLink) for \$2.49/month.

If you already subscribed, please make sure your [Patreon account is linked to this Discord account](https://support.patreon.com/hc/en-us/articles/212052266-Getting-Discord-access#h_01FEHWFEG74VEG6NV146DE93ST)"""
      ..color = blueEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
