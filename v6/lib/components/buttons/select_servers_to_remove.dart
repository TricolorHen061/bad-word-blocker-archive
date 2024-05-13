import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> selectServersToRemoveButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final authorId = event.interaction.userAuthor!.id;
  final isPremium = isPremiumUser(authorId);
  if (isPremium) {
    final premiumGuilds = await getPremiumizedGuildsByUser(authorId);
    // ignore: no_leading_underscores_for_local_identifiers
    final _applicableGuilds = premiumGuilds // < 15 days guilds removed
        .map((premiumGuild) => premiumGuild.id)
        .map((premiumGuildId) =>
            (premiumGuildId, getGuildFromCache(premiumGuildId)));
    final applicableGuilds = <(Snowflake, Option<IGuild>)>[];
    for (final applicableGuildData in _applicableGuilds) {
      final isApplicable = DateTime.now().isAfter(
          (await getUserByPremiumizedGuild(authorId, applicableGuildData.$1))
              .givenOn
              .add(Duration(days: 15)));
      if (isApplicable) {
        applicableGuilds.add(applicableGuildData);
      }
    }
    final dropdownOptions = applicableGuilds
        .map((guildData) => (
              guildData.$1,
              guildData.$2
                  .map((guild) => "${guild.name} (ID: ${guild.id})")
                  .getOrElse(() => "Unkown Server. (ID: ${guild.id})")
            ))
        .map((guildData) =>
            MultiselectOptionBuilder(guildData.$2, guildData.$1.toString()));
    if (dropdownOptions.isNotEmpty) {
      final embed = EmbedBuilder()
        ..title = "Remove servers"
        ..description =
            "Please select the servers you'd like to remove. Servers you gave premium to less than 15 days ago are excluded."
        ..color = blueEmbedColor;
      final componentMessageBuilder = ComponentMessageBuilder()
        ..embeds = [embed]
        ..componentRows = [
          ComponentRowBuilder()
            ..addComponent(
                MultiselectBuilder("remove_premium_servers", dropdownOptions)
                  ..maxValues = dropdownOptions.length)
        ];
      await event.respond(componentMessageBuilder, hidden: true);
    } else {
      final embed = EmbedBuilder()
        ..title = "No servers you can remove"
        ..description =
            "There are currently no servers you can remove. Please note that you can only remove a server from your account after 15 days has passed since you added it."
        ..color = blueEmbedColor;
      final componentMessageBuilder = ComponentMessageBuilder()
        ..componentRows = []
        ..embeds = [embed];
      await event.respond(componentMessageBuilder, hidden: true);
    }
  } else {
    final embed = EmbedBuilder()
      ..title = "Please try again"
      ..description = "Please try again"
      ..color = greyEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
