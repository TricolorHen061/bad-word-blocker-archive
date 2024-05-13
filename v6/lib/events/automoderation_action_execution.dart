import 'package:bad_word_blocker_dart/utils/helpers.dart';
import 'package:fpdart/fpdart.dart';
import 'package:nyxx/nyxx.dart';

Future<void> onAutoModerationActionExecution(
    IAutoModerationActionExecutionEvent event) async {
  if (event.action.actionType == ActionTypes.blockMessage &&
      await isPremiumGuild(event.guild.id)) {
    final memberCache = event.member;
    final guild = event.guild;
    print(event.action.actionType.name);
    print(event.action.actionMetadata);
    final isLimits = await isCountingLimits(guild.id);
    final newStrikes = isLimits // The new amount of strikes
        ? await addOneStrike(memberCache.id, guild.id)
        : await getMemberStrikes(memberCache.id, guild.id);
    final punishmentOpt = await getMemberPunishment(newStrikes, guild.id);
    if (punishmentOpt case Some(value: final punishment)) {
      final channelOpt = getGuildChannel(event.channel!.id);
      if (channelOpt case Some(value: final channel)) {
        await handlePunishmentAction(
            punishment,
            await memberCache.getOrDownload(),
            channel as ITextChannel,
            guild.id);
      } else {
        print("Channel in automod thing is not there!");
      }
    }
    /* final message = await event.message?.getOrDownload();
    await saveMessage(
        message.content, DateTime.now(), [], memberCache.id, guild.id); */
  }
}
