import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:bad_word_blocker_dart/utils/wrappers/database.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

Future<void> bypassRoleCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final roleId = getCommandArgument(event.interaction.options, 0);
  final bypasses = await getGuildBypasses(guild.id);
  final isPremium = await isPremiumGuild(guild.id);
  final roleLimit = isPremium ? 50 : 25;
  if (bypasses.roles.length + 1 > roleLimit) {
    final embed = EmbedBuilder()
      ..title = "Too Many Bypass Roles"
      ..description =
          "You have **${bypasses.roles.length}** roles. You can have a max of 25. Please remove some before trying to add more. Alternatively, you can get [premium]($patreonPremiumLink) to have up to 50 roles."
      ..color = redEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else if (bypasses.roles.contains(roleId)) {
    final embed = EmbedBuilder()
      ..title = "Role"
      ..description = "You already have this role added"
      ..color = greyEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else {
    final embed = EmbedBuilder()
      ..title = "Role Added"
      ..description =
          "Role successfully added to bypass list. Everyone with this role will bypass the bot's filter."
      ..color = greenEmbedColor
      ..author = premiumAuthorBuilder;
    bypasses.roles.add(roleId);
    await setDbDocument(Bypasses(), bypasses, guild.id);
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
