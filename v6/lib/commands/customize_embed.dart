import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

customizeEmbedCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final customEmbedInfo = await getGuildCustomEmbedInfo(guild.id);
  final isPremium = await isPremiumGuild(guild.id);
  final modalBuilder = ModalBuilder("customize_embed", "Customize Embed")
    ..componentRows = [
      ComponentRowBuilder()
        ..addComponent(TextInputBuilder("title", TextInputStyle.short,
            "Embed Title${isPremium ? "" : " (Disabled, premium only)"}")
          ..required = true
          ..placeholder = "Title of embed. This will go on top of the embed."
          ..maxLength = isPremium ? 256 : 12
          ..value = isPremium ? customEmbedInfo.title : "Premium Only"),
      ComponentRowBuilder()
        ..addComponent(TextInputBuilder(
            "description", TextInputStyle.paragraph, "Embed Description")
          ..required = true
          ..placeholder =
              "Description of embed. This will be the main content of the embed"
          ..value = customEmbedInfo.content),
      ComponentRowBuilder()
        ..addComponent(TextInputBuilder("color", TextInputStyle.short,
            "Embed Color${isPremium ? "" : " (Disabled, premium only)"}")
          ..required = true
          ..placeholder =
              "Int value of the embed. The color will be on the left side of the embed."
          ..maxLength = isPremium ? 8 : 12
          ..value =
              isPremium ? customEmbedInfo.color.toString() : "Premium Only"),
      ComponentRowBuilder()
        ..addComponent(TextInputBuilder(
            "cleanup_after", TextInputStyle.short, "Delete Embed After Seconds")
          ..required = true
          ..placeholder =
              "-1 = don't send, 0 = don't delete, other = seconds to wait before deletion"
          ..maxLength = 5
          ..value = customEmbedInfo.cleanupSecondsAmount.toString())
    ];
  await event.respondModal(modalBuilder);
}
