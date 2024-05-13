import 'package:fpdart/fpdart.dart';
import 'package:mongo_dart/mongo_dart.dart';
import 'package:nyxx/nyxx.dart';

typedef RoleAdditionInformation = ({
  Snowflake userId,
  int amount,
  Option<int> minutes
});

typedef LimitData = ({String action, int amount, Option<int> minutes});

typedef GuildId = Snowflake;
typedef UserId = Snowflake;
typedef ChannelId = Snowflake;
typedef MessageId = Snowflake;
typedef Guild = Cacheable<Snowflake, IGuild>;
typedef Role = Cacheable<Snowflake, IRole>;
typedef DBResult = Map<String, dynamic>;
typedef DBStringEntry = Map<String, String>;
typedef DBIntEntry = Map<String, int>;
typedef DBStringListEntry = Map<String, List<String>>;
typedef DocumentSetResult = Either<Object, WriteResult>;
typedef GuildRoles = Map<Snowflake, IRole>;
typedef GuildChannels = List<IGuildChannel>;

sealed class DatabaseCollections {}

class InexactMatch extends DatabaseCollections {}

class Phrases extends DatabaseCollections {}

class Links extends DatabaseCollections {}

class Bypasses extends DatabaseCollections {}

class CustomMessages extends DatabaseCollections {}

class Strikes extends DatabaseCollections {}

class Limits extends DatabaseCollections {}

class TimedPunishments extends DatabaseCollections {}

class Logs extends DatabaseCollections {}

class SavedMessages extends DatabaseCollections {}

class PremiumServers extends DatabaseCollections {}
