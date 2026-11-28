#!/usr/bin/env bash
set -euo pipefail
# Disposable fixture only. Force real overlap: second transaction must visibly
# wait on a PostgreSQL lock while the first holds the meeting/round lock.
pg(){ docker exec -e PGAPPNAME="$1" convay-voting psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d fixture -c "$2"; }
wait_event(){
  local app="$1" event="$2"
  for i in $(seq 1 80); do
    if [[ $(pg 'vote-monitor' "select count(*) from pg_stat_activity where application_name='$app' and $event") == 1 ]]; then return; fi
    sleep .1
  done
  echo "Expected concurrent wait missing: $app" >&2; exit 1
}
round="(select round_id from convay_private.vote_rounds where state='Open')"
a="'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','MTG-SHARED','SES-A'"
host="set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';"
voter="set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';"
# Capture stable round identity before close so the late cast addresses same round.
r=$(pg vote-monitor "select round_id from convay_private.vote_rounds where state='Open'")
round="'$r'::uuid"
pg vote-first "begin; $host select convay_private.vote_cast($a,$round,'For','race_ballot_000001'); select pg_sleep(6); commit;" >/tmp/convay-vote-first.out & first=$!
wait_event vote-first "wait_event='PgSleep'"
pg vote-second "begin; $host select convay_private.vote_cast($a,$round,'Against','race_ballot_000001'); commit;" >/tmp/convay-vote-second.out & second=$!
wait_event vote-second "wait_event_type='Lock'"
wait "$first"; wait "$second"
grep -q '"replayed": true' /tmp/convay-vote-second.out
[[ $(pg vote-monitor "select for_count||':'||against_count||':'||abstain_count||':'||(select count(*) from convay_private.vote_participation where round_id=$round) from convay_private.vote_rounds where round_id=$round") == '1:0:0:1' ]]
echo 'Concurrent same-voter replay: one effect, real lock wait PASS'
pg vote-close "begin; $host select convay_private.vote_close($a,$round,'race_close_000001'); select pg_sleep(6); commit;" >/tmp/convay-vote-close.out & first=$!
wait_event vote-close "wait_event='PgSleep'"
pg vote-late "begin; $voter select convay_private.vote_cast($a,$round,'Against','race_ballot_000002'); commit;" >/tmp/convay-vote-late.out 2>&1 & second=$!
wait_event vote-late "wait_event_type='Lock'"
wait "$first"
if wait "$second"; then echo 'Late cast unexpectedly succeeded';exit 1;fi
grep -q 'Round closed' /tmp/convay-vote-late.out
[[ $(pg vote-monitor "select state||':'||outcome||':'||for_count||':'||against_count||':'||(select count(*) from convay_private.vote_named_ballots where round_id=$round) from convay_private.vote_rounds where round_id=$round") == 'Closed:Passed:1:0:0' ]]
echo 'Concurrent close/cast: late ballot rejected, immutable secret aggregate PASS'
