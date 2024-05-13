import 'package:bad_word_blocker_dart/globals.dart';
import 'package:bad_word_blocker_dart/types.dart';
import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';
import 'package:nyxx_interactions/nyxx_interactions.dart';

List<String> getErrors(int amount, String action, Option<int> minutesOpt) {
  final errors = <String>[];

  // Basic checks

  if (amount > 500) {
    errors.add("Strike amount cannot be over 500.");
  }
  if (amount < 1) {
    errors.add("Strike amount cannot be below 1");
  }
  if (minutesOpt case Some(value: final minutes)) {
    if (minutes <= 0) {
      errors.add("Duration needs to be over 0");
    }
  }

  // Specific checks
  if (action == "ban") {
    if (minutesOpt case Some(value: final minutes)) {
      if (minutes > 131400 /* ~3 months */) {
        errors.add(
            "Ban duration cannot exceed 3 months. If you want to ban forever, then just leave the `duration` option blank.");
      }
    }
  } else if (action == "kick") {
    if (minutesOpt.isSome()) {
      errors.add(
          "You can't undo a kick. Please leave the `duration` option blank.");
    }
  } else if (action == "timeout") {
    if (minutesOpt case Some(value: final minutes)) {
      if (minutes > 38880 /* 27 days */) {
        errors.add(
            "A timeout cannot exceed 27 days. If you want to mute forever, then it's suggested you use a mute role instead.");
      }
    } else {
      errors.add("You need to set a duration for a timeout.");
    }
  } else if (action == "mute_role") {
    if (minutesOpt case Some(value: final minutes)) {
      if (minutes > 131400 /* ~3 months */) {
        errors.add(
            "Mute role duration cannot exceed 3 months. If you want to mute forever, then just leave the `duration` option blank.");
      }
    }
  }

  return errors.map((e) => "- $e").toList();
}

Future<void> limitsAddCommandHandler(
    ISlashCommandInteractionEvent event, Guild guild) async {
  final options = event.interaction.options;
  final existingLimits = await getGuildLimits(guild.id);
  final isPremium = await isPremiumGuild(guild.id);
  final limitsLimit = isPremium ? 50 : 7;
  final amount = int.parse(getCommandArgument(options, 0).replaceAll(".0", ""));
  final action = getCommandArgument(options, 1);
  final minutes =
      Option.tryCatch(() => getCommandArgument(options, 2)).map(int.parse);
  final errors = getErrors(amount, action, minutes);
  if (errors.isNotEmpty) {
    final embed = EmbedBuilder()
      ..title = "Error(s)"
      ..description =
          ["The following errors have occurred:", ...errors].join("\n")
      ..color = redEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else if (existingLimits.length + 1 > limitsLimit) {
    final embed = EmbedBuilder()
      ..title = "Limit reached"
      ..description =
          "You can only have $limitsLimit limits. Upgrade to [premium]($patreonPremiumLink) to get up to 50."
      ..color = redEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  } else if (action == "mute_role") {
    final embed = EmbedBuilder()
      ..title = "Add Mute Role"
      ..description =
          "You have chosen to use a mute role for the action. Please ping the @role you want to use when this limit is triggered."
      ..color = blueEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
    pendingMuteRoleAdditions[guild.id] = (
      userId: event.interaction.userAuthor!.id,
      amount: amount,
      minutes: minutes
    );
  } else {
    await addPunishment(amount, action, minutes, guild.id);
    final verb = actionToVerb(action);
    final descMinutes = minutesToStringMinutes(action, minutes);
    final embed = EmbedBuilder()
      ..title = "Limit Added"
      ..description =
          "When a member gets **$amount** strikes, they'll get **$verb$descMinutes**."
      ..color = greenEmbedColor;
    await event.respond(MessageBuilder.embed(embed), hidden: true);
  }
}
