package lila.relay

export lila.core.lilaism.Lilaism.{ *, given }
export lila.common.extensions.*
export lila.core.id.{ RelayRoundId, RelayTourId }

val broadcasterUrl =
  "https://github.com/lichess-org/broadcaster#user-content-lichess-broadcaster"

private val logger = lila.log("relay")
private type RelayGames = Vector[RelayGame]

// apply updates to a value, and keep track of the updates
// so they can all be replayed on another value
case class Updating[A](current: A, reRun: Update[A] = (a: A) => a):
  def apply(up: Update[A]) = Updating(up(current), up.compose(reRun))
