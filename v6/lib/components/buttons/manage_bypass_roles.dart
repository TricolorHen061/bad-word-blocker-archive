import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';
import 'package:fpdart/fpdart.dart';

Either<String, IRole> fetchGuildRole(String roleId, GuildId guildId) =>
    getGuildRole(Snowflake(roleId)).toEither(() => roleId);

Future<void> manageBypassRolesButtonHandler(
    IButtonInteractionEvent event, Cacheable<Snowflake, IGuild> guild) async {
  final bypasses = await getGuildBypasses(guild.id);
  final dropDownOptions = bypasses.roles
      .map((bypassRoleId) => fetchGuildRole(bypassRoleId, guild.id))
      .map((bypassRoleId) => bypassRoleId
          .map((t) => ["@${t.name} (ID: ${t.id})", t.id.toString()]))
      .map((bypassRoleId) => bypassRoleId
          .getOrElse((deletedRoleId) => ["<deleted>", deletedRoleId]))
      .map((bypassRoleId) => MultiselectOptionBuilder(
          bypassRoleId.elementAt(0), bypassRoleId.elementAt(1)))
      .toList();

  final componentMessageBuilder = ComponentMessageBuilder()
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(MultiselectBuilder("remove_roles", dropDownOptions)
          ..placeholder = "Click here"
          ..maxValues = dropDownOptions.length)
    ]
    ..embeds = [
      EmbedBuilder()
        ..title = "Managing Bypass Roles"
        ..description =
            """Below is a list of all current bypass roles in this server.
      To view, click the bar below.
      To remove, select the desired roles and then click the bar again."""
        ..color = blueEmbedColor
    ];

  if (bypasses.roles.isNotEmpty) {
    await event.respond(componentMessageBuilder, hidden: true);
  } else {
    final messageBuilder = ComponentMessageBuilder()
      ..embeds = [
        EmbedBuilder()
          ..title = "No Bypass Roles"
          ..description =
              "No roles are currently bypassing the bot. Use the `/bypass role` command to add some."
          ..color = blueEmbedColor
      ]
      ..componentRows = [];
    await event.respond(messageBuilder, hidden: true);
  }
}
