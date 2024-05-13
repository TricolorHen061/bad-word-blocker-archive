import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Either<String, IGuildChannel> fetchGuildChannel(
        GuildId guildId, String channelId) =>
    Either.fromNullable(
        client.channels
            .filter((channel) => channel.id.toString() == channelId)
            .values
            .firstOrNull,
        () => channelId).map((channel) => channel as IGuildChannel);

/* getChannelFromCache(guildId, Snowflake(channelId))
        .toEither(() => channelId); */

Future<void> manageBypassChannelsButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final bypasses = await getGuildBypasses(guild.id);

  final dropDownOptions = bypasses.channels
      .map((bypassChannelId) => fetchGuildChannel(guild.id, bypassChannelId))
      .map((e) => e.map((t) => ["#${t.name} (ID: ${t.id})", t.id.toString()]))
      .map((e) =>
          e.getOrElse((deletedChannelId) => ["<deleted>", deletedChannelId]))
      .map((e) => MultiselectOptionBuilder(e.elementAt(0), e.elementAt(1)))
      .toList();
  final componentMessageBuilder = ComponentMessageBuilder()
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(MultiselectBuilder("remove_channels", dropDownOptions)
          ..placeholder = "Click here"
          ..maxValues = dropDownOptions.length)
    ]
    ..embeds = [
      EmbedBuilder()
        ..title = "Managing Bypass Channels"
        ..description =
            """Below is a list of all current bypass channels in this server.
      To view, click the bar below.
      To remove, select the desired channel and then click the bar again."""
        ..color = blueEmbedColor
    ];
  if (bypasses.channels.isNotEmpty) {
    await event.respond(componentMessageBuilder, hidden: true);
  } else {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "No Bypass Channels"
          ..description =
              "No channels are currently bypassing the bot. Use the `/bypass channel` command to add some."
          ..color = blueEmbedColor
      ]
      ..componentRows = [];
    await event.respond(messageBuilder, hidden: true);
  }
}
